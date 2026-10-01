// UI integration tests intercept Supabase requests; no production account/data is changed.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const base = process.env.DNA_APP_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const uid = "00000000-0000-0000-0000-000000000002";
const other = "00000000-0000-0000-0000-000000000003";
const expiry = Math.floor(Date.now() / 1000) + 3600;
const now = new Date().toISOString();
const encode = (object) =>
  Buffer.from(JSON.stringify(object)).toString("base64url");
const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: uid, role: "authenticated", exp: expiry })}.test`;
const errors = [];
const settings = {
  company_whatsapp: "5511999999999",
  allow_combination: true,
  cashback_limit: 50,
  validity_days: 365,
  referral_start: "2026-09-15",
  referral_end: "2026-12-31",
  classification_description: "Classificação manual.",
  gift_catalog: ["Kit DNA MOR"],
  level_benefits: { "DNA Master": ["Conteúdo exclusivo"] },
  referral_rules: Object.fromEntries(
    ["DNA Profissional", "DNA Referência", "DNA Master", "DNA MOR"].map(
      (level) => [
        level,
        {
          kind: "cashback",
          mode: "percent",
          value: 6,
          base: "paid_order",
          client_kind: "discount",
          client_value: 2,
          client_first_order: false,
        },
      ],
    ),
  ),
};
async function fixture(role) {
  const context = await browser.newContext();
  const profile = {
    id: uid,
    full_name: "Maria Silva",
    email: "maria@example.test",
    phone: "11999999999",
    cpf_cnpj: "11122233344",
    role,
    level: role === "revendedor" ? "DNA Master" : null,
    referral_code: "DNA-MARIA",
    created_at: now,
  };
  const calls = [];
  const rows = {
    dna_members: [
      profile,
      {
        id: other,
        full_name: "Ana Souza",
        email: "ana@example.test",
        role: "cliente",
      },
    ],
    dna_settings: [{ id: true, value: structuredClone(settings) }],
    dna_orders: [
      {
        id: "order",
        member_id: uid,
        omni_number: "12345",
        products: 200,
        freight: 30,
        weight_kg: 5,
        state: "paid",
        ordered_on: "2026-10-01",
        paid_on: "2026-10-01",
        discount_applied: 0,
        cashback_applied: 0,
      },
    ],
    dna_referrals: [],
    dna_benefits: [
      {
        id: "cash",
        member_id: uid,
        kind: "cashback",
        title: "Indicação Ana",
        mode: "fixed",
        value: 180,
        remaining: 180,
        source: "Indicação",
        source_key: "a",
        state: "available",
        granted_at: now,
      },
      {
        id: "discount",
        member_id: uid,
        kind: "discount",
        title: "Boas-vindas",
        mode: "percent",
        value: 10,
        remaining: 0,
        source: "Concessão",
        source_key: "b",
        state: "available",
        granted_at: now,
      },
    ],
    dna_vouchers: [],
    dna_allocations: [],
    dna_campaigns: [],
    dna_reseller_requests: [],
    dna_audit: [],
  };
  await context.addInitScript(
    ({ session }) =>
      localStorage.setItem(
        "sb-gptofnrdirvycesycidw-auth-token",
        JSON.stringify(session),
      ),
    {
      session: {
        access_token: token,
        refresh_token: "test-refresh-token",
        expires_at: expiry,
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: uid,
          email: profile.email,
          aud: "authenticated",
          role: "authenticated",
        },
      },
    },
  );
  await context.route(
    "**/gptofnrdirvycesycidw.supabase.co/**",
    async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        name = url.pathname.split("/").at(-1);
      let result;
      if (url.pathname.includes("/auth/"))
        result = { id: uid, email: profile.email };
      else if (name === "dna_action") {
        const call = req.postDataJSON();
        calls.push(call);
        if (call.action === "voucher_request") {
          result = {
            id: "voucher",
            code: "DNA-TEST123",
            member_id: uid,
            benefit_id: call.payload.benefit_id,
            cashback_requested: Number(call.payload.cashback || 0),
            state: "requested",
            created_at: now,
          };
          rows.dna_vouchers.push(result);
          if (result.cashback_requested)
            rows.dna_allocations.push({
              voucher_id: "voucher",
              benefit_id: "cash",
              amount: result.cashback_requested,
            });
        } else if (call.action === "settings_save") {
          rows.dna_settings[0].value = call.payload.value;
          result = { ok: true };
        } else if (call.action === "campaign_save") {
          rows.dna_campaigns.push({
            ...call.payload,
            id: "campaign",
            created_at: now,
          });
          result = { ok: true };
        } else if (call.action === "reseller_request") {
          rows.dna_reseller_requests.push({
            id: "request",
            member_id: uid,
            message: call.payload.message,
            state: "pending",
            created_at: now,
          });
          result = { ok: true };
        } else result = { ok: true };
      } else {
        result = rows[name] || [];
        if (name === "dna_members" && url.searchParams.has("id"))
          result = profile;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(result),
      });
    },
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  return { context, page, calls, rows };
}
try {
  const rev = await fixture("revendedor");
  await rev.page.goto(`${base}/app/inicio`);
  await rev.page.getByRole("heading", { name: "Olá, Maria." }).waitFor();
  await rev.page
    .getByRole("link", { name: "Meus benefícios", exact: true })
    .click();
  await rev.page.getByRole("tab", { name: "Cashback", exact: true }).click();
  await rev.page
    .getByRole("button", { name: "Solicitar cashback", exact: true })
    .click();
  await rev.page
    .getByLabel("Cashback a solicitar (R$)", { exact: true })
    .fill("60");
  await rev.page
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await rev.page
    .getByRole("status")
    .filter({ hasText: "Solicitação registrada" })
    .waitFor();
  assert.equal(
    rev.calls.find((c) => c.action === "voucher_request").payload.cashback,
    "60",
  );
  await rev.page
    .getByRole("link", { name: "Solicitações", exact: true })
    .click();
  await rev.page.getByText("DNA-TEST123", { exact: true }).waitFor();
  assert.equal(
    await rev.page
      .getByRole("button", { name: "WhatsApp", exact: true })
      .count(),
    1,
  );
  await rev.page.setViewportSize({ width: 390, height: 844 });
  await rev.page.getByRole("button", { name: "Abrir menu" }).click();
  await rev.page.getByRole("link", { name: "Indicações", exact: true }).click();
  await rev.page
    .getByRole("heading", { name: "Compartilhe sua indicação" })
    .waitFor();
  await mkdir("/workspace/dnaclub-environment/screenshots", {
    recursive: true,
  });
  await rev.page.screenshot({
    path: "/workspace/dnaclub-environment/screenshots/revendedora-mobile.png",
    fullPage: true,
  });
  console.log(
    "PASS: revendedora requests partial cashback, sees voucher, and uses mobile navigation",
  );
  await rev.context.close();
  const client = await fixture("cliente");
  await client.page.goto(`${base}/app/inicio`);
  await client.page.getByRole("heading", { name: "Olá, Maria." }).waitFor();
  assert.equal(
    await client.page
      .getByRole("link", { name: "Indicações", exact: true })
      .count(),
    0,
  );
  await client.page.goto(`${base}/app/configuracoes`);
  await client.page.waitForURL("**/app/inicio");
  await client.page
    .getByRole("link", { name: "Quero ser revendedor", exact: true })
    .click();
  await client.page
    .getByRole("button", { name: "Solicitar participação" })
    .click();
  await client.page
    .getByLabel("Conte um pouco sobre seu interesse")
    .fill("Quero começar a revender.");
  await client.page
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await client.page
    .getByText("Quero começar a revender.", { exact: true })
    .waitFor();
  console.log(
    "PASS: client has own area, cannot access settings/indications, and requests reseller conversion",
  );
  await client.context.close();
  const admin = await fixture("admin");
  await admin.page.goto(`${base}/app/configuracoes`);
  const combination = admin.page.getByLabel(
    "Permitir desconto e cashback no mesmo pedido",
  );
  await combination.waitFor();
  await combination.uncheck();
  await admin.page
    .getByRole("button", { name: "Salvar configurações" })
    .click();
  await admin.page.getByRole("status").waitFor();
  assert.equal(
    admin.calls.find((c) => c.action === "settings_save").payload.value
      .allow_combination,
    false,
  );
  await admin.page
    .getByRole("link", { name: "Campanhas", exact: true })
    .click();
  await admin.page.getByRole("button", { name: "Criar campanha" }).click();
  const modal = admin.page.getByRole("dialog");
  await modal.getByLabel("Nome", { exact: true }).fill("Semana do Esteticista");
  await modal.getByLabel("Meta de compras pagas (R$)").fill("1000");
  await modal.getByLabel("Público", { exact: true }).selectOption("revendedor");
  await modal
    .getByLabel("Meta de indicações com primeiro pedido pago")
    .fill("2");
  await modal.getByLabel("Recompensa", { exact: true }).selectOption("gift");
  await modal.getByLabel("Nome do brinde").fill("Kit DNA MOR");
  await modal.getByLabel("Valor ou percentual (0 para brinde)").fill("0");
  await modal.getByLabel("Dias para uso").fill("15");
  await modal.getByRole("button", { name: "Confirmar", exact: true }).click();
  await admin.page
    .getByText("Semana do Esteticista", { exact: true })
    .waitFor();
  const saved = admin.calls.find((c) => c.action === "campaign_save").payload;
  assert.equal(saved.reward.kind, "gift");
  assert.equal(saved.expiry.days, 15);
  assert.equal(saved.conditions.referrals_min, 2);
  await admin.page.setViewportSize({ width: 1440, height: 1000 });
  await admin.page.screenshot({
    path: "/workspace/dnaclub-environment/screenshots/campanhas-admin.png",
    fullPage: true,
  });
  console.log(
    "PASS: administrator changes current combination rule and creates campaign with gift and custom expiry",
  );
  await admin.context.close();
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
