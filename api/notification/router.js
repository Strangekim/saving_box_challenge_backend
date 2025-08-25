import { Router } from 'express';
import { 
  getNotificationsController,
  markAllNotificationsAsReadController 
} from './controller.js';

const router = Router();

// 알림 목록 조회
router.get("/", getNotificationsController);

// 모든 알림 읽음 처리
router.patch("/read-all", markAllNotificationsAsReadController);

export default router;