import { Router } from 'express';
import { validateQuery } from '../util/validateSchema.js';
import { achievementSchemas } from './schema.js';
import { getAllAchievementsController } from './controller.js';

const router = Router();

// 전체 업적 목록 조회 (달성 여부 포함)
router.get("/",
  validateQuery(achievementSchemas.userAchievementsQuery),
  getAllAchievementsController
);

export default router;