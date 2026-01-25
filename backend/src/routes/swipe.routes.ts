import { Router } from "express";
import {
  createOffer,
  getOffers,
  getMyActiveOffer,
  cancelOffer,
  createRequest,
  getRequests,
  getMyActiveRequest,
  cancelRequest,
} from "../controllers/swipe.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

// ---------------------------- Swipe Offer Routes ------------------------------

// POST /api/swipes/offers
// Body: { diningHallId, availableFrom, availableUntil }
router.post("/offers", createOffer);

// GET /api/swipes/offers/:diningHallId
router.get("/offers/:diningHallId", getOffers);

// GET /api/swipes/offers/my/active
router.get("/offers/my/active", getMyActiveOffer);

// DELETE /api/swipes/offers/:offerId
router.delete("/offers/:offerId", cancelOffer);

// ---------------------------- Swipe Request Routes ------------------------------

// POST /api/swipes/requests
// Body: { diningHallId, requestedAt }
router.post("/requests", createRequest);

// GET /api/swipes/requests/:diningHallId
router.get("/requests/:diningHallId", getRequests);

// GET /api/swipes/requests/my/active
router.get("/requests/my/active", getMyActiveRequest);

// DELETE /api/swipes/requests/:requestId
router.delete("/requests/:requestId", cancelRequest);

export default router;
