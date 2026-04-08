import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { mockUsers, mockDiningHalls, mockOffers, mockRequests } from "../setup.js";

// Mock the supabase module
const mockFrom = jest.fn<any>();
jest.unstable_mockModule("../../config/supabase.js", () => ({
  default: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Import after mocks - must use dynamic import with unstable_mockModule
const swipeService = await import("../../services/swipe.service.js");

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

describe("Swipe Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Swipe Offers", () => {
    describe("createSwipeOffer", () => {
      it("should create a new offer when user has no active offer", async () => {
        // First call checks for existing active offer (returns null)
        const existingOfferQuery = createMockQuery(null);
        // Second call creates the new offer
        const createOfferQuery = createMockQuery(mockOffers.active);

        let callCount = 0;
        mockFrom.mockImplementation(() => {
          callCount++;
          if (callCount === 1) return existingOfferQuery;
          return createOfferQuery;
        });

        const result = await swipeService.createSwipeOffer(
          mockUsers.giver.id,
          mockDiningHalls.brower.id,
          new Date().toISOString(),
          new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it("should reject if user already has an active offer", async () => {
        const existingOfferQuery = createMockQuery(mockOffers.active);
        mockFrom.mockReturnValue(existingOfferQuery);

        const result = await swipeService.createSwipeOffer(
          mockUsers.giver.id,
          mockDiningHalls.brower.id,
          new Date().toISOString(),
          new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("already have an active swipe offer");
      });

      it("should handle database errors gracefully", async () => {
        const existingOfferQuery = createMockQuery(null);
        const errorQuery = createMockQuery(null, { message: "Database error" });

        let callCount = 0;
        mockFrom.mockImplementation(() => {
          callCount++;
          if (callCount === 1) return existingOfferQuery;
          return errorQuery;
        });

        const result = await swipeService.createSwipeOffer(
          mockUsers.giver.id,
          mockDiningHalls.brower.id,
          new Date().toISOString(),
          new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe("Database error");
      });
    });

    describe("getActiveSwipeOffers", () => {
      it("should return active offers for a dining hall", async () => {
        const offersQuery = createMockQuery([mockOffers.active]);
        offersQuery.order = jest.fn<any>().mockResolvedValue({
          data: [mockOffers.active],
          error: null,
        } as any);

        mockFrom.mockReturnValue(offersQuery);

        const result = await swipeService.getActiveSwipeOffers(mockDiningHalls.brower.id);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });

      it("should return empty array when no active offers exist", async () => {
        const offersQuery = createMockQuery([]);
        offersQuery.order = jest.fn<any>().mockResolvedValue({
          data: [],
          error: null,
        } as any);

        mockFrom.mockReturnValue(offersQuery);

        const result = await swipeService.getActiveSwipeOffers(mockDiningHalls.brower.id);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(0);
      });
    });

    describe("getUserActiveOffer", () => {
      it("should return user's active offer if exists", async () => {
        const offerQuery = createMockQuery(mockOffers.active);
        mockFrom.mockReturnValue(offerQuery);

        const result = await swipeService.getUserActiveOffer(mockUsers.giver.id);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(mockOffers.active.id);
      });

      it("should return null if user has no active offer", async () => {
        const offerQuery = createMockQuery(null);
        mockFrom.mockReturnValue(offerQuery);

        const result = await swipeService.getUserActiveOffer(mockUsers.giver.id);

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe("cancelSwipeOffer", () => {
      it("should cancel an active offer", async () => {
        const cancelledOffer = { ...mockOffers.active, is_active: false };
        const cancelQuery = createMockQuery(cancelledOffer);
        mockFrom.mockReturnValue(cancelQuery);

        const result = await swipeService.cancelSwipeOffer(mockOffers.active.id, mockUsers.giver.id);

        expect(result.success).toBe(true);
        expect(result.data?.is_active).toBe(false);
      });

      it("should fail if offer doesn't belong to user", async () => {
        const cancelQuery = createMockQuery(null, { message: "Not found" });
        mockFrom.mockReturnValue(cancelQuery);

        const result = await swipeService.cancelSwipeOffer(mockOffers.active.id, "different-user-id");

        expect(result.success).toBe(false);
      });
    });
  });

  describe("Swipe Requests", () => {
    describe("createSwipeRequest", () => {
      it("should create a new request when user has no active request", async () => {
        const existingRequestQuery = createMockQuery(null);
        const createRequestQuery = createMockQuery(mockRequests.active);

        let callCount = 0;
        mockFrom.mockImplementation(() => {
          callCount++;
          if (callCount === 1) return existingRequestQuery;
          return createRequestQuery;
        });

        const result = await swipeService.createSwipeRequest(
          mockUsers.receiver.id,
          mockDiningHalls.brower.id,
          new Date().toISOString()
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it("should reject if user already has an active request", async () => {
        const existingRequestQuery = createMockQuery(mockRequests.active);
        mockFrom.mockReturnValue(existingRequestQuery);

        const result = await swipeService.createSwipeRequest(
          mockUsers.receiver.id,
          mockDiningHalls.brower.id,
          new Date().toISOString()
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("already have an active swipe request");
      });
    });

    describe("getActiveSwipeRequests", () => {
      it("should return active requests for a dining hall", async () => {
        const requestsQuery = createMockQuery([mockRequests.active]);
        requestsQuery.order = jest.fn<any>().mockResolvedValue({
          data: [mockRequests.active],
          error: null,
        } as any);

        mockFrom.mockReturnValue(requestsQuery);

        const result = await swipeService.getActiveSwipeRequests(mockDiningHalls.brower.id);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });
    });

    describe("getUserActiveRequest", () => {
      it("should return user's active request if exists", async () => {
        const requestQuery = createMockQuery(mockRequests.active);
        mockFrom.mockReturnValue(requestQuery);

        const result = await swipeService.getUserActiveRequest(mockUsers.receiver.id);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(mockRequests.active.id);
      });

      it("should return null if user has no active request", async () => {
        const requestQuery = createMockQuery(null);
        mockFrom.mockReturnValue(requestQuery);

        const result = await swipeService.getUserActiveRequest(mockUsers.receiver.id);

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe("cancelSwipeRequest", () => {
      it("should cancel an active request", async () => {
        const cancelledRequest = { ...mockRequests.active, is_active: false };
        const cancelQuery = createMockQuery(cancelledRequest);
        mockFrom.mockReturnValue(cancelQuery);

        const result = await swipeService.cancelSwipeRequest(mockRequests.active.id, mockUsers.receiver.id);

        expect(result.success).toBe(true);
        expect(result.data?.is_active).toBe(false);
      });

      it("should fail if request doesn't belong to user", async () => {
        const cancelQuery = createMockQuery(null, { message: "Not found" });
        mockFrom.mockReturnValue(cancelQuery);

        const result = await swipeService.cancelSwipeRequest(mockRequests.active.id, "different-user-id");

        expect(result.success).toBe(false);
      });
    });
  });
});
