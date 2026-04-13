"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get("/", (0, authMiddleware_1.requireRole)("ADMIN", "SUPER_ADMIN"), userController_1.getUsers);
router.post("/", (0, authMiddleware_1.requireRole)("ADMIN", "SUPER_ADMIN"), userController_1.createUser);
exports.default = router;
