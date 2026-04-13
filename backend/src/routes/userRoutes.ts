import { Router } from "express";
import { createUser, getUsers } from "../controllers/userController";
import { requireRole } from "../middleware/authMiddleware";

const router = Router();

router.get("/", requireRole("ADMIN", "SUPER_ADMIN"), getUsers);
router.post("/", requireRole("ADMIN", "SUPER_ADMIN"), createUser);

export default router;
