import type { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  console.error("Error", err);

  let statusCode = 500;
  let message = "Internal server error";

  if (err instanceof AppError) {
    // custom errors
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === "JsonWebTokenError") {
    // the JWT verification failed
    statusCode = 401;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    // JWT token expired
    statusCode = 401;
    message = "Token expired";
  }

  // Sending JSON response
  res.status(statusCode).json({
    success: false,
    error: message,
  });
};
