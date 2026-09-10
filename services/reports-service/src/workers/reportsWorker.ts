import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@kiora/shared';
import { upsertOrder } from '../repositories/reportRepository';

const redisOptions: any = {
    maxRetriesPerRequest: null,
};

if (process.env.REDIS_SENTINEL_HOSTS) {
    const hosts = process.env.REDIS_SENTINEL_HOSTS.split(',');
    redisOptions.sentinels = hosts.map((h) => {
        const [host, port] = h.split(':');
        return { host, port: parseInt(port, 10) || 26379 };
    });
    redisOptions.name = process.env.REDIS_SENTINEL_NAME || 'kiora-master';
} else {
    redisOptions.host = process.env.REDIS_HOST || 'localhost';
    redisOptions.port = parseInt(process.env.REDIS_PORT || '6379', 10);
}

if (process.env.REDIS_PASSWORD) {
    redisOptions.password = process.env.REDIS_PASSWORD;
}

const connection = new IORedis(redisOptions);

export function startReportsWorker() {
    const worker = new Worker('reports-sync-queue', async (job) => {
        if (job.name === 'SYNC_ORDER') {
            logger.info('Procesando evento CQRS para reportes', { jobId: job.id, orderId: job.data.orderId });
            await upsertOrder(job.data);
        }
    }, { connection });

    worker.on('completed', (job) => {
        logger.debug('Evento CQRS procesado con éxito', { jobId: job.id });
    });

    worker.on('failed', (job, err) => {
        logger.error('Error procesando evento CQRS', { jobId: job?.id, error: err.message });
    });

    logger.info('Reports Worker iniciado (escuchando reports-sync-queue)');
    return worker;
}
