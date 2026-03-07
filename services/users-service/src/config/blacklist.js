const Redis = require('ioredis');

/**
 * blacklist.js
 * Almacena tokens JWT revocados en Redis usando TTL automático.
 *
 * Clave:  "bl:<firma_del_token>"
 * Valor:  "1"  (solo nos importa la existencia de la clave)
 * TTL:    segundos restantes hasta que el token expire naturalmente.
 *
 * Cuando el token expira en JWT, Redis borra la clave solo.
 * La blacklist nunca crece indefinidamente.
 *
 * En tests (NODE_ENV=test) usa un stub en memoria para no
 * requerir un servidor Redis corriendo.
 */

// ── Stub en memoria para tests ────────────────────────────────────────────────
class InMemoryBlacklist {
    constructor() { this._set = new Set(); }
    async set(key) { this._set.add(key); }
    async exists(key) { return this._set.has(key) ? 1 : 0; }
    async quit() { }
}

// ── Selección del cliente según entorno ───────────────────────────────────────
let client;

if (process.env.NODE_ENV === 'test') {
    client = new InMemoryBlacklist();
} else {
    client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        // Reintentos con backoff para no crashear si Redis tarda en arrancar
        retryStrategy: (times) => Math.min(times * 100, 3000),
        lazyConnect: true,
    });

    client.on('error', (err) => {
        // No matar el proceso — loguear y seguir (degraded mode)
        console.error('[Redis blacklist] Error de conexión:', err.message);
    });
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Extrae la firma (parte 3) del JWT y la clave Redis.
 * @param {string} token
 * @returns {string|null}
 */
const _key = (token) => {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return `bl:${parts[2]}`;
};

/**
 * Calcula los segundos restantes hasta que el JWT expire.
 * @param {string} token
 * @returns {number} TTL en segundos (mínimo 1)
 */
const _ttl = (token) => {
    try {
        const payload = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64url').toString('utf-8')
        );
        const remaining = payload.exp - Math.floor(Date.now() / 1000);
        return Math.max(remaining, 1);
    } catch {
        return 600; // fallback: 10 minutos
    }
};

/**
 * Agrega un token a la blacklist.
 * Redis lo eliminará automáticamente cuando el JWT expire.
 * @param {string} token - JWT completo
 */
const add = async (token) => {
    const key = _key(token);
    if (!key) return;
    try {
        const ttl = _ttl(token);
        if (process.env.NODE_ENV === 'test') {
            await client.set(key);
        } else {
            // SET bl:<firma> 1 EX <segundos>
            await client.set(key, '1', 'EX', ttl);
        }
    } catch (err) {
        console.error('[Redis blacklist] Error al agregar token:', err.message);
    }
};

/**
 * Verifica si un token está en la blacklist.
 * @param {string} token - JWT completo
 * @returns {Promise<boolean>}
 */
const has = async (token) => {
    const key = _key(token);
    if (!key) return false;
    try {
        const result = await client.exists(key);
        return result === 1;
    } catch (err) {
        console.error('[Redis blacklist] Error al verificar token:', err.message);
        // Fail-open: si Redis está caído, no bloqueamos el acceso
        return false;
    }
};

module.exports = { add, has, client };
