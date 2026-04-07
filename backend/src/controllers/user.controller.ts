import type { Request, Response, NextFunction } from "express";
import { updatePushToken } from "../services/user.service.js";
import { AppError } from "../middleware/error-handler.js";

// PUT /api/users/push-token
// Body: { expoPushToken }
// Requires: Authentication
export async function updateUserPushToken(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return next(new AppError("expoPushToken is required", 400));
    }

    const result = await updatePushToken(userId, expoPushToken);

    if (!result.success) {
      return next(new AppError(result.error || "Failed to update push token", 400));
    }

    res.json({
      success: true,
      message: "Push token updated successfully",
    });
  } catch (error) {
    next(error);
  }
}
