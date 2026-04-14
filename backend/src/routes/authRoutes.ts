import { Router } from "express";
import {
  getAuthBootstrapStatus,
  getCurrentUser,
  login,
  logout,
} from "../controllers/authController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.get("/bootstrap-status", getAuthBootstrapStatus);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, getCurrentUser);

export default router;
