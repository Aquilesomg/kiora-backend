const bcrypt = require('bcrypt');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const authService = require('../services/authService');
const { addToBlacklist } = require('../middleware/authMiddleware');
const emailService = require('../config/emailService');
const logger = require('../config/logger');

const MAX_INTENTOS = 5;

/**
 * authController
 * Responsabilidad única: orquesta la lógica de negocio de autenticación y
 * gestión de usuarios. Delega acceso a datos al repositorio y errores a next(error).
 */

// POST /api/auth/register
const register = async (req, res, next) => {
    const { nom_usu, correo_usu, password, rol_usu, tel_usu } = req.body;

    try {
        const existing = await userRepository.findByEmail(correo_usu);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'El correo ya está registrado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await userRepository.create(nom_usu, correo_usu, hashedPassword, rol_usu, tel_usu);

        logger.info('Usuario registrado', { correo_usu, rol_usu: rol_usu || 'cliente' });
        res.status(201).json({
            message: 'Usuario registrado exitosamente.',
            id_usu: result.rows[0].id_usu
        });
    } catch (error) {
        logger.error('Error al registrar usuario', { error: error.message });
        next(error);
    }
};

// POST /api/auth/login
const login = async (req, res, next) => {
    const { correo_usu, password } = req.body;

    try {
        const result = await userRepository.findByEmail(correo_usu);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        const usuario = result.rows[0];

        // HU04 – Verificar bloqueo de cuenta
        if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
            logger.warn('Intento de login en cuenta bloqueada', { correo_usu });
            return res.status(423).json({
                error: 'Cuenta bloqueada. Contacta al administrador para desbloquearla.'
            });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_usu);
        if (!passwordValida) {
            const nuevoIntentos = (usuario.intentos_fallidos || 0) + 1;

            if (nuevoIntentos >= MAX_INTENTOS) {
                await userRepository.blockUser(usuario.id_usu, nuevoIntentos);
                logger.warn('Cuenta bloqueada por intentos fallidos', { correo_usu });
                return res.status(423).json({
                    error: 'Cuenta bloqueada por demasiados intentos fallidos. Contacta al administrador para desbloquearla.'
                });
            }

            await userRepository.incrementLoginAttempts(usuario.id_usu, nuevoIntentos);
            return res.status(401).json({
                error: `Credenciales incorrectas. Intento ${nuevoIntentos} de ${MAX_INTENTOS}.`
            });
        }

        // Login exitoso
        await userRepository.resetLoginAttempts(usuario.id_usu);
        logger.info('Login exitoso', { id_usu: usuario.id_usu, correo_usu });

        const token = authService.generateAccessToken(usuario);
        const refreshToken = authService.generateRefreshToken(usuario);

        res.cookie('kiora_refresh_token', refreshToken,
            authService.cookieOptions(authService.REFRESH_COOKIE_MAX_AGE));

        const isWebClient = req.headers['x-client-type'] === 'web';
        const usuarioPublico = {
            id_usu: usuario.id_usu,
            nom_usu: usuario.nom_usu,
            correo_usu: usuario.correo_usu,
            rol_usu: usuario.rol_usu,
        };

        if (isWebClient) {
            res.cookie('token', token, authService.cookieOptions(authService.ACCESS_COOKIE_MAX_AGE));
            return res.status(200).json({ message: 'Login exitoso.', usuario: usuarioPublico });
        }

        res.status(200).json({ message: 'Login exitoso.', token, usuario: usuarioPublico });
    } catch (error) {
        logger.error('Error al iniciar sesión', { error: error.message });
        next(error);
    }
};

// POST /api/auth/refresh
const refresh = async (req, res, next) => {
    const oldRefreshToken = req.cookies.kiora_refresh_token;

    if (!oldRefreshToken) {
        return res.status(401).json({ error: 'No se proporcionó un Refresh Token.' });
    }

    try {
        const decoded = authService.verifyRefreshToken(oldRefreshToken);
        const result = await userRepository.findById(decoded.id_usu);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no válido.' });
        }

        const usuario = result.rows[0];

        if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
            return res.status(423).json({ error: 'Cuenta bloqueada. Contacta al administrador.' });
        }

        // Rotación: invalidar el refresh token anterior
        await addToBlacklist(oldRefreshToken);

        // Emitir nuevos tokens
        const newAccessToken = authService.generateAccessToken(usuario);
        const newRefreshToken = authService.generateRefreshToken(usuario);

        res.cookie('kiora_refresh_token', newRefreshToken,
            authService.cookieOptions(authService.REFRESH_COOKIE_MAX_AGE));

        logger.info('Tokens renovados', { id_usu: usuario.id_usu });
        res.status(200).json({ token: newAccessToken });
    } catch (error) {
        logger.error('Error al verificar Refresh Token', { error: error.message });
        return res.status(403).json({ error: 'Refresh Token no válido o expirado.' });
    }
};

// POST /api/auth/logout
const logout = async (req, res) => {
    await addToBlacklist(req.token);
    const clearOpts = authService.cookieOptions(0);
    res.clearCookie('token', clearOpts);
    res.clearCookie('kiora_refresh_token', clearOpts);
    logger.info('Sesión cerrada', { id_usu: req.usuario?.id_usu });
    res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
};

