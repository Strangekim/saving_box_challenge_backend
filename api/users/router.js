import { Router } from 'express';
import { 
    validateSchema,
    validateParams,
    validateQuery 
 } from '../util/validateSchema.js';
import { loginSchema,updateCharacterSchema,myBucketsQuerySchema,nicknameSchema,userIdParam,otherUserBucketsQuerySchema  } from './schema.js';
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
    getOtherUserProfileController,
    getOtherUserBucketListController     
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
router.patch("/nickname",
    requireAuth,
    validateSchema(nicknameSchema),
    updateUserNicknameController
);

// 다른 사용자 정보 조회 (로그인 불필요, 본인이면 이메일 포함)
router.get("/:id",
    validateParams(userIdParam),
    getOtherUserProfileController
);

// 다른 사용자 적금통 목록 조회 (공개 적금통만, 로그인 불필요)
router.get("/:id/buckets",
    validateParams(userIdParam),
    validateQuery(otherUserBucketsQuerySchema),
    getOtherUserBucketListController
);

export default router;