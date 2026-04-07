import supabase from "../config/supabase.js";
import type { Match, SwipeOffer, SwipeRequest, ServiceResult } from "../types/index.js";
import { notifyMatchCreated } from "./notification.service.js";

// Create a match between an offer and a request
export async function createMatch(
  giverId: string,
  receiverId: string,
  diningHallId: string,
  offerId: string,
  requestId: string
): Promise<ServiceResult<Match>> {
  try {
    // Verify the offer and request exist and are active
    const { data: offer, error: offerError } = await supabase
      .from("swipe_offers")
      .select("*")
      .eq("id", offerId)
      .eq("user_id", giverId)
      .eq("is_active", true)
      .single();

    if (offerError || !offer) {
      return { success: false, error: "Offer not found or no longer active" };
    }

    const { data: request, error: requestError } = await supabase
      .from("swipe_requests")
      .select("*")
      .eq("id", requestId)
      .eq("user_id", receiverId)
      .eq("is_active", true)
      .single();

    if (requestError || !request) {
      return { success: false, error: "Request not found or no longer active" };
    }

    // Verify they're for the same dining hall
    if (offer.dining_hall_id !== request.dining_hall_id || offer.dining_hall_id !== diningHallId) {
      return { success: false, error: "Offer and request are for different dining halls" };
    }

    // Verify users aren't matching with themselves
    if (giverId === receiverId) {
      return { success: false, error: "Cannot match with yourself" };
    }

    // Create the match
    const matchData = {
      giver_id: giverId,
      receiver_id: receiverId,
      dining_hall_id: diningHallId,
      offer_id: offerId,
      request_id: requestId,
      is_completed: false,
    };

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .insert(matchData)
      .select("*, dining_hall:dining_halls(*), giver:users!giver_id(*), receiver:users!receiver_id(*)")
      .single();

    if (matchError) {
      return { success: false, error: matchError.message };
    }

    // Deactivate the offer and request so they can't be matched again
    await supabase.from("swipe_offers").update({ is_active: false }).eq("id", offerId);

    await supabase.from("swipe_requests").update({ is_active: false }).eq("id", requestId);

    // Send push notifications to both users
    const diningHallName = (match as any).dining_hall?.name || "the dining hall";
    await notifyMatchCreated(giverId, receiverId, diningHallName, match.id);

    return { success: true, data: match as Match };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create match",
    };
  }
}

// Find potential matches for a user's offer
// Returns active requests at the same dining hall
export async function findPotentialMatchesForOffer(
  offerId: string,
  userId: string
): Promise<ServiceResult<SwipeRequest[]>> {
  try {
    // Get the offer details
    const { data: offer, error: offerError } = await supabase
      .from("swipe_offers")
      .select("*")
      .eq("id", offerId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (offerError || !offer) {
      return { success: false, error: "Offer not found or no longer active" };
    }

    // Find all active requests at the same dining hall (excluding user's own requests)
    const { data: requests, error: requestsError } = await supabase
      .from("swipe_requests")
      .select("*, dining_hall:dining_halls(*), user:users(*)")
      .eq("dining_hall_id", offer.dining_hall_id)
      .eq("is_active", true)
      .neq("user_id", userId)
      .order("created_at", { ascending: true }); // Oldest first

    if (requestsError) {
      return { success: false, error: requestsError.message };
    }

    return { success: true, data: requests as SwipeRequest[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to find potential matches",
    };
  }
}

// Find potential matches for a user's request
// Returns active offers at the same dining hall
export async function findPotentialMatchesForRequest(
  requestId: string,
  userId: string
): Promise<ServiceResult<SwipeOffer[]>> {
  try {
    // Get the request details
    const { data: request, error: requestError } = await supabase
      .from("swipe_requests")
      .select("*")
      .eq("id", requestId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (requestError || !request) {
      return { success: false, error: "Request not found or no longer active" };
    }

    // Find all active offers at the same dining hall (excluding user's own offers)
    const { data: offers, error: offersError } = await supabase
      .from("swipe_offers")
      .select("*, dining_hall:dining_halls(*), user:users(*)")
      .eq("dining_hall_id", request.dining_hall_id)
      .eq("is_active", true)
      .neq("user_id", userId)
      .gte("available_until", new Date().toISOString()) // Only offers that haven't expired
      .order("created_at", { ascending: true }); // Oldest first

    if (offersError) {
      return { success: false, error: offersError.message };
    }

    return { success: true, data: offers as SwipeOffer[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to find potential matches",
    };
  }
}

// Get all matches for a user (as giver or receiver)
export async function getUserMatches(userId: string): Promise<ServiceResult<Match[]>> {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*, dining_hall:dining_halls(*), giver:users!giver_id(*), receiver:users!receiver_id(*)")
      .or(`giver_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Match[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch matches",
    };
  }
}

// Get a specific match by ID
export async function getMatchById(matchId: string, userId: string): Promise<ServiceResult<Match | null>> {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*, dining_hall:dining_halls(*), giver:users!giver_id(*), receiver:users!receiver_id(*)")
      .eq("id", matchId)
      .or(`giver_id.eq.${userId},receiver_id.eq.${userId}`)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "Match not found or you don't have access" };
    }

    return { success: true, data: data as Match };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch match",
    };
  }
}

// Mark a match as completed
// Either user can mark the match as completed
export async function completeMatch(matchId: string, userId: string): Promise<ServiceResult<Match>> {
  try {
    // Update the match
    const { data, error } = await supabase
      .from("matches")
      .update({ is_completed: true })
      .eq("id", matchId)
      .or(`giver_id.eq.${userId},receiver_id.eq.${userId}`)
      .select("*, dining_hall:dining_halls(*), giver:users!giver_id(*), receiver:users!receiver_id(*)")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: "Match not found or you don't have permission" };
    }

    return { success: true, data: data as Match };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete match",
    };
  }
}

// Get active (incomplete) matches for a user
export async function getActiveMatches(userId: string): Promise<ServiceResult<Match[]>> {
  try {
    const { data, error } = await supabase
      .from("matches")
      .select("*, dining_hall:dining_halls(*), giver:users!giver_id(*), receiver:users!receiver_id(*)")
      .or(`giver_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("is_completed", false)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Match[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch active matches",
    };
  }
}