// PATCH /api/auth/users/:id/unlock
const unlockUser = async (req, res, next) => {
    const { id } = req.params;

    try {
        const result = await userRepository.unlock(id);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        logger.info('Usuario desbloqueado', { id_usu: id });
        res.status(200).json({ message: 'Usuario desbloqueado exitosamente.', usuario: result.rows[0] });
    } catch (error) {
        logger.error('Error al desbloquear usuario', { error: error.message });
        next(error);
    }
};

// GET /api/auth/users (con paginación)
const getUsers = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;

        const [result, countResult] = await Promise.all([
            userRepository.findAll(limit, offset),
            userRepository.countAll(),
        ]);

        const total = parseInt(countResult.rows[0].count);

        res.status(200).json({
            data: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        logger.error('Error al obtener usuarios', { error: error.message });
        next(error);
    }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
    try {
        const result = await userRepository.findProfile(req.usuario.id_usu);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        logger.error('Error al obtener perfil', { error: error.message });
        next(error);
    }
};

// PATCH /api/auth/users/:id — HU43
const updateUser = async (req, res, next) => {
    const { id } = req.params;

    try {
        const result = await userRepository.update(id, req.body);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        logger.info('Usuario actualizado', { id_usu: id, campos: Object.keys(req.body) });
        res.status(200).json({ message: 'Usuario actualizado exitosamente.', usuario: result.rows[0] });
    } catch (error) {
        logger.error('Error al actualizar usuario', { error: error.message });
        next(error);
    }
};

// DELETE /api/auth/users/:id — HU44
const deleteUser = async (req, res, next) => {
    const { id } = req.params;

    if (parseInt(id) === req.usuario.id_usu) {
        return res.status(403).json({ error: 'No puedes eliminar tu propio usuario.' });
    }

    try {
        const result = await userRepository.softDelete(id);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        logger.info('Usuario eliminado (soft delete)', { id_usu: id, eliminado_por: req.usuario.id_usu });
        res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
    } catch (error) {
        logger.error('Error al eliminar usuario', { error: error.message });
        next(error);
    }
};

// PATCH /api/auth/users/:id/role — HU45
const updateRole = async (req, res, next) => {
    const { id } = req.params;

    if (parseInt(id) === req.usuario.id_usu) {
        return res.status(403).json({ error: 'No puedes cambiar tu propio rol.' });
    }

    try {
        const result = await userRepository.updateRole(id, req.body.rol_usu);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        logger.info('Rol actualizado', { id_usu: id, nuevo_rol: req.body.rol_usu, asignado_por: req.usuario.id_usu });
        res.status(200).json({ message: 'Rol actualizado exitosamente.', usuario: result.rows[0] });
    } catch (error) {
        logger.error('Error al actualizar rol', { error: error.message });
        next(error);
    }
};

// POST /api/auth/forgot-password — HU05
const forgotPassword = async (req, res, next) => {
    const { correo_usu } = req.body;

    try {
        const result = await userRepository.findByEmail(correo_usu);

        // Siempre responder 200 para no revelar si el correo existe (user enumeration)
        if (result.rows.length === 0) {
            return res.status(200).json({
                message: 'Si el correo está registrado, recibirás un enlace de recuperación.'
            });
        }

        const usuario = result.rows[0];
        const token = crypto.randomUUID();
        const expira_en = new Date(Date.now() + emailService.RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

        await userRepository.createResetToken(usuario.id_usu, token, expira_en);
        await emailService.sendPasswordReset(correo_usu, token);

        logger.info('Email de recuperación enviado', { id_usu: usuario.id_usu });
        res.status(200).json({
            message: 'Si el correo está registrado, recibirás un enlace de recuperación.'
        });
    } catch (error) {
        logger.error('Error en forgot-password', { error: error.message });
        next(error);
    }
};

// POST /api/auth/reset-password — HU05
const resetPassword = async (req, res, next) => {
    const { token, new_password } = req.body;

    try {
        const result = await userRepository.findResetToken(token);

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'El token es inválido o ha expirado.' });
        }

        const { id_usu } = result.rows[0];
        const hashedPassword = await bcrypt.hash(new_password, 10);

        await Promise.all([
            userRepository.updatePassword(id_usu, hashedPassword),
            userRepository.markTokenAsUsed(token),
        ]);

        logger.info('Contraseña restablecida', { id_usu });
        res.status(200).json({ message: 'Contraseña restablecida exitosamente.' });
    } catch (error) {
        logger.error('Error en reset-password', { error: error.message });
        next(error);
    }
};

// PATCH /api/auth/me/password — Cambiar contraseña (usuario autenticado)
const changePassword = async (req, res, next) => {
    const { current_password, new_password } = req.body;

    try {
        const result = await userRepository.findByIdWithPassword(req.usuario.id_usu);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const usuario = result.rows[0];
        const passwordValida = await bcrypt.compare(current_password, usuario.password_usu);

        if (!passwordValida) {
            logger.warn('Cambio de contraseña fallido: contraseña actual incorrecta', { id_usu: usuario.id_usu });
            return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await userRepository.updatePassword(usuario.id_usu, hashedPassword);

        logger.info('Contraseña cambiada', { id_usu: usuario.id_usu });
        res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        logger.error('Error en change-password', { error: error.message });
        next(error);
    }
};

module.exports = { register, login, refresh, logout, unlockUser, getUsers, getMe, updateUser, deleteUser, updateRole, forgotPassword, resetPassword, changePassword };
