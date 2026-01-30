import type { Request, Response, NextFunction } from "express";
import {
  createMatch,
  findPotentialMatchesForOffer,
  findPotentialMatchesForRequest,
  getUserMatches,
  getMatchById,
  completeMatch,
  getActiveMatches,
} from "../services/matching.service.js";
import { AppError } from "../middleware/error-handler.js";

// POST /api/matches
// Body: { offerId, requestId, diningHallId }
// Requires: Authentication
export async function createMatchController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { offerId, requestId, diningHallId } = req.body;

    // Validate required fields
    if (!offerId || !requestId || !diningHallId) {
      return next(new AppError("offerId, requestId, and diningHallId are required", 400));
    }

    // Determine if current user is the giver or receiver
    // The user making this request should be either the offer owner OR the request owner
    // We'll verify this in the service, but we need to know which role they're taking

    // For now, let's assume the authenticated user is creating the match
    // and we need both the giver and receiver IDs from the request
    const { giverId, receiverId } = req.body;

    if (!giverId || !receiverId) {
      return next(new AppError("giverId and receiverId are required", 400));
    }

    // Verify the current user is either the giver or receiver
    if (userId !== giverId && userId !== receiverId) {
      return next(new AppError("You must be either the giver or receiver to create this match", 403));
    }

    const result = await createMatch(giverId, receiverId, diningHallId, offerId, requestId);

    if (!result.success || !result.data) {
      return next(new AppError(result.error || "Failed to create match", 400));
    }

    res.status(201).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/matches/potential/offer/:offerId
// Requires: Authentication
export async function getPotentialMatchesForOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { offerId } = req.params;
    if (!offerId) {
      return next(new AppError("offerId is required", 400));
    }

    const result = await findPotentialMatchesForOffer(offerId, userId);

    if (!result.success) {
      return next(new AppError(result.error || "Failed to find potential matches", 400));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/matches/potential/request/:requestId
// Requires: Authentication
export async function getPotentialMatchesForRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { requestId } = req.params;
    if (!requestId) {
      return next(new AppError("requestId is required", 400));
    }

    const result = await findPotentialMatchesForRequest(requestId, userId);

    if (!result.success) {
      return next(new AppError(result.error || "Failed to find potential matches", 400));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/matches
// Requires: Authentication
export async function getMatches(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const result = await getUserMatches(userId);

    if (!result.success) {
      return next(new AppError(result.error || "Failed to fetch matches", 500));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/matches/active
// Requires: Authentication
export async function getActiveMatchesController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const result = await getActiveMatches(userId);

    if (!result.success) {
      return next(new AppError(result.error || "Failed to fetch active matches", 500));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/matches/:matchId
// Requires: Authentication
export async function getMatch(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { matchId } = req.params;
    if (!matchId) {
      return next(new AppError("matchId is required", 400));
    }

    const result = await getMatchById(matchId, userId);

    if (!result.success || !result.data) {
      return next(new AppError(result.error || "Match not found", 404));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/matches/:matchId/complete
// Requires: Authentication
export async function markMatchComplete(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new AppError("User not authenticated", 401));
    }

    const { matchId } = req.params;
    if (!matchId) {
      return next(new AppError("matchId is required", 400));
    }

    const result = await completeMatch(matchId, userId);

    if (!result.success || !result.data) {
      return next(new AppError(result.error || "Failed to complete match", 400));
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
}
