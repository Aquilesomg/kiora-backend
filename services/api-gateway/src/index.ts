import './config/tracing';
import { logger } from '@kiora/shared';
import app from './app';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createServer } from 'http';
import { createRedisAdapterClients } from '@kiora/shared';

const PORT = process.env.PORT || 3000;

const server = createServer(app);

// ── Socket.IO para dashboard en tiempo real ───────────────────────────────
const io = new Server(server, {
    cors: {
        origin: (process.env.CORS_ORIGIN || 'http://localhost').split(',').map(s => s.trim()),
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// ── Redis Adapter: sincroniza eventos entre todas las réplicas del gateway ─
// Sin esto, io.emit() en la réplica A no llega a clientes conectados en B.
(async () => {
    try {
        const { pubClient, subClient } = createRedisAdapterClients();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        io.adapter(createAdapter(pubClient, subClient));

        logger.info('Socket.IO Redis Adapter conectado — WebSockets sincronizados entre réplicas');
    } catch (err: any) {
        logger.error('Error conectando Socket.IO Redis Adapter — WebSockets funcionarán solo en memoria (réplica local)', {
            error: err.message,
        });
        // Fail-open: Socket.IO funciona sin adapter, solo sin sincronización entre réplicas
    }
})();

io.on('connection', (socket) => {
    logger.info('Dashboard WebSocket conectado', { id: socket.id });
    socket.on('disconnect', () => {
        logger.info('Dashboard WebSocket desconectado', { id: socket.id });
    });
});

// Exponer io para que otros módulos emitan eventos
app.locals.io = io;

logger.info('WebSocket (Socket.IO) listo para conexiones de dashboard');

// ── Arranque ──────────────────────────────────────────────────────────────
server.listen(PORT, () => {
    logger.info(`API Gateway iniciado en puerto ${PORT}`);
    logger.info(`Swagger UI: http://localhost:${PORT}/api/docs`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
function shutdown(signal: string) {
    logger.info(`${signal} recibido — cerrando Gateway gracefully...`);
    io.close();
    server.close(() => {
        logger.info('Gateway cerrado correctamente');
        process.exit(0);
    });
    // Forzar cierre si no termina en 10s
    setTimeout(() => {
        logger.error('Forzando cierre tras 10s');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

