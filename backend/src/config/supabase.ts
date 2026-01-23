import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase_url = process.env.SUPABASE_URL;
const supabase_service_role_key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabase_service_role_key || !supabase_url) {
  throw new Error("Either Supabase SRKey or URL is not defined");
}

const supabase = createClient(supabase_url, supabase_service_role_key);

export default supabase;
