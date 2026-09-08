import pg from 'pg';
import "dotenv/config";

declare const process: {
    env: Record<string, string | undefined>;
};

const db = new pg.Pool({
    user: String(process.env.DB_USER),
    password: String(process.env.DB_PASSWORD),
    host: String(process.env.DB_HOST),
    port: Number(process.env.DB_PORT),
    database: String(process.env.DB_NAME),
});

export default db;