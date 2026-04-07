import type { Request, Response, NextFunction } from "express";
import { sendMessage, getMessages, getLatestMessage } from "../services/message.service.js";
import { AppError } from "../middleware/error-handler.js";

/**
 * Send a message in a match conversation
 * POST /api/matches/:matchId/messages
 * Body: { text }
 */
export async function sendMessageController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { matchId } = req.params;
    const { text } = req.body;

    if (!matchId) {
      return next(new AppError("matchId is required", 400));
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return next(new AppError("text is required and must be a non-empty string", 400));
    }

    const result = await sendMessage(matchId, userId, text.trim());

    if (!result.success || !result.data) {
      return next(new AppError(result.error || "Failed to send message", 400));
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all messages for a match
 * GET /api/matches/:matchId/messages
 * Query: { limit?, offset? }
 */
export async function getMessagesController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { matchId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!matchId) {
      return next(new AppError("matchId is required", 400));
    }

    const result = await getMessages(matchId, userId, limit, offset);

    if (!result.success) {
      return next(new AppError(result.error || "Failed to fetch messages", 400));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get the latest message for a match (preview)
 * GET /api/matches/:matchId/messages/latest
 */
export async function getLatestMessageController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { matchId } = req.params;

    if (!matchId) {
      return next(new AppError("matchId is required", 400));
    }

    const result = await getLatestMessage(matchId, userId);

    if (!result.success) {
      return next(new AppError(result.error || "Failed to fetch latest message", 400));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}
