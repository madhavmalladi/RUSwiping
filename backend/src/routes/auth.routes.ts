import { Router } from "express";
import { googleAuth, getMe } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/google
// Body: { idToken: string, expoPushToken?: string }
router.post("/google", googleAuth);

// GET /api/auth/me
// Requires: Authorization header with Bearer token
router.get("/me", authMiddleware, getMe);

export default router;
