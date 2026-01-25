import type { Request, Response, NextFunction } from "express";
import {
  createSwipeOffer,
  createSwipeRequest,
  getActiveSwipeOffers,
  getActiveSwipeRequests,
  getUserActiveOffer,
  getUserActiveRequest,
  cancelSwipeOffer,
  cancelSwipeRequest,
} from "../services/swipe.service.js";
import { AppError } from "../middleware/error-handler.js";

// ---------------------------- Swipe Offer Controllers ------------------------------

// POST /api/swipes/offers
// Body: { diningHallId, availableFrom, availableUntil }
// Requires: Authentication
export async function createOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { diningHallId, availableFrom, availableUntil } = req.body;

    // Validate required fields
    if (!diningHallId || !availableFrom || !availableUntil) {
      return next(new AppError("diningHallId, availableFrom, and availableUntil are required", 400));
    }

    // Validate timestamps
    const from = new Date(availableFrom);
    const until = new Date(availableUntil);
    if (isNaN(from.getTime()) || isNaN(until.getTime())) {
      return next(new AppError("Invalid timestamp format", 400));
    }

    if (until <= from) {
      return next(new AppError("availableUntil must be after availableFrom", 400));
    }

    const result = await createSwipeOffer(userId, diningHallId, availableFrom, availableUntil);

    if (!result.success || !result.data) {
      return next(new AppError(result.error || "Failed to create swipe offer", 400));
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/swipes/offers/:diningHallId
// Requires: Authentication
export async function getOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const { diningHallId } = req.params;

    if (!diningHallId) {
      return next(new AppError("diningHallId is required", 400));
    }

    const result = await getActiveSwipeOffers(diningHallId);

    if (!result.success) {
      return next(new AppError(result.error || "Failed to fetch offers", 500));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/swipes/offers/my/active
// Requires: Authentication
export async function getMyActiveOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const result = await getUserActiveOffer(userId);

    if (!result.success) {
      return next(new AppError(result.error || "Failed to fetch your offer", 500));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/swipes/offers/:offerId
// Requires: Authentication
export async function cancelOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { offerId } = req.params;
    if (!offerId) {
      return next(new AppError("offerId is required", 400));
    }

    const result = await cancelSwipeOffer(offerId, userId);

    if (!result.success || !result.data) {
      return next(new AppError(result.error || "Failed to cancel offer", 400));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------- Swipe Request Controllers -----------------------------

// POST /api/swipes/requests
// Body: { diningHallId, requestedAt }
// Requires: Authentication
export async function createRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { diningHallId, requestedAt } = req.body;

    // Validate required fields
    if (!diningHallId || !requestedAt) {
      return next(new AppError("diningHallId and requestedAt are required", 400));
    }

    // Validate timestamp
    const timestamp = new Date(requestedAt);
    if (isNaN(timestamp.getTime())) {
      return next(new AppError("Invalid timestamp format", 400));
    }

    const result = await createSwipeRequest(userId, diningHallId, requestedAt);

    if (!result.success || !result.data) {
      return next(new AppError(result.error || "Failed to create swipe request", 400));
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/swipes/requests/:diningHallId
// Requires: Authentication
export async function getRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const { diningHallId } = req.params;

    if (!diningHallId) {
      return next(new AppError("diningHallId is required", 400));
    }

    const result = await getActiveSwipeRequests(diningHallId);

    if (!result.success) {
      return next(new AppError(result.error || "Failed to fetch requests", 500));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/swipes/requests/my/active
// Requires: Authentication
export async function getMyActiveRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const result = await getUserActiveRequest(userId);

    if (!result.success) {
      return next(new AppError(result.error || "Failed to fetch your request", 500));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/swipes/requests/:requestId
// Requires: Authentication
export async function cancelRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { requestId } = req.params;
    if (!requestId) {
      return next(new AppError("requestId is required", 400));
    }

    const result = await cancelSwipeRequest(requestId, userId);

    if (!result.success || !result.data) {
      return next(new AppError(result.error || "Failed to cancel request", 400));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}
