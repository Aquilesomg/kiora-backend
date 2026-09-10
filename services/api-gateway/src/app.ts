import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { logger } from '@kiora/shared';
import { correlationId } from './middleware/correlationId';
import { authMiddleware } from './middleware/auth';
import { auditMiddleware } from './middleware/auditMiddleware';

// Nuevos módulos factorizados (SRP)
import { rateLimiterMiddleware } from './config/rateLimiter';
import { corsMiddleware } from './middleware/corsMiddleware';

import { publicProxyRouter, protectedProxyRouter } from './routes/proxyRoutes';
import swaggerRouter from './routes/swaggerRoutes';
import internalRouter from './routes/internalRoutes';
import observabilityRouter from './routes/observabilityRoutes';

const app = express();

// ── Configuración de Seguridad y Middlewares Globales ──────────────────────
app.use(helmet({
    contentSecurityPolicy: false,
}));

// CORS
app.use(corsMiddleware);

app.use(morgan('dev'));
app.use(cookieParser());
app.use(correlationId);

// ── Rate Limiting Distribuido ─────────────────────────────────────────────
app.use(rateLimiterMiddleware);



// ── Proxies Públicos (Stripe Webhook, Productos Públicos) ─────────────────
app.use(publicProxyRouter);

// ── Autenticación centralizada (JWT) ──────────────────────────────────────
app.use(authMiddleware);

// ── Audit log de acciones admin ───────────────────────────────────────────
app.use(auditMiddleware);

// ── Swagger UI y Documentación ────────────────────────────────────────────
app.use(swaggerRouter);

// ── Proxies Protegidos (Rutas v1 y Legacy) ────────────────────────────────
app.use(protectedProxyRouter);

// ── Rutas Internas (Estadísticas, WebSockets Broadcast) ───────────────────
app.use(internalRouter);

// ── Health checks y Métricas (Prometheus) ─────────────────────────────────
app.use(observabilityRouter);

// ── Global error handler ──────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('API Gateway Error', { message: err.message });
    res.status(500).json({ error: 'Internal Server Error', code: 'GATEWAY_ERROR', message: 'Gateway panic' });
});

export default app;
