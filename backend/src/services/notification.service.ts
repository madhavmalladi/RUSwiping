import { Expo } from "expo-server-sdk";
import type { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import supabase from "../config/supabase.js";
import type { ServiceResult } from "../types/index.js";

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send a push notification to a user
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<ServiceResult<ExpoPushTicket[]>> {
  try {
    // Get the user's push token
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("expo_push_token")
      .eq("id", userId)
      .single();

    if (userError || !user || !user.expo_push_token) {
      return { success: false, error: "User push token not found" };
    }

    const pushToken = user.expo_push_token;

    // Check that the token is a valid Expo push token
    if (!Expo.isExpoPushToken(pushToken)) {
      return { success: false, error: "Invalid Expo push token" };
    }

    // Construct the message
    const messages: ExpoPushMessage[] = [
      {
        to: pushToken,
        sound: "default",
        title,
        body,
        data: data || {},
      },
    ];

    // Send the notification
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Error sending push notification chunk:", error);
      }
    }

    return { success: true, data: tickets };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send push notification",
    };
  }
}

/**
 * Send match created notification to both users
 */
export async function notifyMatchCreated(
  giverId: string,
  receiverId: string,
  diningHallName: string,
  matchId: string
): Promise<ServiceResult<void>> {
  try {
    // Get both users' info
    const { data: giver, error: giverError } = await supabase
      .from("users")
      .select("display_name, expo_push_token")
      .eq("id", giverId)
      .single();

    const { data: receiver, error: receiverError } = await supabase
      .from("users")
      .select("display_name, expo_push_token")
      .eq("id", receiverId)
      .single();

    if (giverError || receiverError) {
      return { success: false, error: "Failed to fetch user information" };
    }

    const giverName = giver?.display_name || "Someone";
    const receiverName = receiver?.display_name || "Someone";

    // Notify the giver
    if (giver?.expo_push_token && Expo.isExpoPushToken(giver.expo_push_token)) {
      await sendPushNotification(giverId, "New Match! 🎉", `You matched with ${receiverName} at ${diningHallName}`, {
        type: "match_created",
        matchId,
        role: "giver",
      });
    }

    // Notify the receiver
    if (receiver?.expo_push_token && Expo.isExpoPushToken(receiver.expo_push_token)) {
      await sendPushNotification(receiverId, "New Match! 🎉", `${giverName} will swipe you in at ${diningHallName}`, {
        type: "match_created",
        matchId,
        role: "receiver",
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send match notifications",
    };
  }
}

/**
 * Send message notification
 */
export async function notifyNewMessage(
  recipientId: string,
  senderName: string,
  messageText: string,
  matchId: string
): Promise<ServiceResult<ExpoPushTicket[]>> {
  return sendPushNotification(recipientId, `Message from ${senderName}`, messageText, { type: "new_message", matchId });
}
