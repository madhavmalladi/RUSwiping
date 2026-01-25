import { Router } from "express";
import { getDiningHalls, getDiningHall } from "../controllers/dining-hall.controller.js";

const router = Router();

// GET /api/dining-halls
router.get("/", getDiningHalls);

// GET /api/dining-halls/:id
router.get("/:id", getDiningHall);

export default router;
