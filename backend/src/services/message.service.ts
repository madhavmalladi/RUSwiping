import supabase from "../config/supabase.js";
import type { Message, ServiceResult } from "../types/index.js";
import { notifyNewMessage } from "./notification.service.js";

/**
 * Send a message in a match conversation
 * Only users who are part of the match can send messages
 */
export async function sendMessage(
  matchId: string,
  senderId: string,
  text: string
): Promise<ServiceResult<Message>> {
  try {
    // Verify the user is part of this match
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*, giver:users!giver_id(id, display_name), receiver:users!receiver_id(id, display_name)")
      .eq("id", matchId)
      .or(`giver_id.eq.${senderId},receiver_id.eq.${senderId}`)
      .single();

    if (matchError || !match) {
      return { success: false, error: "Match not found or you don't have access" };
    }

    // Check if match is still active (not completed)
    if (match.is_completed) {
      return { success: false, error: "Cannot send messages to a completed match" };
    }

    // Insert the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        match_id: matchId,
        sender_id: senderId,
        text,
      })
      .select("*, sender:users(*)")
      .single();

    if (messageError) {
      return { success: false, error: messageError.message };
    }

    // Send push notification to the other user
    const recipientId = match.giver_id === senderId ? match.receiver_id : match.giver_id;
    const senderName =
      match.giver_id === senderId
        ? (match.giver as any)?.display_name || "Someone"
        : (match.receiver as any)?.display_name || "Someone";

    // Don't await - fire and forget notification
    notifyNewMessage(recipientId, senderName, text, matchId).catch((err) =>
      console.error("Failed to send message notification:", err)
    );

    return { success: true, data: message as Message };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}

/**
 * Get all messages for a match
 * Only users who are part of the match can view messages
 */
export async function getMessages(
  matchId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ServiceResult<Message[]>> {
  try {
    // Verify the user is part of this match
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id")
      .eq("id", matchId)
      .or(`giver_id.eq.${userId},receiver_id.eq.${userId}`)
      .single();

    if (matchError || !match) {
      return { success: false, error: "Match not found or you don't have access" };
    }

    // Get messages ordered by creation time (newest last for chat)
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*, sender:users(*)")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      return { success: false, error: messagesError.message };
    }

    return { success: true, data: messages as Message[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch messages",
    };
  }
}

/**
 * Get the most recent message for a match (for preview in match list)
 */
export async function getLatestMessage(matchId: string, userId: string): Promise<ServiceResult<Message | null>> {
  try {
    // Verify the user is part of this match
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id")
      .eq("id", matchId)
      .or(`giver_id.eq.${userId},receiver_id.eq.${userId}`)
      .single();

    if (matchError || !match) {
      return { success: false, error: "Match not found or you don't have access" };
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("*, sender:users(*)")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (messageError) {
      return { success: false, error: messageError.message };
    }

    return { success: true, data: message as Message | null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch latest message",
    };
  }
}
