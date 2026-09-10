export {};
/**
 * Tests de migraciones contra Postgres real.
 *
 * No se ejecutan en la suite normal (`npm test`): requieren RUN_MIGRATION_TESTS=true
 * y variables DB_* (o DATABASE_URL) apuntando a una base vacía o ya migrada.
 */
const { execSync } = require('child_process');
const path = require('path');
const { Pool } = require('pg');

const serviceRoot = path.resolve(__dirname, '..', '..');

const runDescribe = process.env.RUN_MIGRATION_TESTS === 'true' ? describe : describe.skip;

const ensureDatabaseUrl = () => {
    if (process.env.DATABASE_URL) return;
    const u = process.env.DB_USER || 'postgres';
    const p = process.env.DB_PASSWORD ?? '';
    const h = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const d = process.env.DB_NAME || 'postgres';
    process.env.DATABASE_URL = `postgres://${encodeURIComponent(u)}:${encodeURIComponent(p)}@${h}:${port}/${d}`;
};

const poolConfig = () => {
    ensureDatabaseUrl();
    if (process.env.DATABASE_URL) {
        return { connectionString: process.env.DATABASE_URL };
    }
    return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'postgres',
    };
};

const tableExists = async (pool: any, tableName: string) => {
    const r = await pool.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
    );
    return r.rows.length > 0;
};

const columnExists = async (pool: any, tableName: string, columnName: string) => {
    const r = await pool.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [tableName, columnName]
    );
    return r.rows.length > 0;
};

runDescribe('Migraciones SQL orders-service (integración Postgres)', () => {
    let pool: any;

    beforeAll(() => {
        ensureDatabaseUrl();
        execSync('npx node-pg-migrate up --migrations-dir src/db/migrations', {
            cwd: serviceRoot,
            env: { ...process.env, NODE_ENV: 'development' },
            encoding: 'utf8',
            stdio: 'pipe',
        });
        pool = new Pool(poolConfig());
    });

    afterAll(async () => {
        if (pool) await pool.end();
    });

    test('tabla pgmigrations registrada', async () => {
        const exists = await tableExists(pool, 'pgmigrations');
        expect(exists).toBe(true);
        const { rows } = await pool.query('SELECT name FROM pgmigrations ORDER BY run_on');
        const names = rows.map((r: any) => r.name);
        expect(names.length).toBeGreaterThanOrEqual(1);
    });

    test('esquema base: venta, producto_venta, factura presentes', async () => {
        expect(await tableExists(pool, 'venta')).toBe(true);
        expect(await tableExists(pool, 'producto_venta')).toBe(true);
        expect(await tableExists(pool, 'factura')).toBe(true);
    });

    test('008: tabla sesion_caja y movimientos_caja', async () => {
        expect(await tableExists(pool, 'sesion_caja')).toBe(true);
        expect(await tableExists(pool, 'movimiento_caja')).toBe(true);
        expect(await columnExists(pool, 'venta', 'sesion_caja_id')).toBe(true);
    });

    test('011: soft delete en ventas', async () => {
        expect(await columnExists(pool, 'venta', 'deleted_at')).toBe(true);
    });

    test('migrate up es idempotente (segunda ejecución sin error)', () => {
        ensureDatabaseUrl();
        const out = execSync('npx node-pg-migrate up --migrations-dir src/db/migrations', {
            cwd: serviceRoot,
            env: { ...process.env, NODE_ENV: 'development' },
            encoding: 'utf8',
        });
        expect(out).toMatch(/No migrations to run|migrations complete/i);
    });
});
