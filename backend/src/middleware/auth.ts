import type { Request, Response, NextFunction } from "express";
import { verifyJWT } from "../services/auth.service.js";
import { AppError } from "./error-handler.js";

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  // Check if header exists and starts with 'Bearer '
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("No token provided", 401);
  }

  // extract token
  const token = authHeader.split(" ")[1];

  if (!token) {
    throw new AppError("No token provided", 401);
  }

  // Verify the token
  const result = verifyJWT(token);

  if (!result.success || !result.data) {
    throw new AppError("Invalid or expired token", 401);
  }

  // Attach user info to request
  req.user = result.data;

  // Continue to the next middleware/route handler
  next();
}
