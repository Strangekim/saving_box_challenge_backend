import { Pool } from "pg";

const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_HOST = "db",  
  POSTGRES_PORT = "5432"
} = process.env;

export const pool = new Pool({
  user: POSTGRES_USER,
  password: POSTGRES_PASSWORD,
  host: POSTGRES_HOST,
  database: POSTGRES_DB,
  port: Number(POSTGRES_PORT),
  max: 15,  // 20에서 10으로 줄이기
  min: 2,
  idleTimeoutMillis: 10000,  // 더 빠른 해제
  acquireTimeoutMillis: 5000
});

// client.connect();

export const query = (text, params) => pool.query(text, params);
export const ping = async () => (await pool.query("select 1 as ok")).rows[0];