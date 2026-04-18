import { getToken } from "./storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

async function request<T>(method: HttpMethod, path: string, body?: object): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed: ${response.status}`);
  }

  return data as T;
}

// Auth
export const authApi = {
  googleLogin: (idToken: string, expoPushToken?: string) =>
    request<{ token: string; user: User }>("POST", "/api/auth/google", {
      idToken,
      expoPushToken,
    }),
  me: () => request<User>("GET", "/api/auth/me"),
};

// Dining Halls
export const diningHallApi = {
  list: () => request<DiningHall[]>("GET", "/api/dining-halls"),
  get: (id: string) => request<DiningHall>("GET", `/api/dining-halls/${id}`),
};

// Swipes
export const swipeApi = {
  createOffer: (diningHallId: string, availableFrom: string, availableUntil: string) =>
    request<SwipeOffer>("POST", "/api/swipes/offers", { diningHallId, availableFrom, availableUntil }),
  getMyActiveOffer: () => request<SwipeOffer | null>("GET", "/api/swipes/offers/my/active"),
  cancelOffer: (offerId: string) => request<void>("DELETE", `/api/swipes/offers/${offerId}`),

  createRequest: (diningHallId: string, requestedAt: string) =>
    request<SwipeRequest>("POST", "/api/swipes/requests", { diningHallId, requestedAt }),
  getMyActiveRequest: () => request<SwipeRequest | null>("GET", "/api/swipes/requests/my/active"),
  cancelRequest: (requestId: string) => request<void>("DELETE", `/api/swipes/requests/${requestId}`),
};

// Matches
export const matchApi = {
  getActive: () => request<Match[]>("GET", "/api/matches/active"),
  get: (matchId: string) => request<Match>("GET", `/api/matches/${matchId}`),
  complete: (matchId: string) => request<Match>("PUT", `/api/matches/${matchId}/complete`),

  getMessages: (matchId: string, limit = 50, offset = 0) =>
    request<Message[]>("GET", `/api/matches/${matchId}/messages?limit=${limit}&offset=${offset}`),
  sendMessage: (matchId: string, text: string) =>
    request<Message>("POST", `/api/matches/${matchId}/messages`, { text }),
};

// Users
export const userApi = {
  updatePushToken: (expoPushToken: string) => request<void>("PUT", "/api/users/push-token", { expoPushToken }),
};

// --- Shared types (mirrors backend models) ---

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  expoPushToken?: string;
}

export interface DiningHall {
  id: string;
  name: string;
  location: string;
}

export interface SwipeOffer {
  id: string;
  userId: string;
  diningHallId: string;
  availableFrom: string;
  availableUntil: string;
  isActive: boolean;
  createdAt: string;
}

export interface SwipeRequest {
  id: string;
  userId: string;
  diningHallId: string;
  requestedAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface Match {
  id: string;
  offerId: string;
  requestId: string;
  diningHallId: string;
  giverId: string;
  receiverId: string;
  status: "pending" | "active" | "completed" | "cancelled";
  createdAt: string;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: string;
}
