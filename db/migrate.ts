
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './schema';
import { cwd } from 'node:process';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(cwd());

const runMigrate = async () => {
    if (!process.env.POSTGRES_URL) {
        throw new Error('POSTGRES_URL is not defined');
    }

    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
    });

    const db = drizzle(pool, { schema });


    const start = Date.now();

    try {
        await migrate(db, { migrationsFolder: 'drizzle' });
        const end = Date.now();
    } catch (err) {
        console.error('❌ Migration failed');
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

runMigrate();
