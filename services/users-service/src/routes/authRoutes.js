const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { verifyToken, isAdmin, addToBlacklist } = require('../middleware/authMiddleware');

// POST /api/auth/register - Registrar un nuevo usuario (solo admin)
router.post('/register', verifyToken, isAdmin, async (req, res) => {
    const { nom_usu, correo_usu, password, rol_usu, tel_usu } = req.body;

    if (!nom_usu || !correo_usu || !password) {
        return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
    }

    try {
        // Verificar si el correo ya existe
        const existing = await db.query(
            'SELECT id_usu FROM Cliente WHERE correo_usu = $1', [correo_usu]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'El correo ya está registrado.' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO Cliente (nom_usu, correo_usu, password_usu, rol_usu, tel_usu)
             VALUES ($1, $2, $3, $4, $5) RETURNING id_usu`,
            [nom_usu, correo_usu, hashedPassword, rol_usu || 'cliente', tel_usu || null]
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente.',
            id_usu: result.rows[0].id_usu
        });
    } catch (error) {
        console.error('Error al registrar usuario:', error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
    const { correo_usu, password } = req.body;

    if (!correo_usu || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
    }

    try {
        // Buscar el usuario por correo
        const result = await db.query(
            'SELECT * FROM Cliente WHERE correo_usu = $1', [correo_usu]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        const usuario = result.rows[0];

        // HU04 – Verificar si la cuenta está bloqueada
        if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
            const minutosRestantes = Math.ceil(
                (new Date(usuario.bloqueado_hasta) - new Date()) / 60000
            );
            return res.status(423).json({
                error: `Cuenta bloqueada. Contacta al administrador o espera ${minutosRestantes} minuto(s).`
            });
        }

        // Verificar contraseña
        const passwordValida = await bcrypt.compare(password, usuario.password_usu);
        if (!passwordValida) {
            // HU04 – Incrementar intentos fallidos
            const nuevoIntentos = (usuario.intentos_fallidos || 0) + 1;
            const MAX_INTENTOS = 5;

            if (nuevoIntentos >= MAX_INTENTOS) {
                // Bloquear por 15 minutos
                await db.query(
                    `UPDATE Cliente SET intentos_fallidos = $1, bloqueado_hasta = NOW() + INTERVAL '15 minutes'
                     WHERE id_usu = $2`,
                    [nuevoIntentos, usuario.id_usu]
                );
                return res.status(423).json({
                    error: 'Cuenta bloqueada por demasiados intentos fallidos. Contacta al administrador.'
                });
            } else {
                await db.query(
                    'UPDATE Cliente SET intentos_fallidos = $1 WHERE id_usu = $2',
                    [nuevoIntentos, usuario.id_usu]
                );
                return res.status(401).json({
                    error: `Credenciales incorrectas. Intento ${nuevoIntentos} de ${MAX_INTENTOS}.`
                });
            }
        }

        // HU04 – Login exitoso: resetear contador de intentos
        await db.query(
            'UPDATE Cliente SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usu = $1',
            [usuario.id_usu]
        );

        // Generar JWT
        const token = jwt.sign(
            { id_usu: usuario.id_usu, correo_usu: usuario.correo_usu, rol_usu: usuario.rol_usu },
            process.env.JWT_SECRET || 'kiora_secret',
            { expiresIn: '10m' }
        );

        res.status(200).json({
            message: 'Login exitoso.',
            token,
            usuario: {
                id_usu: usuario.id_usu,
                nom_usu: usuario.nom_usu,
                correo_usu: usuario.correo_usu,
                rol_usu: usuario.rol_usu
            }
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// POST /api/auth/logout - Cerrar sesión (HU02)
router.post('/logout', verifyToken, (req, res) => {
    const token = req.headers['authorization'].split(' ')[1];
    addToBlacklist(token);
    res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
});

// PATCH /api/auth/users/:id/unlock - Desbloquear usuario (solo admin) (HU04)
router.patch('/users/:id/unlock', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'UPDATE Cliente SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_usu = $1 RETURNING id_usu, nom_usu, correo_usu',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        res.status(200).json({
            message: 'Usuario desbloqueado exitosamente.',
            usuario: result.rows[0]
        });
    } catch (error) {
        console.error('Error al desbloquear usuario:', error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/auth/users - Obtener todos los clientes (sin exponer password)
router.get('/users', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id_usu, nom_usu, correo_usu, rol_usu, tel_usu, intentos_fallidos, bloqueado_hasta FROM Cliente'
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// GET /api/auth/me - Obtener datos del usuario autenticado (ruta protegida)
router.get('/me', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id_usu, nom_usu, correo_usu, rol_usu, tel_usu FROM Cliente WHERE id_usu = $1',
            [req.usuario.id_usu]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener perfil:', error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;
