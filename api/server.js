import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import bucketRouter from './bucket/router.js';
import usersRouter from './users/router.js';
import { ping, query } from "./database/postgreSQL.js";
import session from 'express-session';
// docker compose exec api npm i express-session

const app = express();

app.use(express.json());

const PORT = process.env.PORT;

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // HTTPS에서는 true
    maxAge: 0.5 * 60 * 60 * 1000 // 24시간
  }
}));


// 상태 체크
app.get("/", (_req, res) => res.json({ ok: true, msg: "API alasdasdive" }));
app.get("/health", (_req, res) => res.json({ status: "force push 를 막겠습니다." }));
app.get("/db/ping", async (_req, res) => {
  try { 
    res.json({ db: "ok", result: await ping() }); 
  } catch (e) { 
    res.status(500).json({ db: "fail", error: String(e) }); 
  }
});


// 등록
app.use("/bucket", bucketRouter)

app.use('/users', usersRouter);

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

const nowDate = new Date(Date.now());

app.listen(PORT, "0.0.0.0", () => 
  console.log(`${PORT}번 포트에서 웹 서버 실행 중 입니다. ${nowDate}`));
