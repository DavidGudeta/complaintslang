import express from "express";
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  updateProfile, 
  changePassword,
  getPerformanceStats
} from "../controllers/userController.js";

import { authenticateUser, requireRole } from "../middleware/auth.js";

export const adminUserRoutes = express.Router();
adminUserRoutes.use(authenticateUser);
adminUserRoutes.get("/", requireRole(['ADMIN', 'DIRECTOR', 'TEAM_LEADER']), getUsers);
adminUserRoutes.use(requireRole(['ADMIN', 'DIRECTOR']));
adminUserRoutes.get("/performance", getPerformanceStats);
adminUserRoutes.post("/", createUser);
adminUserRoutes.patch("/:id", updateUser);
adminUserRoutes.delete("/:id", deleteUser);

export const profileRoutes = express.Router();
profileRoutes.use(authenticateUser);
profileRoutes.patch("/:id", updateProfile);
profileRoutes.patch("/:id/password", changePassword);
