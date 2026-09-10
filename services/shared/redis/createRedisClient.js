"use strict";
/**
 * createRedisClient — Helper compartido para todos los microservicios de Kiora.
 *
 * Detecta automáticamente el modo de conexión según variables de entorno:
 *
 *   MODO SENTINEL (producción / staging):
 *     REDIS_SENTINEL_HOSTS=redis-sentinel-1:26379,redis-sentinel-2:26379,redis-sentinel-3:26379
 *     REDIS_SENTINEL_NAME=kiora-master
 *     REDIS_PASSWORD=<contraseña>
 *
 *   MODO STANDALONE (desarrollo local sin Sentinel):
 *     REDIS_HOST=localhost  (o kiora-redis en Docker)
 *     REDIS_PORT=6379
 *     REDIS_PASSWORD=<contraseña>
 *
 * El cliente se comporta idéntico para el código de negocio en ambos modos.
 * ioredis maneja el failover de Sentinel de forma transparente.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisClient = createRedisClient;
exports.createRedisAdapterClients = createRedisAdapterClients;
const ioredis_1 = __importDefault(require("ioredis"));
function createRedisClient(options = {}) {
    const { name = 'kiora-redis', lazyConnect = false, maxRetriesPerRequest = null, } = options;
    const password = process.env.REDIS_PASSWORD || undefined;
    // ── Modo Sentinel ─────────────────────────────────────────────────────────
    const sentinelHostsRaw = process.env.REDIS_SENTINEL_HOSTS;
    const sentinelName = process.env.REDIS_SENTINEL_NAME || 'kiora-master';
    if (sentinelHostsRaw) {
        const sentinels = sentinelHostsRaw.split(',').map((hostPort) => {
            const [host, portStr] = hostPort.trim().split(':');
            return { host, port: parseInt(portStr || '26379', 10) };
        });
        return new ioredis_1.default({
            sentinels,
            name: sentinelName,
            password,
            sentinelPassword: password, // Sentinels también requieren auth si el master la tiene
            lazyConnect,
            maxRetriesPerRequest,
            enableReadyCheck: true,
            retryStrategy: (times) => {
                if (times > 10)
                    return null; // Rendirse tras 10 intentos
                return Math.min(times * 200, 3000);
            },
            reconnectOnError: (err) => {
                // Reconectar en errores de READONLY (réplica promovida, aún no actualizada)
                return err.message.includes('READONLY');
            },
        });
    }
    // ── Modo Standalone (fallback para desarrollo local) ──────────────────────
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    return new ioredis_1.default({
        host,
        port,
        password,
        lazyConnect,
        maxRetriesPerRequest,
        enableReadyCheck: true,
        retryStrategy: (times) => {
            if (times > 10)
                return null;
            return Math.min(times * 200, 2000);
        },
        reconnectOnError: (err) => err.message.includes('READONLY'),
    });
}
/**
 * Crea un par de clientes pub/sub para Socket.IO Redis Adapter.
 * Retorna dos clientes independientes porque ioredis no puede
 * usar el mismo cliente para publish y subscribe simultáneamente.
 */
function createRedisAdapterClients() {
    const pubClient = createRedisClient({ name: 'socketio-pub', lazyConnect: true });
    const subClient = pubClient.duplicate();
    return { pubClient, subClient };
}
