import { Router } from "express";
import {
  getAuthBootstrapStatus,
  getCurrentUser,
  login,
  registerInitialUser,
} from "../controllers/authController";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();

router.get("/bootstrap-status", getAuthBootstrapStatus);
router.post("/register", registerInitialUser);
router.post("/login", login);
router.get("/me", requireAuth, getCurrentUser);

export default router;
