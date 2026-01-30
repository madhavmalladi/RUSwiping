import type { Request, Response, NextFunction } from "express";
import { authenticateWithGoogle, generateJWT } from "../services/auth.service.js";
import { findUserById, findUserByGoogleId, createUser } from "../services/user.service.js";
import { AppError } from "../middleware/error-handler.js";

/**
 * Handle Google OAuth authentication
 * POST /api/auth/google
 */
export async function googleAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const { idToken, expoPushToken } = req.body;

    if (!idToken) {
      return next(new AppError("idToken is required", 400));
    }

    const result = await authenticateWithGoogle(idToken, expoPushToken);
    if (!result.success || !result.data) {
      return next(new AppError(result.error || "Authentication failed", 401));
    }

    res.json({
      success: true,
      token: result.data.token,
      user: result.data.user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user's information
 * GET /api/auth/me
 * Requires authentication (authMiddleware)
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const result = await findUserById(userId);

    if (!result.success || !result.data) {
      return next(new AppError(result.error || "User not found", 404));
    }

    res.json({
      success: true,
      user: result.data,
    });
  } catch (error) {
    next(error);
  }
}
