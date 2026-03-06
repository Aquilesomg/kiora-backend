const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { loginSchema, registerSchema } = require('../validators/authValidators');
const {
    register, login, refresh, logout, unlockUser, getUsers, getMe,
} = require('../controllers/authController');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 10,
    message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
    standardHeaders: true, legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [correo_usu, password]
 *             properties:
 *               correo_usu:
 *                 type: string
 *                 example: admin@kiora.com
 *               password:
 *                 type: string
 *                 example: mipassword
 *     responses:
 *       200:
 *         description: Login exitoso. Devuelve token (móvil) o cookie (web).
 *       400:
 *         description: Campos obligatorios faltantes.
 *       401:
 *         description: Credenciales incorrectas.
 *       423:
 *         description: Cuenta bloqueada.
 */
router.post('/login', loginLimiter, validate(loginSchema), login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario (solo admin)
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom_usu, correo_usu, password]
 *             properties:
 *               nom_usu:
 *                 type: string
 *               correo_usu:
 *                 type: string
 *               password:
 *                 type: string
 *               rol_usu:
 *                 type: string
 *                 enum: [admin, cliente]
 *               tel_usu:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente.
 *       400:
 *         description: Datos inválidos.
 *       401:
 *         description: Token no proporcionado.
 *       403:
 *         description: No es administrador.
 *       409:
 *         description: Correo ya registrado.
 */
router.post('/register', verifyToken, isAdmin, validate(registerSchema), register);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar Access Token usando Refresh Token (cookie)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Nuevo access token generado.
 *       401:
 *         description: No se proporcionó Refresh Token.
 *       403:
 *         description: Refresh Token inválido o expirado.
 */
router.post('/refresh', refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente.
 *       401:
 *         description: Token no proporcionado.
 */
router.post('/logout', verifyToken, logout);

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Obtener todos los usuarios (solo admin)
 *     tags: [Usuarios]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Cantidad de resultados por página
 *     responses:
 *       200:
 *         description: Lista paginada de usuarios.
 *       401:
 *         description: Token no proporcionado.
 *       403:
 *         description: No es administrador.
 */
router.get('/users', verifyToken, isAdmin, getUsers);

/**
 * @swagger
 * /api/auth/users/{id}/unlock:
 *   patch:
 *     summary: Desbloquear usuario (solo admin)
 *     tags: [Usuarios]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario desbloqueado.
 *       404:
 *         description: Usuario no encontrado.
 */
router.patch('/users/:id/unlock', verifyToken, isAdmin, unlockUser);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario autenticado.
 *       404:
 *         description: Usuario no encontrado.
 */
router.get('/me', verifyToken, getMe);

module.exports = router;
