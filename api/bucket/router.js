import { Router } from 'express';
import { inquireAllProducts, createBucket } from './controller.js';
import { validateSchema } from '../util/validateSchema.js';
import { savingsSchemas } from './schema.js';
import { requireAuth } from '../util/auth.js';

const router = Router();

// 예 적금 상품 조회
router.get("/create_list",
    inquireAllProducts
)

// 적금통 생성
router.post("/create", 
  requireAuth,
  validateSchema(savingsSchemas.createBucket),
  createBucket
);

export default router;