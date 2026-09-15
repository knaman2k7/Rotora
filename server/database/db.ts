import pg from 'pg';
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env") });

declare const process: {
    env: Record<string, string | undefined>;
};

const db = process.env.DATABASE_URL
    ? new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    })
    : new pg.Pool({
        user: String(process.env.DB_USER),
        password: String(process.env.DB_PASSWORD),
        host: String(process.env.DB_HOST),
        port: Number(process.env.DB_PORT),
        database: String(process.env.DB_NAME),
    });

// Without this listener, an idle client error (dropped connection, DB
// restart, network blip) is an unhandled 'error' event, which crashes
// the whole process.
db.on('error', (error) => {
    console.error('Unexpected error on idle database client:', error);
});

export default db;