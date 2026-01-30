import { Router } from "express";
import {
  createMatchController,
  getPotentialMatchesForOffer,
  getPotentialMatchesForRequest,
  getMatches,
  getActiveMatchesController,
  getMatch,
  markMatchComplete,
} from "../controllers/match.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

// POST /api/matches
// Body: { offerId, requestId, diningHallId, giverId, receiverId }
router.post("/", createMatchController);

// GET /api/matches
router.get("/", getMatches);

// GET /api/matches/active
router.get("/active", getActiveMatchesController);

// GET /api/matches/potential/offer/:offerId
router.get("/potential/offer/:offerId", getPotentialMatchesForOffer);

// GET /api/matches/potential/request/:requestId
router.get("/potential/request/:requestId", getPotentialMatchesForRequest);

// GET /api/matches/:matchId
router.get("/:matchId", getMatch);

// PUT /api/matches/:matchId/complete
router.put("/:matchId/complete", markMatchComplete);

export default router;
