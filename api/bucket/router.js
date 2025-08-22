import { Router } from 'express';
import { inquireAllProducts } from './controller';

const router = Router();

router.get("/create_list",
    inquireAllProducts
)

export default router;