import supabase from "../config/supabase.js";
import type { DiningHall, ServiceResult } from "../types/index.js";

// Returns all active dining halls
export async function getAllDiningHalls(): Promise<ServiceResult<DiningHall[]>> {
  const { data, error } = await supabase.from("dining_halls").select("*").eq("is_active", true);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as DiningHall[] };
}

// Returns dining hall, given the ID
export async function getDiningHallById(id: string): Promise<ServiceResult<DiningHall | null>> {
  const { data, error } = await supabase.from("dining_halls").select("*").eq("id", id).maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: "Dining hall not found" };
  }

  return { success: true, data: data as DiningHall };
}
