'use strict';

import { createRedisClient } from '@kiora/shared';
import { logger } from '@kiora/shared';
import env from '../config/env';

let redis: ReturnType<typeof createRedisClient> | null = null;

const metrics = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    errors: 0,
};

export function getRedis() {
    if (redis) return redis;

    redis = createRedisClient({
        name: 'products-cache',
        lazyConnect: true,
        maxRetriesPerRequest: 1,
    });

    redis.on('connect', () => logger.info('Redis cache conectado'));
    redis.on('error', (err: any) => logger.warn('Redis cache error', { error: (err as Error).message }));

    redis.connect().catch(() => {
        logger.warn('No se pudo conectar a Redis cache — el servicio funcionará sin cache');
    });

    return redis;
}

async function getVersion(namespace: string): Promise<string> {
    const client = getRedis();
    try {
        let v = await client.get(`${namespace}:_version`);
        if (!v) {
            await client.set(`${namespace}:_version`, '1');
            v = '1';
        }
        return v;
    } catch (err) {
        return '0';
    }
}

export async function getOrSet<T>(namespace: string, subkey: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const client = getRedis();
    const effectiveTtl = ttl || env.redis.cacheTtl;

    try {
        const version = await getVersion(namespace);
        const fullKey = `${namespace}:v${version}:${subkey}`;

        const cached = await client.get(fullKey);
        if (cached) {
            metrics.hits++;
            logger.debug('Cache HIT', { key: fullKey });
            return JSON.parse(cached) as T;
        }
        metrics.misses++;
    } catch (err: unknown) {
        metrics.errors++;
        logger.warn('Cache GET fallido, consultando BD', { error: (err as Error).message });
    }

    const data = await fetchFn();

    try {
        const version = await getVersion(namespace);
        const fullKey = `${namespace}:v${version}:${subkey}`;
        await client.setex(fullKey, effectiveTtl, JSON.stringify(data));
        logger.debug('Cache SET', { key: fullKey, ttl: effectiveTtl });
    } catch (err: unknown) {
        metrics.errors++;
        logger.warn('Cache SET fallido', { error: (err as Error).message });
    }

    return data;
}

export async function invalidate(namespace: string) {
    const client = getRedis();
    try {
        metrics.invalidations++;
        const newVersion = await client.incr(`${namespace}:_version`);
        logger.debug('Cache invalidado (version bump)', { namespace, newVersion });
    } catch (err: unknown) {
        metrics.errors++;
        logger.warn('Cache invalidation fallida', { namespace, error: (err as Error).message });
    }
}

export function getMetrics() {
    return { ...metrics };
}

export default { getOrSet, invalidate, getRedis, getMetrics };
