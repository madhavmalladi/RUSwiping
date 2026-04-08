import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { mockUsers, mockMatches, mockMessages } from "../setup.js";

// Mock the supabase module
const mockFrom = jest.fn<any>();
jest.unstable_mockModule("../../config/supabase.js", () => ({
  default: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock notification service
const mockNotifyNewMessage = jest.fn<any>().mockResolvedValue({ success: true } as any);
jest.unstable_mockModule("../../services/notification.service.js", () => ({
  notifyNewMessage: mockNotifyNewMessage,
}));

// Import after mocks - must use dynamic import with unstable_mockModule
const messageService = await import("../../services/message.service.js");

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

describe("Message Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendMessage", () => {
    it("should send a message successfully when user is part of the match", async () => {
      const matchQuery = createMockQuery(mockMatches.active);
      const messageInsertQuery = createMockQuery(mockMessages.first);

      let callCount = 0;
      mockFrom.mockImplementation((table: unknown) => {
        callCount++;
        if (table === "matches") return matchQuery;
        if (table === "messages") return messageInsertQuery;
        return createMockQuery(null);
      });

      const result = await messageService.sendMessage(mockMatches.active.id, mockUsers.giver.id, "Hello!");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockNotifyNewMessage).toHaveBeenCalled();
    });

    it("should fail if user is not part of the match", async () => {
      const matchQuery = createMockQuery(null, { message: "Not found" });
      mockFrom.mockReturnValue(matchQuery);

      const result = await messageService.sendMessage(mockMatches.active.id, "unauthorized-user", "Hello!");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Match not found");
    });

    it("should fail if match is completed", async () => {
      const completedMatchQuery = createMockQuery(mockMatches.completed);
      mockFrom.mockReturnValue(completedMatchQuery);

      const result = await messageService.sendMessage(mockMatches.completed.id, mockUsers.giver.id, "Hello!");

      expect(result.success).toBe(false);
      expect(result.error).toContain("completed match");
    });

    it("should notify the other user when giver sends a message", async () => {
      const matchQuery = createMockQuery(mockMatches.active);
      const messageInsertQuery = createMockQuery(mockMessages.first);

      mockFrom.mockImplementation((table: unknown) => {
        if (table === "matches") return matchQuery;
        if (table === "messages") return messageInsertQuery;
        return createMockQuery(null);
      });

      await messageService.sendMessage(mockMatches.active.id, mockUsers.giver.id, "I'm at Brower!");

      // Should notify the receiver (the other user)
      expect(mockNotifyNewMessage).toHaveBeenCalledWith(
        mockUsers.receiver.id,
        expect.any(String),
        "I'm at Brower!",
        mockMatches.active.id
      );
    });

    it("should notify the other user when receiver sends a message", async () => {
      const matchQuery = createMockQuery(mockMatches.active);
      const messageInsertQuery = createMockQuery(mockMessages.second);

      mockFrom.mockImplementation((table: unknown) => {
        if (table === "matches") return matchQuery;
        if (table === "messages") return messageInsertQuery;
        return createMockQuery(null);
      });

      await messageService.sendMessage(mockMatches.active.id, mockUsers.receiver.id, "On my way!");

      // Should notify the giver (the other user)
      expect(mockNotifyNewMessage).toHaveBeenCalledWith(
        mockUsers.giver.id,
        expect.any(String),
        "On my way!",
        mockMatches.active.id
      );
    });
  });

  describe("getMessages", () => {
    it("should return messages for a valid match", async () => {
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

      const result = await messageService.getMessages(mockMatches.active.id, mockUsers.giver.id);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it("should fail if user is not part of the match", async () => {
      const matchQuery = createMockQuery(null, { message: "Not found" });
      mockFrom.mockReturnValue(matchQuery);

      const result = await messageService.getMessages(mockMatches.active.id, "unauthorized-user");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Match not found");
    });

    it("should support pagination with limit and offset", async () => {
      const matchQuery = createMockQuery({ id: mockMatches.active.id });
      const messagesQuery = createMockQuery([mockMessages.first]);
      messagesQuery.range = jest.fn<any>().mockResolvedValue({
        data: [mockMessages.first],
        error: null,
      } as any);

      mockFrom.mockImplementation((table: unknown) => {
        if (table === "matches") return matchQuery;
        if (table === "messages") return messagesQuery;
        return createMockQuery(null);
      });

      const result = await messageService.getMessages(
        mockMatches.active.id,
        mockUsers.giver.id,
        10, // limit
        0 // offset
      );

      expect(result.success).toBe(true);
      expect(messagesQuery.range).toHaveBeenCalledWith(0, 9);
    });
  });

  describe("getLatestMessage", () => {
    it("should return the most recent message", async () => {
      const matchQuery = createMockQuery({ id: mockMatches.active.id });
      const latestMessageQuery = createMockQuery(mockMessages.second);

      mockFrom.mockImplementation((table: unknown) => {
        if (table === "matches") return matchQuery;
        if (table === "messages") return latestMessageQuery;
        return createMockQuery(null);
      });

      const result = await messageService.getLatestMessage(mockMatches.active.id, mockUsers.giver.id);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(mockMessages.second.id);
    });

    it("should return null if no messages exist", async () => {
      const matchQuery = createMockQuery({ id: mockMatches.active.id });
      const noMessagesQuery = createMockQuery(null);

      mockFrom.mockImplementation((table: unknown) => {
        if (table === "matches") return matchQuery;
        if (table === "messages") return noMessagesQuery;
        return createMockQuery(null);
      });

      const result = await messageService.getLatestMessage(mockMatches.active.id, mockUsers.giver.id);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should fail if user is not part of the match", async () => {
      const matchQuery = createMockQuery(null, { message: "Not found" });
      mockFrom.mockReturnValue(matchQuery);

      const result = await messageService.getLatestMessage(mockMatches.active.id, "unauthorized-user");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Match not found");
    });
  });
});
