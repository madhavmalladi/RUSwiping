import { describe, it, expect, jest, beforeEach, afterAll } from "@jest/globals";
import jwt from "jsonwebtoken";
import { mockUsers } from "../setup.js";

// Store original env
const originalEnv = process.env;

// JWT secret must match .env.test
const TEST_JWT_SECRET = "test-jwt-secret-for-testing-only";

// Mock Google Auth Library
const mockVerifyIdToken = jest.fn<any>();
jest.unstable_mockModule("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

// Mock user service
const mockFindUserByGoogleId = jest.fn<any>();
const mockCreateUser = jest.fn<any>();
const mockUpdatePushToken = jest.fn<any>();
jest.unstable_mockModule("../../services/user.service.js", () => ({
  findUserByGoogleId: (...args: unknown[]) => mockFindUserByGoogleId(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  updatePushToken: (...args: unknown[]) => mockUpdatePushToken(...args),
}));

// Import after mocks - must use dynamic import with unstable_mockModule
const { verifyGoogleToken, generateJWT, verifyJWT, authenticateWithGoogle } = await import(
  "../../services/auth.service.js"
);

describe("Auth Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("verifyGoogleToken", () => {
    it("should verify a valid Google token with @rutgers.edu email", async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: "google-id-123",
          email: "student@rutgers.edu",
          name: "Test Student",
          picture: "https://example.com/photo.jpg",
        }),
      });

      const result = await verifyGoogleToken("valid-google-token");

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe("student@rutgers.edu");
      expect(result.data?.googleId).toBe("google-id-123");
    });

    it("should reject non-Rutgers email addresses", async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: "google-id-123",
          email: "student@gmail.com",
          name: "Test Student",
        }),
      });

      const result = await verifyGoogleToken("valid-google-token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("rutgers.edu");
    });

    it("should reject token with missing email", async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: "google-id-123",
          name: "Test Student",
        }),
      });

      const result = await verifyGoogleToken("valid-google-token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing required user information");
    });

    it("should reject invalid token payload", async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => null,
      });

      const result = await verifyGoogleToken("invalid-token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid token payload");
    });

    it("should handle token verification errors", async () => {
      mockVerifyIdToken.mockRejectedValue(new Error("Token expired"));

      const result = await verifyGoogleToken("expired-token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Token expired");
    });
  });

  describe("generateJWT", () => {
    it("should generate a valid JWT token", () => {
      const token = generateJWT(mockUsers.giver as any);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      // Verify the token can be decoded
      const decoded = jwt.verify(token, TEST_JWT_SECRET) as any;
      expect(decoded.userId).toBe(mockUsers.giver.id);
      expect(decoded.email).toBe(mockUsers.giver.email);
    });

    it("should include expiration in the token", () => {
      const token = generateJWT(mockUsers.giver as any);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });

  describe("verifyJWT", () => {
    it("should verify a valid JWT token", () => {
      const token = jwt.sign({ userId: "user-123", email: "test@rutgers.edu" }, TEST_JWT_SECRET, { expiresIn: "1h" });

      const result = verifyJWT(token);

      expect(result.success).toBe(true);
      expect(result.data?.userId).toBe("user-123");
      expect(result.data?.email).toBe("test@rutgers.edu");
    });

    it("should reject expired tokens", () => {
      const token = jwt.sign(
        { userId: "user-123", email: "test@rutgers.edu" },
        TEST_JWT_SECRET,
        { expiresIn: "-1h" } // Already expired
      );

      const result = verifyJWT(token);

      expect(result.success).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("should reject tokens with invalid signature", () => {
      const token = jwt.sign({ userId: "user-123", email: "test@rutgers.edu" }, "wrong-secret", { expiresIn: "1h" });

      const result = verifyJWT(token);

      expect(result.success).toBe(false);
    });

    it("should reject malformed tokens", () => {
      const result = verifyJWT("not-a-valid-jwt");

      expect(result.success).toBe(false);
    });
  });

  describe("authenticateWithGoogle", () => {
    beforeEach(() => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: mockUsers.giver.google_id,
          email: mockUsers.giver.email,
          name: mockUsers.giver.display_name,
          picture: mockUsers.giver.photo_url,
        }),
      });
    });

    it("should authenticate existing user and return JWT", async () => {
      mockFindUserByGoogleId.mockResolvedValue({
        success: true,
        data: mockUsers.giver,
      });

      const result = await authenticateWithGoogle("valid-google-token");

      expect(result.success).toBe(true);
      expect(result.data?.token).toBeDefined();
      expect(result.data?.user.id).toBe(mockUsers.giver.id);
    });

    it("should create new user if not exists", async () => {
      mockFindUserByGoogleId.mockResolvedValue({
        success: true,
        data: null,
      });
      mockCreateUser.mockResolvedValue({
        success: true,
        data: mockUsers.giver,
      });

      const result = await authenticateWithGoogle("valid-google-token");

      expect(result.success).toBe(true);
      expect(mockCreateUser).toHaveBeenCalled();
      expect(result.data?.user.id).toBe(mockUsers.giver.id);
    });

    it("should update push token for existing user if provided", async () => {
      const userWithoutToken = { ...mockUsers.giver, expo_push_token: null };
      const userWithToken = { ...mockUsers.giver, expo_push_token: "new-token" };

      mockFindUserByGoogleId.mockResolvedValue({
        success: true,
        data: userWithoutToken,
      });
      mockUpdatePushToken.mockResolvedValue({
        success: true,
        data: userWithToken,
      });

      const result = await authenticateWithGoogle("valid-google-token", "new-token");

      expect(result.success).toBe(true);
      expect(mockUpdatePushToken).toHaveBeenCalledWith(mockUsers.giver.id, "new-token");
    });

    it("should fail if Google token verification fails", async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          sub: "google-id",
          email: "user@gmail.com", // Non-Rutgers email
          name: "Test User",
        }),
      });

      const result = await authenticateWithGoogle("valid-google-token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("rutgers.edu");
    });

    it("should fail if user lookup fails", async () => {
      mockFindUserByGoogleId.mockResolvedValue({
        success: false,
        error: "Database error",
      });

      const result = await authenticateWithGoogle("valid-google-token");

      expect(result.success).toBe(false);
    });

    it("should fail if user creation fails", async () => {
      mockFindUserByGoogleId.mockResolvedValue({
        success: true,
        data: null,
      });
      mockCreateUser.mockResolvedValue({
        success: false,
        error: "Failed to create user",
      });

      const result = await authenticateWithGoogle("valid-google-token");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create user");
    });
  });
});
