import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { services } from '../config/services';
import { logger } from '@kiora/shared';

const swaggerRouter = Router();

const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
        urls: [
            { url: '/api/users/docs-json', name: 'Users Service' },
            { url: '/api/docs.json?svc=products', name: 'Products Service' },
            { url: '/api/docs.json?svc=inventory', name: 'Inventory Service' },
            { url: '/api/docs.json?svc=orders', name: 'Orders Service' },
            { url: '/api/docs.json?svc=reports', name: 'Reports Service' },
            { url: '/api/docs.json?svc=notifications', name: 'Notifications Service' },
            { url: '/api/docs.json?svc=ai', name: 'AI Service' },
        ],
    },
};

swaggerRouter.use('/api/docs', swaggerUi.serve, swaggerUi.setup(null, swaggerOptions));

swaggerRouter.get('/api/docs.json', async (req: Request, res: Response) => {
    const svc = req.query.svc as string;
    const base = services[svc];
    if (!base) {
        res.status(400).json({ error: 'svc param must be products, inventory, orders, notifications or reports' });
        return;
    }
    try {
        const r = await fetch(`${base}/api/docs.json`);
        const json = await r.json();
        res.json(json);
    } catch (err: any) {
        logger.warn(`No se pudo obtener docs de ${svc}`, { error: err.message });
        res.status(503).json({ error: `${svc} service unavailable` });
    }
});

export default swaggerRouter;
