import { Router } from 'express';
import { 
  inquireAllProducts, 
  createBucket,
  updateBucket,
  getBucketListController,
  getBucketDetailController,
  terminateBucket
 } from './controller.js';
import { 
  validateSchema, 
  validateQuery, 
  validateParams, 
  validate 
} from '../util/validateSchema.js';
import { savingsSchemas,idParam } from './schema.js';
import { requireAuth } from '../util/auth.js';

const router = Router();

// 예 적금 상품 조회
router.get("/create_list",
    requireAuth,
    inquireAllProducts
)

// 적금통 생성
router.post("/create", 
  requireAuth,
  validateSchema(savingsSchemas.createBucket),
  createBucket
);

// 적금통 목록 조회
router.get("/", 
  validateQuery(savingsSchemas.listQuery),
  getBucketListController
);


// 적금통 수정
router.patch("/:id", 
  requireAuth,
  validate({
    params: idParam(),
    body: savingsSchemas.updateBucket
  }),
  updateBucket
);

// 적금통 상세보기
router.get("/:id", 
  validateParams(idParam()),
  getBucketDetailController
);

// 적금통 돈 돌려받기
router.post("/:id/get_money",
  requireAuth,
  validateParams(idParam()),
  terminateBucket
)

export default router;