import express from "express";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get("/", (_req, res) => res.json({ ok: true, msg: "API alive" }));
app.get("/health", (_req, res) => res.json({ status: "force push 를 막겠습니다." }));
app.get("/db/ping", async (_req, res) => {
  try {
    const r = await pool.query("select 1 as ok");
    res.json({ db: "ok", result: r.rows[0] });
  } catch (e) {
    res.status(500).json({ db: "fail", error: String(e) });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`API listening on ${PORT}`));
