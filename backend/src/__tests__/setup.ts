import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Set test environment variables if not present
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-testing";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-client-id";

// Mock data for tests
export const mockUsers = {
  giver: {
    id: "user-giver-123",
    google_id: "google-giver-123",
    email: "giver@rutgers.edu",
    display_name: "Test Giver",
    photo_url: null,
    expo_push_token: "ExponentPushToken[xxxxxx]",
    created_at: new Date().toISOString(),
    last_online: new Date().toISOString(),
  },
  receiver: {
    id: "user-receiver-456",
    google_id: "google-receiver-456",
    email: "receiver@rutgers.edu",
    display_name: "Test Receiver",
    photo_url: null,
    expo_push_token: "ExponentPushToken[yyyyyy]",
    created_at: new Date().toISOString(),
    last_online: new Date().toISOString(),
  },
  nonRutgers: {
    id: "user-non-rutgers",
    google_id: "google-non-rutgers",
    email: "user@gmail.com",
    display_name: "Non Rutgers User",
    photo_url: null,
    expo_push_token: null,
    created_at: new Date().toISOString(),
    last_online: new Date().toISOString(),
  },
};

export const mockDiningHalls = {
  brower: {
    id: "dh-brower-123",
    name: "Brower Commons",
    campus: "College Avenue",
    weekday_open_time: "07:00:00",
    weekday_close_time: "20:00:00",
    friday_open_time: "07:00:00",
    friday_close_time: "20:00:00",
    weekend_open_time: "10:00:00",
    weekend_close_time: "20:00:00",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  busch: {
    id: "dh-busch-456",
    name: "Busch Dining Hall",
    campus: "Busch",
    weekday_open_time: "07:00:00",
    weekday_close_time: "20:00:00",
    friday_open_time: "07:00:00",
    friday_close_time: "20:00:00",
    weekend_open_time: "10:00:00",
    weekend_close_time: "20:00:00",
    is_active: true,
    created_at: new Date().toISOString(),
  },
};

export const mockOffers = {
  active: {
    id: "offer-123",
    user_id: mockUsers.giver.id,
    dining_hall_id: mockDiningHalls.brower.id,
    available_from: new Date().toISOString(),
    available_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    is_active: true,
    created_at: new Date().toISOString(),
    dining_hall: mockDiningHalls.brower,
    user: mockUsers.giver,
  },
  inactive: {
    id: "offer-inactive-456",
    user_id: mockUsers.giver.id,
    dining_hall_id: mockDiningHalls.brower.id,
    available_from: new Date().toISOString(),
    available_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    is_active: false,
    created_at: new Date().toISOString(),
    dining_hall: mockDiningHalls.brower,
    user: mockUsers.giver,
  },
};

export const mockRequests = {
  active: {
    id: "request-123",
    user_id: mockUsers.receiver.id,
    dining_hall_id: mockDiningHalls.brower.id,
    requested_at: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    dining_hall: mockDiningHalls.brower,
    user: mockUsers.receiver,
  },
  differentDiningHall: {
    id: "request-different-456",
    user_id: mockUsers.receiver.id,
    dining_hall_id: mockDiningHalls.busch.id,
    requested_at: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    dining_hall: mockDiningHalls.busch,
    user: mockUsers.receiver,
  },
};

export const mockMatches = {
  active: {
    id: "match-123",
    giver_id: mockUsers.giver.id,
    receiver_id: mockUsers.receiver.id,
    dining_hall_id: mockDiningHalls.brower.id,
    offer_id: mockOffers.active.id,
    request_id: mockRequests.active.id,
    created_at: new Date().toISOString(),
    is_completed: false,
    dining_hall: mockDiningHalls.brower,
    giver: mockUsers.giver,
    receiver: mockUsers.receiver,
  },
  completed: {
    id: "match-completed-456",
    giver_id: mockUsers.giver.id,
    receiver_id: mockUsers.receiver.id,
    dining_hall_id: mockDiningHalls.brower.id,
    offer_id: "offer-old",
    request_id: "request-old",
    created_at: new Date().toISOString(),
    is_completed: true,
    dining_hall: mockDiningHalls.brower,
    giver: mockUsers.giver,
    receiver: mockUsers.receiver,
  },
};

export const mockMessages = {
  first: {
    id: "message-1",
    match_id: mockMatches.active.id,
    sender_id: mockUsers.giver.id,
    text: "Hey, I'm at Brower now!",
    created_at: new Date().toISOString(),
    sender: mockUsers.giver,
  },
  second: {
    id: "message-2",
    match_id: mockMatches.active.id,
    sender_id: mockUsers.receiver.id,
    text: "Great, I'll be there in 5 minutes!",
    created_at: new Date(Date.now() + 1000).toISOString(),
    sender: mockUsers.receiver,
  },
};

// Helper to create a mock Supabase query builder
export function createMockSupabaseQuery(returnData: any, returnError: any = null) {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
    maybeSingle: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
  };
  return mockQuery;
}

// Helper to create a mock Supabase from() call
export function createMockSupabaseFrom(mockQuery: any) {
  return jest.fn(() => mockQuery);
}
