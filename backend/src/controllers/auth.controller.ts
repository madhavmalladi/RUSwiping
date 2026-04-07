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

/**
 * Test login for development (bypasses Google OAuth)
 * POST /api/auth/test-login
 * Body: { email, displayName? }
 */
export async function testLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, displayName } = req.body;

    if (!email) {
      return next(new AppError("email is required", 400));
    }

    // Use email as a fake google_id for testing
    const testGoogleId = `test-${email}`;

    // Check if user exists
    const existingUserResult = await findUserByGoogleId(testGoogleId);

    if (!existingUserResult.success) {
      return next(new AppError(existingUserResult.error || "Failed to find user", 500));
    }

    let user;

    if (existingUserResult.data) {
      user = existingUserResult.data;
    } else {
      // Create new test user
      const createResult = await createUser({
        googleId: testGoogleId,
        email,
        displayName: displayName || email.split("@")[0],
      });

      if (!createResult.success || !createResult.data) {
        return next(new AppError(createResult.error || "Failed to create user", 500));
      }

      user = createResult.data;
    }

    // Generate JWT
    const token = generateJWT(user);

    res.json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
}
