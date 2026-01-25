import type { Request, Response, NextFunction } from "express";
import { getAllDiningHalls, getDiningHallById } from "../services/dining-hall.service.js";
import { AppError } from "../middleware/error-handler.js";

/**
 * Get all active dining halls
 * GET /api/dining-halls
 */
export async function getDiningHalls(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getAllDiningHalls();

    if (!result.success) {
      return next(new AppError(result.error || "Failed to fetch dining halls", 500));
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
 * Get a single dining hall by ID
 * GET /api/dining-halls/:id
 */
export async function getDiningHall(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!id) {
      return next(new AppError("Dining hall ID is required", 400));
    }

    const result = await getDiningHallById(id);

    if (!result.success) {
      return next(new AppError(result.error || "Dining hall not found", 404));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}
