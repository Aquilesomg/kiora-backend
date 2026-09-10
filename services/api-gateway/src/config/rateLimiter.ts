import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import { logger } from '@kiora/shared';
import { Request, Response, NextFunction } from 'express';

export let redisReady = false;
export let redisClient: Redis | undefined;

if (process.env.NODE_ENV !== 'test') {
    redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: null,
        connectTimeout: 3000,
        retryStrategy(times) {
            if (times > 5) return null;
            return Math.min(times * 500, 3000);
        },
    });

    redisClient.on('connect', () => { redisReady = true; logger.info('Rate limiter: Redis conectado'); });
    redisClient.on('close', () => { redisReady = false; });
    redisClient.on('error', (err: any) => { redisReady = false; logger.warn('Rate limiter: Redis error', { error: err.message }); });

    redisClient.connect().catch(() => {
        logger.warn('Rate limiter: Redis no disponible — fail-open activado');
    });
}

const redisLimiter = redisClient ? rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient!.call(args[0], ...args.slice(1)) as any,
    }),
    message: { error: 'Too Many Requests', code: 'RATE_LIMIT', message: 'Límite de peticiones excedido (2000/15min), intenta más tarde.' },
}) : null;

// Fail-open: si Redis no está listo, skip rate limiting
export const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (!redisReady || !redisLimiter) return next();
    return redisLimiter(req, res, next);
};
