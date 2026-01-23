import supabase from "../config/supabase.js";
import type { User, ServiceResult, GoogleUserInfo } from "../types/index.js";

// Returns a user given their GoogleID
export async function findUserByGoogleId(googleId: string): Promise<ServiceResult<User | null>> {
  const { data, error } = await supabase.from("users").select("*").eq("google_id", googleId).maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as User | null };
}

// Returns a user given their ID (different than GoogleID)
export async function findUserById(id: string): Promise<ServiceResult<User | null>> {
  const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as User | null };
}

// Creates a user
export async function createUser(googleUserInfo: GoogleUserInfo, expoPushToken?: string): Promise<ServiceResult<User>> {
  const userToInsert = {
    google_id: googleUserInfo.googleId,
    email: googleUserInfo.email,
    display_name: googleUserInfo.displayName,
    photo_url: googleUserInfo.photoUrl,
    expo_push_token: expoPushToken ?? null,
  };

  const { data, error } = await supabase.from("users").insert(userToInsert).select().single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as User };
}

// Updates an existing user
export async function updateUser(id: string, updates: Partial<User>): Promise<ServiceResult<User>> {
  const { data, error } = await supabase.from("users").update(updates).eq("id", id).select().single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as User };
}

// Updates the user's Expo push token (named id as userId to clear confusion)
export async function updatePushToken(userId: string, token: string): Promise<ServiceResult<User>> {
  const { data, error } = await supabase
    .from("users")
    .update({ expo_push_token: token })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as User };
}
