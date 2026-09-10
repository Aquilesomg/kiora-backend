import { Router, Request, Response } from 'express';
import promClient from 'prom-client';
import { services } from '../config/services';

const observabilityRouter = Router();

// ── Métricas (Prometheus) ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    promClient.collectDefaultMetrics({ prefix: 'gateway_' });
}
observabilityRouter.get('/metrics', async (_req: Request, res: Response) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
});

// ── Health checks ─────────────────────────────────────────────────────────
observabilityRouter.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'API Gateway is running' });
});

const serviceHealthPaths: Record<string, string> = {
    users: `${services.users}/api/users/health`,
    products: `${services.products}/health`,
    inventory: `${services.inventory}/health`,
    orders: `${services.orders}/health`,
    notifications: `${services.notifications}/health`,
    reports: `${services.reports}/api/reports/health`,
    activity: `${services.activity}/health`,
    ai: `${services.ai}/health`,
    stores: `${services.stores}/health`,
};

observabilityRouter.get('/health/all', async (_req: Request, res: Response) => {
    const results: Record<string, any> = {};

    await Promise.all(
        Object.entries(serviceHealthPaths).map(async ([name, healthUrl]) => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);
                const response = await fetch(healthUrl, { signal: controller.signal });
                clearTimeout(timeout);
                results[name] = { status: response.ok ? 'up' : 'down', statusCode: response.status };
            } catch (err: any) {
                results[name] = { status: 'down', error: err.message };
            }
        })
    );

    const allUp = Object.values(results).every((r) => r.status === 'up');
    res.status(allUp ? 200 : 503).json({
        gateway: 'up',
        services: results,
    });
});

export default observabilityRouter;
