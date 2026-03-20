const jwt = require('jsonwebtoken');
const blacklist = require('../config/blacklist');

const ACCESS_TOKEN_EXPIRY = '10m';
const REFRESH_TOKEN_EXPIRY = '7d';

const tokenSv = (usuario) =>
    usuario.session_version !== undefined && usuario.session_version !== null
        ? usuario.session_version
        : 0;

const generateAccessToken = (usuario) =>
    jwt.sign(
        {
            id_usu: usuario.id_usu,
            correo_usu: usuario.correo_usu,
            rol_usu: usuario.rol_usu,
            sv: tokenSv(usuario),
        },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

const generateRefreshToken = (usuario) =>
    jwt.sign(
        {
            id_usu: usuario.id_usu,
            correo_usu: usuario.correo_usu,
            rol_usu: usuario.rol_usu,
            sv: tokenSv(usuario),
        },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

const verifyRefreshToken = (token) =>
    jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

const isTokenRevoked = async (token) => blacklist.has(token);

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
    isTokenRevoked,
    cookieOptions,
    ACCESS_COOKIE_MAX_AGE,
    REFRESH_COOKIE_MAX_AGE,
};
