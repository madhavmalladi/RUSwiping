/**
 * Dining hall information from the dining_halls table
 */
export interface DiningHall {
  id: string;
  name: string;
  campus: string;
  weekday_open_time: string; // "07:00:00"
  weekday_close_time: string;
  friday_open_time: string;
  friday_close_time: string;
  weekend_open_time: string;
  weekend_close_time: string;
  is_active: boolean;
  created_at: string;
}

/**
 * User from the users table
 */
export interface User {
  id: string;
  google_id: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  expo_push_token: string | null;
  created_at: string;
  last_online: string;
}

/**
 * Swipe offer from swipe_offers table
 * Someone who CAN give a swipe
 */
export interface SwipeOffer {
  id: string;
  user_id: string;
  dining_hall_id: string;
  available_from: string; // ISO timestamp
  available_until: string;
  is_active: boolean;
  created_at: string;
  // Populated via joins
  dining_hall?: DiningHall;
  user?: User;
}

/**
 * Swipe request from swipe_requests table
 * Someone who NEEDS a swipe
 */
export interface SwipeRequest {
  id: string;
  user_id: string;
  dining_hall_id: string;
  requested_at: string;
  is_active: boolean;
  created_at: string;
  // Populated via joins
  dining_hall?: DiningHall;
  user?: User;
}

/**
 * Match from matches table
 * Created when offer meets request
 */
export interface Match {
  id: string;
  giver_id: string;
  receiver_id: string;
  dining_hall_id: string;
  offer_id: string | null;
  request_id: string | null;
  created_at: string;
  is_completed: boolean;
  // Populated via joins
  dining_hall?: DiningHall;
  giver?: User;
  receiver?: User;
}

/**
 * Message from messages table
 */
export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  // Populated via joins
  sender?: User;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * POST /api/auth/google request body
 */
export interface GoogleAuthRequest {
  idToken: string;
  expoPushToken?: string;
}

/**
 * POST /api/auth/google response
 */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * POST /api/swipes/offer request body
 */
export interface CreateOfferRequest {
  diningHallId: string;
  availableFrom: string; // ISO timestamp
  availableUntil: string;
}

/**
 * POST /api/swipes/request request body
 */
export interface CreateRequestRequest {
  diningHallId: string;
}

/**
 * POST /api/matches/:matchId/messages request body
 */
export interface SendMessageRequest {
  text: string;
}

// ============================================
// JWT PAYLOAD TYPE
// ============================================

/**
 * What we store in the JWT token
 */
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number; // Issued at (added by jsonwebtoken)
  exp?: number; // Expiration (added by jsonwebtoken)
}

// ============================================
// EXPRESS EXTENSION
// ============================================

/**
 * Extend Express Request to include our user
 * This lets us do req.user after auth middleware
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// ============================================
// SERVICE RESPONSE TYPES
// ============================================

/**
 * Standard service result wrapper
 * Services return this to indicate success/failure
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Google OAuth payload after token verification
 */
export interface GoogleUserInfo {
  googleId: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}
