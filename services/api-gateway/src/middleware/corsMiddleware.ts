import { Request, Response, NextFunction } from 'express';

export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const reqOrigin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-client-type, Accept');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }
    next();
};

export function injectCors(proxyRes: any, req: any) {
    const reqOrigin = req.headers.origin;
    if (reqOrigin) {
        proxyRes.headers['access-control-allow-origin'] = reqOrigin;
        proxyRes.headers['access-control-allow-credentials'] = 'true';
        proxyRes.headers['vary'] = 'Origin';
    }
}
