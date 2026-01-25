import supabase from "../config/supabase.js";
import type { SwipeOffer, SwipeRequest, ServiceResult } from "../types/index.js";

// ---------------------------- Swipe Offer Functions ------------------------------

// Create a new swipe offer
export async function createSwipeOffer(
  userId: string,
  diningHallId: string,
  availableFrom: string,
  availableUntil: string
): Promise<ServiceResult<SwipeOffer>> {
  try {
    // Check if the user already has an active offer
    const existingOffer = await getUserActiveOffer(userId);
    if (existingOffer.success && existingOffer.data) {
      return {
        success: false,
        error: "You already have an active swipe offer. Cancel it first.",
      };
    }

    // Create the offer
    const offerData = {
      user_id: userId,
      dining_hall_id: diningHallId,
      available_from: availableFrom,
      available_until: availableUntil,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("swipe_offers")
      .insert(offerData)
      .select("*, dining_hall:dining_halls(*), user:users(*)")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SwipeOffer };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create swipe offer",
    };
  }
}

// Get all acive swipes for a dining hall
export async function getActiveSwipeOffers(diningHallId: string): Promise<ServiceResult<SwipeOffer[]>> {
  try {
    const { data, error } = await supabase
      .from("swipe_offers")
      .select("*, dining_hall:dining_halls(*), user:users(*)")
      .eq("dining_hall_id", diningHallId)
      .eq("is_active", true)
      .gte("available_until", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SwipeOffer[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch swipe offers",
    };
  }
}

// Get the user's active offer
export async function getUserActiveOffer(userId: string): Promise<ServiceResult<SwipeOffer | null>> {
  try {
    const { data, error } = await supabase
      .from("swipe_offers")
      .select("*, dining_hall:dining_halls(*), user:users(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SwipeOffer | null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user offer",
    };
  }
}

// Cancel an offer
export async function cancelSwipeOffer(offerId: string, userId: string): Promise<ServiceResult<SwipeOffer>> {
  try {
    const { data, error } = await supabase
      .from("swipe_offers")
      .update({ is_active: false })
      .eq("id", offerId)
      .eq("user_id", userId)
      .select("*, dining_hall:dining_halls(*), user:users(*)")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "Offer not found or you don't have permission" };
    }

    return { success: true, data: data as SwipeOffer };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel swipe offer",
    };
  }
}

// ---------------------------- Swipe Request Functions ------------------------------

// Create a new request
export async function createSwipeRequest(
  userId: string,
  diningHallId: string,
  requestedAt: string
): Promise<ServiceResult<SwipeRequest>> {
  try {
    const existingRequest = await getUserActiveRequest(userId);
    if (existingRequest.success && existingRequest.data) {
      return {
        success: false,
        error: "You already have an active swipe request. Cancel it first.",
      };
    }

    // Create the request
    const requestData = {
      user_id: userId,
      dining_hall_id: diningHallId,
      requested_at: requestedAt,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("swipe_requests")
      .insert(requestData)
      .select("*, dining_hall:dining_halls(*), user:users(*)")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SwipeRequest };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create swipe request",
    };
  }
}

// Get all active requests for a dining hall
export async function getActiveSwipeRequests(diningHallId: string): Promise<ServiceResult<SwipeRequest[]>> {
  try {
    const { data, error } = await supabase
      .from("swipe_requests")
      .select("*, dining_hall:dining_halls(*), user:users(*)")
      .eq("dining_hall_id", diningHallId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SwipeRequest[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch swipe requests",
    };
  }
}

// Get the user's active requests
export async function getUserActiveRequest(userId: string): Promise<ServiceResult<SwipeRequest | null>> {
  try {
    const { data, error } = await supabase
      .from("swipe_requests")
      .select("*, dining_hall:dining_halls(*), user:users(*)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SwipeRequest | null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user request",
    };
  }
}

// Cancel a request
export async function cancelSwipeRequest(requestId: string, userId: string): Promise<ServiceResult<SwipeRequest>> {
  try {
    const { data, error } = await supabase
      .from("swipe_requests")
      .update({ is_active: false })
      .eq("id", requestId)
      .eq("user_id", userId)
      .select("*, dining_hall:dining_halls(*), user:users(*)")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "Request not found or you don't have permission" };
    }

    return { success: true, data: data as SwipeRequest };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel swipe request",
    };
  }
}
