import express from "express";
import pkg from "pg";
import bucketRouter from './router/bucket/router.js';
const { Pool } = pkg;

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get("/", (_req, res) => res.json({ ok: true, msg: "API alasdasdive" }));

app.get("/health", (_req, res) => res.json({ status: "force push 를 막겠습니다." }));
app.get("/db/ping", async (_req, res) => {
  try {
    const r = await pool.query("select 1 as ok");
    res.json({ db: "ok", result: r.rows[0] });
  } catch (e) {
    res.status(500).json({ db: "fail", error: String(e) });
  }
});

app.use("/bucket", bucketRouter)

// ============== 공통 에러 핸들러 ===========

app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).send({
    message: err.message,
  });
});

app.use((req, res, next) => {
  res.status(404).send({
    message: "연결 실패",
  });
});

app.listen(PORT, "0.0.0.0", () => 
  console.log(`${PORT}번 포트에서 웹 서버 실행 중 입니다.`));
