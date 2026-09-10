import { Pool } from 'pg';
import { logger } from '@kiora/shared';

const dbConfig = {
    connectionString: process.env.DATABASE_URL,
};

const pool = new Pool(dbConfig);

pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', { error: err.message });
    process.exit(-1);
});

export default {
    query: (text: string, params?: any[]) => pool.query(text, params),
    connect: () => pool.connect(),
    getPool: () => pool
};
