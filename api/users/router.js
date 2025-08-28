import { Router } from 'express';
import { validateSchema } from '../util/validateSchema.js';
import { loginSchema,updateCharacterSchema,myBucketsQuerySchema,nicknameSchema, likeParamsSchema} from './schema.js';
import { requireAuth } from '../util/auth.js';
import { 
    logIn,
    signUp,
    logOut,
    getUserInventoryController,
    updateUserCharacterController,
    getUserProfileController,
    getMyBucketListController,
    updateUserNicknameController,
    likeController, 
    unlikeController
} from './controller.js';

const router = Router();

// 회원 가입
router.post("/signIn",
    validateSchema(loginSchema), 
    signUp
)

// 로그인
router.post("/logIn",
    validateSchema(loginSchema), 
    logIn
)

// 로그아웃
router.delete("/logout",
    logOut
);

// 가방 조회 (인증 필요)
router.get("/inventory",
  requireAuth,
  getUserInventoryController
);

// 캐릭터 프로필 수정 (인증 필요)
router.patch("/character",
    requireAuth,
    validateSchema(updateCharacterSchema),
    updateUserCharacterController
);

// 내 정보 조회 (인증 필요)
router.get("/me",
    requireAuth,
    getUserProfileController
);

// 내 적금통 목록 조회 
router.get("/buckets",
    requireAuth,
    validateSchema(myBucketsQuerySchema),
    getMyBucketListController
);

// 닉네임 변경하기
router.patch(
    requireAuth,
    validateSchema(nicknameSchema),
    updateUserNicknameController
);
export default router;

// 적금통 좋아요 생성
router.post("/buckets",
    requireAuth,
    validateSchema(likeSchema),
    validateSchema(postIdParamSchema),
    likeController
);

router.post("/buckets/:id/like", 
    requireAuth,
    validateSchema(likeParamsSchema, 'params'),
    likeController
);

// 적금통 좋아요 삭제
router.delete("/buckets/:id/like", 
    requireAuth,
    validateSchema(likeParamsSchema, 'params'),
    unlikeController
);
