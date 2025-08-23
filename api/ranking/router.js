import { Router } from 'express';
import { validateQuery } from '../util/validateSchema.js';
import { rankingSchemas } from './schema.js';
import { getRankingsController } from './controller.js';

const router = Router();

// 챌린지 랭킹 조회 (대학별 / 개인별)
router.get("/",
  validateQuery(rankingSchemas.rankingQuery),
  getRankingsController
);

export default router;