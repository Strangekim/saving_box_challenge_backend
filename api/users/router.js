import { Router } from 'express';
import { validateSchema } from '../util/validateSchema.js';
import { loginSchema } from './schema.js';
import { 
    logIn,
    signUp,
    logOut 
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
router.post("/logout",
    logOut
);

export default router;