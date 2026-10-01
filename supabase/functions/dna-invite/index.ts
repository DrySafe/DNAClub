import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { createInviteHandler } from "./handler.js";

Deno.serve(
  createInviteHandler({
    origin: Deno.env.get("APP_ORIGIN") || "",
    url: Deno.env.get("SUPABASE_URL") || "",
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    createClient,
  }),
);
