import { Router } from 'express';
import { inquireSavingsProducts } from './service.js';

const router = Router();

router.get("/create_list",
    inquireSavingsProducts
)

export default router;