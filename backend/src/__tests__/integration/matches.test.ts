import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import { mockUsers, mockMatches, mockMessages } from "../setup.js";

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

// Mock notification service
jest.mock("../../services/notification.service.js", () => ({
  notifyMatchCreated: jest.fn<any>().mockResolvedValue({ success: true } as any),
  notifyNewMessage: jest.fn<any>().mockResolvedValue({ success: true } as any),
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
    limit: jest.fn<any>().mockReturnThis(),
    range: jest.fn<any>().mockReturnThis(),
    single: jest.fn<any>().mockResolvedValue({ data: returnData, error: returnError } as any),
    maybeSingle: jest.fn<any>().mockResolvedValue({ data: returnData, error: returnError } as any),
  };
}

describe("Matches Integration Tests", () => {
  let giverToken: string;
  let receiverToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    giverToken = createTestToken(mockUsers.giver.id, mockUsers.giver.email);
    receiverToken = createTestToken(mockUsers.receiver.id, mockUsers.receiver.email);
  });

  describe("GET /api/matches", () => {
    it("should return 401 if no auth token", async () => {
      const response = await request(app).get("/api/matches");

      expect(response.status).toBe(401);
    });

    it("should return user matches", async () => {
      const matchesQuery = createMockQuery([mockMatches.active, mockMatches.completed]);
      matchesQuery.order = jest.fn<any>().mockResolvedValue({
        data: [mockMatches.active, mockMatches.completed],
        error: null,
      } as any);

      mockFrom.mockReturnValue(matchesQuery);

      const response = await request(app)
        .get("/api/matches")
        .set("Authorization", `Bearer ${giverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.matches).toBeDefined();
    });
  });

  describe("GET /api/matches/active", () => {
    it("should return 401 if no auth token", async () => {
      const response = await request(app).get("/api/matches/active");

      expect(response.status).toBe(401);
    });

    it("should return only active (incomplete) matches", async () => {
      const matchesQuery = createMockQuery([mockMatches.active]);
      matchesQuery.order = jest.fn<any>().mockResolvedValue({
        data: [mockMatches.active],
        error: null,
      } as any);

      mockFrom.mockReturnValue(matchesQuery);

      const response = await request(app)
        .get("/api/matches/active")
        .set("Authorization", `Bearer ${giverToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/matches/:matchId", () => {
    it("should return 401 if no auth token", async () => {
      const response = await request(app).get(`/api/matches/${mockMatches.active.id}`);

      expect(response.status).toBe(401);
    });

    it("should return match details for giver", async () => {
      const matchQuery = createMockQuery(mockMatches.active);
      mockFrom.mockReturnValue(matchQuery);

      const response = await request(app)
        .get(`/api/matches/${mockMatches.active.id}`)
        .set("Authorization", `Bearer ${giverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.match.id).toBe(mockMatches.active.id);
    });

    it("should return match details for receiver", async () => {
      const matchQuery = createMockQuery(mockMatches.active);
      mockFrom.mockReturnValue(matchQuery);

      const response = await request(app)
        .get(`/api/matches/${mockMatches.active.id}`)
        .set("Authorization", `Bearer ${receiverToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/matches/:matchId/complete", () => {
    it("should return 401 if no auth token", async () => {
      const response = await request(app).put(`/api/matches/${mockMatches.active.id}/complete`);

      expect(response.status).toBe(401);
    });

    it("should mark match as completed", async () => {
      const completedMatch = { ...mockMatches.active, is_completed: true };
      const matchQuery = createMockQuery(completedMatch);
      mockFrom.mockReturnValue(matchQuery);

      const response = await request(app)
        .put(`/api/matches/${mockMatches.active.id}/complete`)
        .set("Authorization", `Bearer ${giverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.match.is_completed).toBe(true);
    });
  });

  describe("Messages within matches", () => {
    describe("GET /api/matches/:matchId/messages", () => {
      it("should return 401 if no auth token", async () => {
        const response = await request(app).get(`/api/matches/${mockMatches.active.id}/messages`);

        expect(response.status).toBe(401);
      });

      it("should return messages for match participant", async () => {
        const matchQuery = createMockQuery({ id: mockMatches.active.id });
        const messagesQuery = createMockQuery([mockMessages.first, mockMessages.second]);
        messagesQuery.range = jest.fn<any>().mockResolvedValue({
          data: [mockMessages.first, mockMessages.second],
          error: null,
        } as any);

        mockFrom.mockImplementation((table: unknown) => {
          if (table === "matches") return matchQuery;
          if (table === "messages") return messagesQuery;
          return createMockQuery(null);
        });

        const response = await request(app)
          .get(`/api/matches/${mockMatches.active.id}/messages`)
          .set("Authorization", `Bearer ${giverToken}`);

        expect(response.status).toBe(200);
        expect(response.body.messages).toBeDefined();
      });
    });

    describe("POST /api/matches/:matchId/messages", () => {
      it("should return 401 if no auth token", async () => {
        const response = await request(app)
          .post(`/api/matches/${mockMatches.active.id}/messages`)
          .send({ text: "Hello!" });

        expect(response.status).toBe(401);
      });

      it("should return 400 if text is missing", async () => {
        const response = await request(app)
          .post(`/api/matches/${mockMatches.active.id}/messages`)
          .set("Authorization", `Bearer ${giverToken}`)
          .send({});

        expect(response.status).toBe(400);
      });

      it("should create a new message", async () => {
        const matchQuery = createMockQuery(mockMatches.active);
        const messageInsertQuery = createMockQuery(mockMessages.first);

        mockFrom.mockImplementation((table: unknown) => {
          if (table === "matches") return matchQuery;
          if (table === "messages") return messageInsertQuery;
          return createMockQuery(null);
        });

        const response = await request(app)
          .post(`/api/matches/${mockMatches.active.id}/messages`)
          .set("Authorization", `Bearer ${giverToken}`)
          .send({ text: "Hey, I'm at Brower!" });

        expect(response.status).toBe(201);
        expect(response.body.message).toBeDefined();
      });
    });

    describe("GET /api/matches/:matchId/messages/latest", () => {
      it("should return 401 if no auth token", async () => {
        const response = await request(app).get(
          `/api/matches/${mockMatches.active.id}/messages/latest`
        );

        expect(response.status).toBe(401);
      });

      it("should return the latest message", async () => {
        const matchQuery = createMockQuery({ id: mockMatches.active.id });
        const latestMessageQuery = createMockQuery(mockMessages.second);

        mockFrom.mockImplementation((table: unknown) => {
          if (table === "matches") return matchQuery;
          if (table === "messages") return latestMessageQuery;
          return createMockQuery(null);
        });

        const response = await request(app)
          .get(`/api/matches/${mockMatches.active.id}/messages/latest`)
          .set("Authorization", `Bearer ${giverToken}`);

        expect(response.status).toBe(200);
      });
    });
  });
});
