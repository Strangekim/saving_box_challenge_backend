import { Router } from 'express';
import { 
  getNotificationsController,
  markAllNotificationsAsReadController,
  deleteNotificationController
} from './controller.js';
import { validateParams, validateQuery } from '../util/validateSchema.js';
import { notificationIdParam } from './schema.js';

const router = Router();

// 알림 목록 조회
router.get("/", getNotificationsController);

// 모든 알림 읽음 처리
router.patch("/read-all", markAllNotificationsAsReadController);

// 알림 단일 삭제
router.delete("/:id",
  validateParams(notificationIdParam),
  deleteNotificationController
);

export default router;