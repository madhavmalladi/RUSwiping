import { Router } from "express";
import { updateUserPushToken } from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

// PUT /api/users/push-token
// Body: { expoPushToken }
router.put("/push-token", updateUserPushToken);

export default router;
