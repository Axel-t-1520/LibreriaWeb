import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseUrl) {
  console.log("faltan las variables");
} else {
  console.log("esta todo bien");
}

// console.log(supabaseUrl)
// console.log(supabaseKey)
export const supabase = createClient(supabaseUrl, supabaseKey);
