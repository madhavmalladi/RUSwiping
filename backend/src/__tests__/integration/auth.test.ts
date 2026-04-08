import { describe, it, expect, jest } from "@jest/globals";
import request from "supertest";

// Set test environment before importing app
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

// Mock Supabase
jest.mock("../../config/supabase.js", () => ({
  default: {
    from: jest.fn<any>().mockReturnValue({
      select: jest.fn<any>().mockReturnThis(),
      insert: jest.fn<any>().mockReturnThis(),
      update: jest.fn<any>().mockReturnThis(),
      eq: jest.fn<any>().mockReturnThis(),
      single: jest.fn<any>().mockResolvedValue({ data: null, error: null } as any),
      maybeSingle: jest.fn<any>().mockResolvedValue({ data: null, error: null } as any),
    }),
  },
}));

// Mock Google Auth
jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn<any>().mockResolvedValue({
      getPayload: () => ({
        sub: "google-123",
        email: "student@rutgers.edu",
        name: "Test Student",
        picture: "https://example.com/photo.jpg",
      }),
    }),
  })),
}));

// Import app after mocks
import { app } from "../../index.js";

describe("Auth Integration Tests", () => {
  describe("GET /health", () => {
    it("should return 200 and status ok", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.timeStamp).toBeDefined();
    });
  });

  describe("POST /api/auth/google", () => {
    it("should return 400 if idToken is missing", async () => {
      const response = await request(app)
        .post("/api/auth/google")
        .send({});

      expect(response.status).toBe(400);
    });

    it("should return 400 if idToken is empty string", async () => {
      const response = await request(app)
        .post("/api/auth/google")
        .send({ idToken: "" });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return 401 if no token provided", async () => {
      const response = await request(app).get("/api/auth/me");

      expect(response.status).toBe(401);
    });

    it("should return 401 if invalid token provided", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });
  });
});
