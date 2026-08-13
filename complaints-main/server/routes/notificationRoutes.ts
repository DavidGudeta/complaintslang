import express from "express";
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} from "../controllers/notificationController.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticateUser);
router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.patch("/read-all", markAllAsRead);
router.delete("/", clearAllNotifications);
router.delete("/:id", deleteNotification);

export default router;
