import * as productRepository from '../repositories/productRepository';
import cacheService from './cacheService';
import { AppError } from '../utils/AppError';
import { logger } from '@kiora/shared';

export const getProducts = async (page: number, limit: number, offset: number, storeId: number | null) => {
    if (storeId) {
        const cacheKey = `store:${storeId}:${page}:${limit}`;
        return await cacheService.getOrSet('products', cacheKey, async () => {
            const [rows, count] = await Promise.all([
                productRepository.findAllByStore({ storeId, limit, offset }),
                productRepository.countAllByStore(storeId),
            ]);
            return {
                data: rows.rows,
                pagination: {
                    total: parseInt(count.rows[0].count, 10),
                    page,
                    limit,
                    totalPages: Math.ceil(count.rows[0].count / limit),
                },
                store_id: storeId,
            };
        });
    }

    const cacheKey = `list:${page}:${limit}`;
    return await cacheService.getOrSet('products', cacheKey, async () => {
        const [rows, count] = await Promise.all([
            productRepository.findAll({ limit, offset }),
            productRepository.countAll(),
        ]);
        return {
            data: rows.rows,
            pagination: {
                total: parseInt(count.rows[0].count, 10),
                page,
                limit,
                totalPages: Math.ceil(count.rows[0].count / limit),
            },
        };
    });
};

export const getProductById = async (id: number, storeId: number | null) => {
    if (storeId) {
        const cacheKey = `store:${storeId}:${id}`;
        const data = await cacheService.getOrSet('products', cacheKey, async () => {
            const result = await productRepository.findByIdAndStore(id, storeId);
            return result.rows.length > 0 ? result.rows[0] : null;
        });
        if (!data) throw new AppError('Producto no disponible en esta tienda.', 404, 'NOT_FOUND');
        return data;
    }

    const cacheKey = String(id);
    const data = await cacheService.getOrSet('products', cacheKey, async () => {
        const result = await productRepository.findById(id);
        return result.rows.length > 0 ? result.rows[0] : null;
    });

    if (!data) throw new AppError('Producto no encontrado.', 404, 'NOT_FOUND');
    return data;
};

export const createProduct = async (body: any, file?: any) => {
    const { fk_cod_cats } = body;
    const url_imagen = file
        ? (file.path?.startsWith('http') ? file.path : `/uploads/${file.filename}`)
        : null;

    let parsedCats: number[] = [];
    if (fk_cod_cats) {
        try {
            const pc = typeof fk_cod_cats === 'string' ? JSON.parse(fk_cod_cats) : fk_cod_cats;
            if (!Array.isArray(pc)) parsedCats = [Number(pc)];
            else parsedCats = pc.map(Number);
        } catch (e) {
            parsedCats = Array.isArray(fk_cod_cats) ? fk_cod_cats.map(Number) : [Number(fk_cod_cats)];
        }
    }

    const productData = {
        ...body,
        precio_unitario: Number(body.precio_unitario),
        descuento: body.descuento !== undefined ? Number(body.descuento) : 0,
        fechaven_prod: body.fechaven_prod || null,
        fk_cod_cats: parsedCats,
        stock_actual: Number(body.stock_actual || 0),
        stock_minimo: Number(body.stock_minimo || 0),
        url_imagen,
        codigo_barras: body.codigo_barras || null
    };

    const { nom_prod, codigo_barras, precio_unitario, stock_actual } = productData;

    const existing = await productRepository.findByName(nom_prod);
    if (existing.rows.length > 0) {
        throw new AppError('Ya existe un producto con ese nombre.', 409, 'DUPLICATE_PRODUCT');
    }

    if (codigo_barras) {
        const existingBarcode = await productRepository.findByBarcode(codigo_barras);
        if (existingBarcode.rows.length > 0) {
            throw new AppError('El código de barras ya está registrado.', 409, 'DUPLICATE_BARCODE');
        }
    }

    try {
        const result = await productRepository.create(productData);
        const newProduct = result.rows[0];
        
        await productRepository.createProductTienda({
            cod_prod: newProduct.cod_prod,
            storeId: 1, // Store ID por defecto (matriz)
            precio_venta: Number(precio_unitario),
            stock_actual: Number(stock_actual || 0),
        }).catch(err => logger.warn('No se pudo registrar en producto_tienda', { error: err.message }));

        await cacheService.invalidate('products');
        return newProduct;
    } catch (error: any) {
        if (error.code === '23503') {
            throw new AppError('Una de las categorías proporcionadas no existe.', 400, 'FK_NOT_FOUND');
        }
        throw error;
    }
};

