import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { mockUsers, mockDiningHalls, mockOffers, mockRequests, mockMatches } from "../setup.js";

// Mock the supabase module
const mockFrom = jest.fn<any>();
jest.unstable_mockModule("../../config/supabase.js", () => ({
  default: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock notification service
const mockNotifyMatchCreated = jest.fn<any>().mockResolvedValue({ success: true } as any);
jest.unstable_mockModule("../../services/notification.service.js", () => ({
  notifyMatchCreated: mockNotifyMatchCreated,
}));

// Import after mocks are set up - must use dynamic import with unstable_mockModule
const matchingService = await import("../../services/matching.service.js");

// Helper to create a mock Supabase query builder
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
    lte: jest.fn<any>().mockReturnThis(),
    order: jest.fn<any>().mockReturnThis(),
    limit: jest.fn<any>().mockReturnThis(),
    range: jest.fn<any>().mockReturnThis(),
    single: jest.fn<any>().mockResolvedValue({ data: returnData, error: returnError } as any),
    maybeSingle: jest.fn<any>().mockResolvedValue({ data: returnData, error: returnError } as any),
  };
}

describe("Matching Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createMatch", () => {
    it("should create a match successfully when offer and request are valid", async () => {
      // Setup mock chain for offer lookup
      const offerQuery = createMockQuery(mockOffers.active);
      const requestQuery = createMockQuery(mockRequests.active);
      const matchInsertQuery = createMockQuery(mockMatches.active);
      const updateQuery = createMockQuery(null);

      let offerCallCount = 0;
      let requestCallCount = 0;
      mockFrom.mockImplementation((table: unknown) => {
        if (table === "swipe_offers") {
          if (offerCallCount === 0) {
            offerCallCount++;
            return offerQuery;
          }
          return updateQuery;
        }
        if (table === "swipe_requests") {
          if (requestCallCount === 0) {
            requestCallCount++;
            return requestQuery;
          }
          return updateQuery;
        }
        if (table === "matches") {
          return matchInsertQuery;
        }
        return createMockQuery(null);
      });

      const result = await matchingService.createMatch(
        mockUsers.giver.id,
        mockUsers.receiver.id,
        mockDiningHalls.brower.id,
        mockOffers.active.id,
        mockRequests.active.id
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockNotifyMatchCreated).toHaveBeenCalled();
    });

    it("should reject match when offer is not found", async () => {
      const offerQuery = createMockQuery(null, { message: "Not found" });
      mockFrom.mockReturnValue(offerQuery);

      const result = await matchingService.createMatch(
        mockUsers.giver.id,
        mockUsers.receiver.id,
        mockDiningHalls.brower.id,
        "non-existent-offer",
        mockRequests.active.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Offer not found");
    });

    it("should reject match when request is not found", async () => {
      const offerQuery = createMockQuery(mockOffers.active);
      const requestQuery = createMockQuery(null, { message: "Not found" });

      mockFrom.mockImplementation((table: unknown) => {
        if (table === "swipe_offers") {
          return offerQuery;
        }
        if (table === "swipe_requests") {
          return requestQuery;
        }
        return createMockQuery(null);
      });

      const result = await matchingService.createMatch(
        mockUsers.giver.id,
        mockUsers.receiver.id,
        mockDiningHalls.brower.id,
        mockOffers.active.id,
        "non-existent-request"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Request not found");
    });

    it("should reject match when dining halls don't match", async () => {
      const offerQuery = createMockQuery(mockOffers.active);
      const requestQuery = createMockQuery(mockRequests.differentDiningHall);

      mockFrom.mockImplementation((table: unknown) => {
        if (table === "swipe_offers") return offerQuery;
        if (table === "swipe_requests") return requestQuery;
        return createMockQuery(null);
      });

      const result = await matchingService.createMatch(
        mockUsers.giver.id,
        mockUsers.receiver.id,
        mockDiningHalls.brower.id,
        mockOffers.active.id,
        mockRequests.differentDiningHall.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("different dining halls");
    });

    it("should reject self-matching", async () => {
      const selfOffer = { ...mockOffers.active, user_id: mockUsers.giver.id };
      const selfRequest = {
        ...mockRequests.active,
        user_id: mockUsers.giver.id,
        dining_hall_id: mockDiningHalls.brower.id,
      };

      const offerQuery = createMockQuery(selfOffer);
      const requestQuery = createMockQuery(selfRequest);

      mockFrom.mockImplementation((table: unknown) => {
        if (table === "swipe_offers") return offerQuery;
        if (table === "swipe_requests") return requestQuery;
        return createMockQuery(null);
      });

      const result = await matchingService.createMatch(
        mockUsers.giver.id,
        mockUsers.giver.id, // Same user as giver and receiver
        mockDiningHalls.brower.id,
        mockOffers.active.id,
        mockRequests.active.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot match with yourself");
    });
  });

  describe("findPotentialMatchesForOffer", () => {
    it("should return active requests at the same dining hall", async () => {
      const offerQuery = createMockQuery(mockOffers.active);
      const requestsQuery = createMockQuery([mockRequests.active]);
      // Override order to resolve the array directly
      requestsQuery.order = jest.fn<any>().mockResolvedValue({
        data: [mockRequests.active],
        error: null,
      } as any);

      mockFrom.mockImplementation((table: unknown) => {
        if (table === "swipe_offers") return offerQuery;
        if (table === "swipe_requests") return requestsQuery;
        return createMockQuery(null);
      });

      const result = await matchingService.findPotentialMatchesForOffer(mockOffers.active.id, mockUsers.giver.id);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should return error when offer is not found", async () => {
      const offerQuery = createMockQuery(null, { message: "Not found" });
      mockFrom.mockReturnValue(offerQuery);

      const result = await matchingService.findPotentialMatchesForOffer("non-existent-offer", mockUsers.giver.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Offer not found");
    });
  });

  describe("findPotentialMatchesForRequest", () => {
    it("should return active offers at the same dining hall", async () => {
      const requestQuery = createMockQuery(mockRequests.active);
      const offersQuery = createMockQuery([mockOffers.active]);
      offersQuery.order = jest.fn<any>().mockResolvedValue({
        data: [mockOffers.active],
        error: null,
      } as any);

      mockFrom.mockImplementation((table: unknown) => {
        if (table === "swipe_requests") return requestQuery;
        if (table === "swipe_offers") return offersQuery;
        return createMockQuery(null);
      });

      const result = await matchingService.findPotentialMatchesForRequest(
        mockRequests.active.id,
        mockUsers.receiver.id
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should return error when request is not found", async () => {
      const requestQuery = createMockQuery(null, { message: "Not found" });
      mockFrom.mockReturnValue(requestQuery);

      const result = await matchingService.findPotentialMatchesForRequest(
        "non-existent-request",
        mockUsers.receiver.id
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Request not found");
    });
  });

  describe("getUserMatches", () => {
    it("should return all matches for a user", async () => {
      const matchesQuery = createMockQuery([mockMatches.active, mockMatches.completed]);
      matchesQuery.order = jest.fn<any>().mockResolvedValue({
        data: [mockMatches.active, mockMatches.completed],
        error: null,
      } as any);

      mockFrom.mockReturnValue(matchesQuery);

      const result = await matchingService.getUserMatches(mockUsers.giver.id);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it("should return empty array when user has no matches", async () => {
      const matchesQuery = createMockQuery([]);
      matchesQuery.order = jest.fn<any>().mockResolvedValue({
        data: [],
        error: null,
      } as any);

      mockFrom.mockReturnValue(matchesQuery);

      const result = await matchingService.getUserMatches("user-with-no-matches");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe("getMatchById", () => {
    it("should return match when user is the giver", async () => {
      const matchQuery = createMockQuery(mockMatches.active);
      mockFrom.mockReturnValue(matchQuery);

      const result = await matchingService.getMatchById(mockMatches.active.id, mockUsers.giver.id);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(mockMatches.active.id);
    });

    it("should return match when user is the receiver", async () => {
      const matchQuery = createMockQuery(mockMatches.active);
      mockFrom.mockReturnValue(matchQuery);

      const result = await matchingService.getMatchById(mockMatches.active.id, mockUsers.receiver.id);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(mockMatches.active.id);
    });

    it("should return error when match is not found", async () => {
      const matchQuery = createMockQuery(null, { message: "Not found" });
      mockFrom.mockReturnValue(matchQuery);

      const result = await matchingService.getMatchById("non-existent-match", mockUsers.giver.id);

      expect(result.success).toBe(false);
    });
  });

  describe("completeMatch", () => {
    it("should mark match as completed", async () => {
      const completedMatch = { ...mockMatches.active, is_completed: true };
      const matchQuery = createMockQuery(completedMatch);
      mockFrom.mockReturnValue(matchQuery);

      const result = await matchingService.completeMatch(mockMatches.active.id, mockUsers.giver.id);

      expect(result.success).toBe(true);
      expect(result.data?.is_completed).toBe(true);
    });

    it("should return error when user doesn't have permission", async () => {
      const matchQuery = createMockQuery(null, { message: "Not found" });
      mockFrom.mockReturnValue(matchQuery);

      const result = await matchingService.completeMatch(mockMatches.active.id, "unauthorized-user");

      expect(result.success).toBe(false);
    });
  });

  describe("getActiveMatches", () => {
    it("should return only incomplete matches", async () => {
      const matchesQuery = createMockQuery([mockMatches.active]);
      matchesQuery.order = jest.fn<any>().mockResolvedValue({
        data: [mockMatches.active],
        error: null,
      } as any);

      mockFrom.mockReturnValue(matchesQuery);

      const result = await matchingService.getActiveMatches(mockUsers.giver.id);

      expect(result.success).toBe(true);
      expect(result.data?.every((m) => !m.is_completed)).toBe(true);
    });
  });
});
