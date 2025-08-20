import { Pool } from "pg";

const Pool = pkg

export const client = new Pool({
  user: process.env.PGSQL_USER,
  password: process.env.PGSQL_PW,
  host: process.env.PGSQL_HOST,
  database: process.env.PGSQL_DB,
  port: process.env.PGSQL_PORT,
  max: 10,
});

client.connect();