export const updateProduct = async (id: number, body: any, file?: any) => {
    const fields = { ...body };

    if (file) {
        fields.url_imagen = file.path?.startsWith('http') ? file.path : `/uploads/${file.filename}`;
    }
    if (fields.precio_unitario !== undefined) fields.precio_unitario = Number(fields.precio_unitario);
    if (fields.stock_actual !== undefined) fields.stock_actual = Number(fields.stock_actual);
    if (fields.stock_minimo !== undefined) fields.stock_minimo = Number(fields.stock_minimo);
    if (fields.fk_cod_cats) {
        try {
            const fc = typeof fields.fk_cod_cats === 'string' ? JSON.parse(fields.fk_cod_cats) : fields.fk_cod_cats;
            if (!Array.isArray(fc)) fields.fk_cod_cats = [Number(fc)];
            else fields.fk_cod_cats = fc.map(Number);
        } catch (e) {
            fields.fk_cod_cats = Array.isArray(fields.fk_cod_cats) ? fields.fk_cod_cats.map(Number) : [Number(fields.fk_cod_cats)];
        }
    }

    const existingResult = await productRepository.findById(id);
    if (existingResult.rows.length === 0) {
        throw new AppError('Producto no encontrado.', 404, 'NOT_FOUND');
    }
    const existing = existingResult.rows[0];

    if (fields.codigo_barras) {
        const existingBarcode = await productRepository.findByBarcode(fields.codigo_barras);
        if (existingBarcode.rows.length > 0 && existingBarcode.rows[0].cod_prod !== id) {
            throw new AppError('El código de barras ya está registrado por otro producto.', 409, 'DUPLICATE_BARCODE');
        }
    }

    let hasChanges = false;
    for (const key of Object.keys(fields)) {
        if (key === 'fk_cod_cats') {
            const arr1 = [...fields[key]].sort();
            const arr2 = [...(existing[key] || [])].sort();
            if (JSON.stringify(arr1) !== JSON.stringify(arr2)) { hasChanges = true; break; }
        } else if (key === 'fechaven_prod' && fields[key]) {
            const d1 = new Date(fields[key]).toISOString().split('T')[0];
            const d2 = existing[key] ? new Date(existing[key]).toISOString().split('T')[0] : null;
            if (d1 !== d2) { hasChanges = true; break; }
        } else if (Number.isNaN(Number(fields[key])) && Number.isNaN(Number(existing[key]))) {
            if (String(fields[key]) !== String(existing[key])) { hasChanges = true; break; }
        } else if (fields[key] !== existing[key]) {
            if (fields[key] == existing[key]) continue;
            hasChanges = true;
            break;
        }
    }

    if (!hasChanges) {
        return { message: 'No se detectaron cambios', data: existing };
    }

    try {
        const result = await productRepository.update(id, fields);
        if (result.rows.length === 0) {
            throw new AppError('Producto no encontrado o ningún campo válido enviado.', 404, 'NOT_FOUND');
        }
        await cacheService.invalidate('products');
        return { message: 'Producto actualizado exitosamente', data: result.rows[0] };
    } catch (error: any) {
        if (error.code === '23503') {
            throw new AppError('Una de las categorías proporcionadas no existe.', 400, 'FK_NOT_FOUND');
        }
        throw error;
    }
};

