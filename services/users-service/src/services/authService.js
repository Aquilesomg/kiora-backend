const jwt = require('jsonwebtoken');

/**
 * authService
 * Responsabilidad única: toda la lógica relacionada con JWT.
 * Ningún otro archivo genera ni verifica tokens directamente.
 */

const ACCESS_TOKEN_EXPIRY = '10m';
const REFRESH_TOKEN_EXPIRY = '7d';

const generateAccessToken = (usuario) =>
    jwt.sign(
        { id_usu: usuario.id_usu, correo_usu: usuario.correo_usu, rol_usu: usuario.rol_usu },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

const generateRefreshToken = (usuario) =>
    jwt.sign(
        { id_usu: usuario.id_usu, correo_usu: usuario.correo_usu, rol_usu: usuario.rol_usu },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

const verifyRefreshToken = (token) =>
    jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

const cookieOptions = (maxAgeMs) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: maxAgeMs,
});

const ACCESS_COOKIE_MAX_AGE = 10 * 60 * 1000;       // 10 minutos
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    cookieOptions,
    ACCESS_COOKIE_MAX_AGE,
    REFRESH_COOKIE_MAX_AGE,
};
