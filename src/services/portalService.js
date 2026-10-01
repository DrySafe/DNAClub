import { supabase } from "../config/supabaseClient.js";

export async function action(name, payload = {}) {
  const { data, error } = await supabase.rpc("dna_action", {
    action: name,
    payload,
  });
  if (error) throw error;
  return data;
}

export async function loadPortal(staff = false) {
  const tables = [
    "dna_members",
    "dna_orders",
    "dna_referrals",
    "dna_benefits",
    "dna_vouchers",
    "dna_allocations",
    "dna_campaigns",
    "dna_reseller_requests",
    "dna_settings",
  ];
  if (staff) tables.push("dna_audit");
  const entries = await Promise.all(
    tables.map(async (table) => {
      const rows = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        let query = supabase.from(table).select("*");
        if (table === "dna_audit")
          query = query.order("created_at", { ascending: false }).limit(250);
        else if (table === "dna_allocations")
          query = query.order("voucher_id").order("benefit_id");
        else if (table !== "dna_settings") query = query.order("id");
        const { data, error } = await query.range(
          offset,
          offset + pageSize - 1,
        );
        if (error) throw error;
        rows.push(...(data || []));
        if (table === "dna_audit" || !data || data.length < pageSize) break;
      }
      return [table.replace("dna_", ""), rows];
    }),
  );
  const result = Object.fromEntries(entries);
  result.settings = result.settings[0]?.value;
  if (!result.settings)
    throw new Error(
      "Configuração do portal não encontrada. A migração precisa ser aplicada no Supabase.",
    );
  return result;
}

export async function publicInfo(code = "") {
  const [settings, referrer] = await Promise.all([
    supabase.rpc("dna_public_settings"),
    code
      ? supabase.rpc("dna_referrer", { code })
      : Promise.resolve({ data: null }),
  ]);
  if (settings.error) throw settings.error;
  if (referrer.error) throw referrer.error;
  return { settings: settings.data, referrer: referrer.data };
}
