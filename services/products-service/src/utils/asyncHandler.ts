import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrapper para atrapar errores en rutas asíncronas de Express
 * y pasarlos al manejador global de errores de Express.
 */
export const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
