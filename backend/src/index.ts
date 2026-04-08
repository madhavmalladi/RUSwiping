import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/error-handler.js";
import authRoutes from "./routes/auth.routes.js";
import diningHallRoutes from "./routes/dining-hall.routes.js";
import swipeRoutes from "./routes/swipe.routes.js";
import matchRoutes from "./routes/match.routes.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timeStamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/dining-halls", diningHallRoutes);
app.use("/api/swipes", swipeRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/users", userRoutes);
app.use(errorHandler);

// Export app for testing
export { app };

// Only start server if this file is run directly (not imported for testing)
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
