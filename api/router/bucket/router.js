import { Router } from 'express';
import { inquireSavingsProducts } from './service.js';

const router = Router();

router.post("/create_list",
    inquireSavingsProducts
)

export default router;