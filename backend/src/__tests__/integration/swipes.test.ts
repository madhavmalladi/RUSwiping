import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import { mockUsers, mockDiningHalls, mockOffers, mockRequests } from "../setup.js";

// Set test environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

// Mock Supabase
const mockFrom = jest.fn<any>();
jest.mock("../../config/supabase.js", () => ({
  default: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock Google Auth
jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn<any>(),
  })),
}));

// Import app after mocks
import { app } from "../../index.js";

// Helper to create a valid JWT token for testing
function createTestToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, "test-jwt-secret", { expiresIn: "1h" });
}

// Helper to create mock query
function createMockQuery(returnData: any, returnError: any = null) {
  return {
    select: jest.fn<any>().mockReturnThis(),
    insert: jest.fn<any>().mockReturnThis(),
    update: jest.fn<any>().mockReturnThis(),
    delete: jest.fn<any>().mockReturnThis(),
    eq: jest.fn<any>().mockReturnThis(),
    neq: jest.fn<any>().mockReturnThis(),
    or: jest.fn<any>().mockReturnThis(),
    gte: jest.fn<any>().mockReturnThis(),
    order: jest.fn<any>().mockReturnThis(),
    single: jest.fn<any>().mockResolvedValue({ data: returnData, error: returnError } as any),
    maybeSingle: jest.fn<any>().mockResolvedValue({ data: returnData, error: returnError } as any),
  };
}

describe("Swipes Integration Tests", () => {
  let authToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = createTestToken(mockUsers.giver.id, mockUsers.giver.email);
  });

  describe("POST /api/swipes/offers", () => {
    it("should return 401 if no auth token", async () => {
      const response = await request(app)
        .post("/api/swipes/offers")
        .send({
          diningHallId: mockDiningHalls.brower.id,
          availableFrom: new Date().toISOString(),
          availableUntil: new Date(Date.now() + 3600000).toISOString(),
        });

      expect(response.status).toBe(401);
    });

    it("should return 400 if diningHallId is missing", async () => {
      const response = await request(app)
        .post("/api/swipes/offers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          availableFrom: new Date().toISOString(),
          availableUntil: new Date(Date.now() + 3600000).toISOString(),
        });

      expect(response.status).toBe(400);
    });

    it("should create an offer when user has no active offer", async () => {
      const existingOfferQuery = createMockQuery(null);
      const createOfferQuery = createMockQuery(mockOffers.active);

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return existingOfferQuery;
        return createOfferQuery;
      });

      const response = await request(app)
        .post("/api/swipes/offers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          diningHallId: mockDiningHalls.brower.id,
          availableFrom: new Date().toISOString(),
          availableUntil: new Date(Date.now() + 3600000).toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.offer).toBeDefined();
    });
  });

  describe("POST /api/swipes/requests", () => {
    it("should return 401 if no auth token", async () => {
      const response = await request(app)
        .post("/api/swipes/requests")
        .send({
          diningHallId: mockDiningHalls.brower.id,
        });

      expect(response.status).toBe(401);
    });

    it("should return 400 if diningHallId is missing", async () => {
      const response = await request(app)
        .post("/api/swipes/requests")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it("should create a request when user has no active request", async () => {
      const existingRequestQuery = createMockQuery(null);
      const createRequestQuery = createMockQuery(mockRequests.active);

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return existingRequestQuery;
        return createRequestQuery;
      });

      const response = await request(app)
        .post("/api/swipes/requests")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          diningHallId: mockDiningHalls.brower.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.request).toBeDefined();
    });
  });

  describe("GET /api/swipes/offers/my/active", () => {
    it("should return 401 if no auth token", async () => {
      const response = await request(app).get("/api/swipes/offers/my/active");

      expect(response.status).toBe(401);
    });

    it("should return user's active offer", async () => {
      const offerQuery = createMockQuery(mockOffers.active);
      mockFrom.mockReturnValue(offerQuery);

      const response = await request(app)
        .get("/api/swipes/offers/my/active")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/swipes/requests/my/active", () => {
    it("should return 401 if no auth token", async () => {
      const response = await request(app).get("/api/swipes/requests/my/active");

      expect(response.status).toBe(401);
    });

    it("should return user's active request", async () => {
      const requestQuery = createMockQuery(mockRequests.active);
      mockFrom.mockReturnValue(requestQuery);

      const response = await request(app)
        .get("/api/swipes/requests/my/active")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/swipes/offers/:offerId", () => {
    it("should return 401 if no auth token", async () => {
      const response = await request(app).delete(`/api/swipes/offers/${mockOffers.active.id}`);

      expect(response.status).toBe(401);
    });

    it("should cancel user's offer", async () => {
      const cancelledOffer = { ...mockOffers.active, is_active: false };
      const cancelQuery = createMockQuery(cancelledOffer);
      mockFrom.mockReturnValue(cancelQuery);

      const response = await request(app)
        .delete(`/api/swipes/offers/${mockOffers.active.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.offer.is_active).toBe(false);
    });
  });

  describe("DELETE /api/swipes/requests/:requestId", () => {
    it("should return 401 if no auth token", async () => {
      const response = await request(app).delete(`/api/swipes/requests/${mockRequests.active.id}`);

      expect(response.status).toBe(401);
    });

    it("should cancel user's request", async () => {
      const cancelledRequest = { ...mockRequests.active, is_active: false };
      const cancelQuery = createMockQuery(cancelledRequest);
      mockFrom.mockReturnValue(cancelQuery);

      const response = await request(app)
        .delete(`/api/swipes/requests/${mockRequests.active.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.request.is_active).toBe(false);
    });
  });
});
