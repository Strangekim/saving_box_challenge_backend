import { Pool } from "pg";

const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  // Docker Compose의 새로운 환경변수들 사용
  PGHOST = "db",  
  PGPORT = "5432",
  PGUSER,
  PGPASSWORD,
  PGDATABASE
} = process.env;

const dbConfig = {
  user: PGUSER || POSTGRES_USER,
  password: PGPASSWORD || POSTGRES_PASSWORD,
  host: PGHOST,
  database: PGDATABASE || POSTGRES_DB,
  port: Number(PGPORT),
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
};

// db 수정

export const pool = new Pool(dbConfig);

// client.connect();

export const query = (text, params) => pool.query(text, params);
export const ping = async () => (await pool.query("select 1 as ok")).rows[0];