'use strict';

import * as productService from '../services/productService';
import parsePagination from '../utils/parsePagination';
import logActivity from '../utils/logActivity';
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';

interface CustomRequest extends Request {
    user?: any;
}

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, offset } = parsePagination(req.query);
    const storeId = req.query.store_id ? Number(req.query.store_id) : null;

    const result = await productService.getProducts(page, limit, offset, storeId);
    res.status(200).json(result);
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const storeId = req.query.store_id ? Number(req.query.store_id) : null;

    const data = await productService.getProductById(Number(id), storeId);
    res.status(200).json(data);
});

export const createProduct = asyncHandler(async (req: CustomRequest, res: Response) => {
    const newProduct = await productService.createProduct(req.body, req.file);
    
    logActivity({ user_email: req.user?.correo_usu, action: 'created', entity_type: 'product', entity_id: newProduct?.cod_prod, details: `Producto "${newProduct?.nom_prod}" creado` });
    res.status(201).json(newProduct);
});

export const updateProduct = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const result = await productService.updateProduct(Number(id), req.body, req.file);
    
    logActivity({ user_email: req.user?.correo_usu, action: 'updated', entity_type: 'product', entity_id: String(id), details: `Producto actualizado` });
    res.status(200).json(result.data || result);
});

export const deleteProduct = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;
    const deletedProduct = await productService.deleteProduct(Number(id));
    
    logActivity({ user_email: req.user?.correo_usu, action: 'deleted', entity_type: 'product', entity_id: String(id), details: `Producto "${deletedProduct?.nom_prod}" eliminado` });
    res.status(200).json({ message: 'Producto eliminado exitosamente.' });
});

export const updateStock = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cantidad } = req.body;

    const result = await productService.updateStock(Number(id), Number(cantidad));
    res.status(200).json(result);
});

export const getLowStock = asyncHandler(async (req: Request, res: Response) => {
    const data = await productService.getLowStock();
    res.status(200).json({ data });
});