export const deleteProduct = async (id: number) => {
    const ordersUrl = process.env.ORDERS_SERVICE_URL || 'http://orders-service:3004';
    try {
        const checkRes = await fetch(`${ordersUrl}/api/orders/products/${id}/has-sales`);
        if (checkRes.ok) {
            const data = await checkRes.json() as any;
            if (data.hasSales) {
                throw new AppError('No se puede eliminar el producto porque está vinculado a una o más ventas históricas.', 409, 'HAS_SALES_HISTORY');
            }
        }
    } catch (fetchErr: unknown) {
        logger.warn('No se pudo contactar a orders-service para verificar ventas', { error: (fetchErr as Error).message });
    }

    const result = await productRepository.remove(id);
    if (result.rows.length === 0) {
        throw new AppError('Producto no encontrado.', 404, 'NOT_FOUND');
    }
    await cacheService.invalidate('products');
    return result.rows[0];
};

export const updateStock = async (id: number, cantidad: number) => {
    if (cantidad < 0) {
        const current = await productRepository.findById(id);
        if (current.rows.length === 0) {
            throw new AppError('Producto no encontrado.', 404, 'NOT_FOUND');
        }
        const proyectado = current.rows[0].stock_actual + cantidad;
        if (proyectado < 0) {
            throw new AppError('Stock insuficiente.', 409, 'INSUFFICIENT_STOCK', {
                stock_actual: current.rows[0].stock_actual,
                cantidad_solicitada: cantidad,
                mensaje: `⚠️ No se puede restar ${Math.abs(cantidad)} unidades. Stock actual: ${current.rows[0].stock_actual}.`
            });
        }
    }

    try {
        const result = await productRepository.updateStock(id, cantidad);
        if (result.rows.length === 0) {
            throw new AppError('Producto no encontrado.', 404, 'NOT_FOUND');
        }

        const producto = result.rows[0];
        await cacheService.invalidate('products');

        const alertaStockCritico = producto.stock_actual <= producto.stock_minimo;
        if (alertaStockCritico) {
            logger.warn('ALERTA: Stock crítico', {
                cod_prod: id, stock_actual: producto.stock_actual, stock_minimo: producto.stock_minimo,
            });

            const redisClient = cacheService.getRedis();
            if (redisClient) {
                const adminEmails = process.env.ADMIN_EMAIL || 'admin@kiora.com';
                const payload = JSON.stringify({
                    to: adminEmails,
                    subject: '⚠️ Alerta: Stock Crítico (Actualización Directa)',
                    html: `<div style="font-family:sans-serif;padding:20px;">
                        <h2 style="color:#C41E1E;">⚠️ Stock Crítico Detectado</h2>
                        <p>Producto: <strong>${producto.nom_prod || 'ID #' + id}</strong></p>
                        <p>Stock Actual: <strong style="color:#C41E1E;">${producto.stock_actual}</strong></p>
                        <p>Stock Mínimo: <strong>${producto.stock_minimo}</strong></p>
                        <hr><p style="color:#888;">Actualización directa desde products-service</p>
                    </div>`,
                });
                redisClient.xadd('kiora:notifications:stream', '*', 'payload', payload).catch((err: any) => {
                    logger.error('err', { error: (err as Error).message });
                });
            }
        }

        return {
            ...producto,
            alerta_stock_critico: alertaStockCritico,
            mensaje: alertaStockCritico
                ? `⚠️ Stock actual (${producto.stock_actual}) es menor o igual al mínimo configurado (${producto.stock_minimo}).`
                : undefined,
        };
    } catch (error: any) {
        if (error.code === '23514' && error.constraint === 'chk_stock_actual_no_negativo') {
            throw new AppError('Stock insuficiente.', 409, 'INSUFFICIENT_STOCK', {
                mensaje: 'La operación dejaría el stock en negativo.'
            });
        }
        throw error;
    }
};

export const getLowStock = async () => {
    const result = await productRepository.findLowStock();
    return result.rows;
};
