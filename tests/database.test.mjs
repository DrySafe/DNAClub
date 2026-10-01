import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
let db;
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const admin = id(1),
  member = id(2),
  other = id(3),
  finance = id(4);
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const owner = async () => db.exec("reset role");
const login = async (who) => {
  await db.exec("set role authenticated");
  await query("select set_config('request.jwt.claim.sub',$1,false)", [who]);
};
const act = async (name, payload = {}) =>
  (
    await query("select dna_action($1,$2::jsonb) result", [
      name,
      JSON.stringify(payload),
    ])
  )[0].result;
const credit = async (amount, extra = {}) => {
  await login(admin);
  const result = await act("benefit_grant", {
    member_id: member,
    kind: "cashback",
    mode: "fixed",
    title: "Crédito",
    value: amount,
    reason: "Origem de teste",
    ...extra,
  });
  return result.id;
};
const order = async (amount = 200, extra = {}) => {
  await login(finance);
  return (
    await act("order_save", {
      member_id: member,
      omni_number: "OMNI-" + Math.random(),
      products: amount,
      freight: 50,
      weight_kg: 1,
      ordered_on: "2026-10-01",
      state: "paid",
      paid_on: "2026-10-01",
      ...extra,
    })
  ).id;
};
before(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated; alter default privileges in schema public grant execute on functions to anon,authenticated;create schema auth;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`,
  );
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/202610010001_clube_dna.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});
after(async () => db.close());
beforeEach(async () => {
  await owner();
  await db.exec(
    "truncate dna_audit,dna_allocations,dna_vouchers,dna_benefits,dna_referrals,dna_orders,dna_reseller_requests,dna_campaigns,dna_members,auth.users cascade",
  );
  for (const n of [1, 2, 3, 4])
    await query(
      "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3::jsonb)",
      [
        id(n),
        `person${n}@example.test`,
        JSON.stringify({ full_name: `Pessoa ${n}`, role: "admin" }),
      ],
    );
  await query("update dna_members set role='admin' where id=$1", [admin]);
  await query("update dna_members set role='financeiro' where id=$1", [
    finance,
  ]);
  await query(
    "update dna_members set role='revendedor',level='DNA Master' where id=$1",
    [member],
  );
  await db.exec(
    `update dna_settings set value=jsonb_set(jsonb_set(jsonb_set(jsonb_set(value,'{allow_combination}','true'),'{cashback_limit}','50'),'{validity_days}','365'),'{referral_end}','"2030-12-31"')`,
  );
});
test("signup metadata cannot assign administrator privileges and RLS blocks cross-account reads and direct edits", async () => {
  await login(other);
  assert.equal((await query("select has_function_privilege('anon','public.dna_action(text,jsonb)','EXECUTE') allowed"))[0].allowed, false);
  assert.equal(
    (await query("select role from dna_members"))[0].role,
    "cliente",
  );
  assert.equal((await query("select * from dna_members")).length, 1);
  await assert.rejects(
    query("update dna_members set role='admin'"),
    /permission denied/,
  );
  await assert.rejects(act("settings_save", { value: {} }), /administradores/);
  await credit(100);
  await login(other);
  assert.equal((await query("select * from dna_benefits")).length, 0);
});
test("cashback reserves across origins and rejects over-reservation", async () => {
  await credit(60);
  await credit(40);
  await login(member);
  const v = await act("voucher_request", { cashback: 80 });
  assert.equal(Number(v.cashback_requested), 80);
  await assert.rejects(
    act("voucher_request", { cashback: 21 }),
    /insuficiente/,
  );
  await act("voucher_cancel", { id: v.id, reason: "Desisti" });
  await act("voucher_request", { cashback: 100 });
});
test("partial usage debits only confirmed amount and justified return restores it exactly once", async () => {
  await credit(120);
  const oid = await order(200);
  await login(member);
  const v = await act("voucher_request", { cashback: 100 });
  await login(finance);
  await act("voucher_redeem", { id: v.id, order_id: oid, cashback_used: 80 });
  assert.equal(
    Number(
      (await query("select sum(remaining) amount from dna_benefits"))[0].amount,
    ),
    40,
  );
  await assert.rejects(
    act("voucher_redeem", { id: v.id, order_id: oid, cashback_used: 80 }),
    /encerrada/,
  );
  await assert.rejects(act("voucher_return", { id: v.id }), /justificativa/);
  await act("voucher_return", { id: v.id, reason: "Pedido cancelado no Omni" });
  assert.equal(
    Number(
      (await query("select sum(remaining) amount from dna_benefits"))[0].amount,
    ),
    120,
  );
  await assert.rejects(
    act("voucher_return", { id: v.id, reason: "Outra tentativa" }),
    /utilização/,
  );
});
test("database enforces 50 percent excluding freight and cumulative cashback on the same order", async () => {
  await credit(300);
  const oid = await order(100);
  await login(member);
  const v = await act("voucher_request", { cashback: 60 });
  await login(finance);
  await assert.rejects(
    act("voucher_redeem", { id: v.id, order_id: oid, cashback_used: 60 }),
    /limite atual/,
  );
  await act("voucher_redeem", { id: v.id, order_id: oid, cashback_used: 40 });
  await login(member);
  const next = await act("voucher_request", { cashback: 20 });
  await login(finance);
  await assert.rejects(
    act("voucher_redeem", { id: next.id, order_id: oid, cashback_used: 20 }),
    /limite atual/,
  );
});
test("old voucher obeys current combination rule and no discount can be partially consumed", async () => {
  await credit(100);
  await login(admin);
  const b = (
    await act("benefit_grant", {
      member_id: member,
      kind: "discount",
      mode: "percent",
      value: 10,
      title: "10%",
      reason: "Teste",
    })
  ).id;
  const oid = await order(200);
  await login(member);
  const v = await act("voucher_request", { benefit_id: b, cashback: 50 });
  await owner();
  await db.exec(
    `update dna_settings set value=jsonb_set(value,'{allow_combination}','false')`,
  );
  await login(finance);
  await assert.rejects(
    act("voucher_redeem", { id: v.id, order_id: oid, cashback_used: 50 }),
    /configuração atual/,
  );
  await act("voucher_redeem", { id: v.id, order_id: oid, cashback_used: 0 });
  await login(admin);
  const fixed = (
    await act("benefit_grant", {
      member_id: member,
      kind: "discount",
      mode: "fixed",
      value: 300,
      title: "Desconto fixo",
      reason: "Teste",
    })
  ).id;
  await login(member);
  const v2 = await act("voucher_request", { benefit_id: fixed });
  await login(finance);
  await assert.rejects(
    act("voucher_redeem", { id: v2.id, order_id: oid, cashback_used: 0 }),
    /já tem desconto/,
  );
  const oid2 = await order(200);
  await assert.rejects(
    act("voucher_redeem", { id: v2.id, order_id: oid2, cashback_used: 0 }),
    /integralmente/,
  );
});
test("expired credit cannot be requested and shrinking the current validity invalidates an old voucher", async () => {
  const b = await credit(50);
  await login(member);
  const v = await act("voucher_request", { cashback: 30 });
  const oid = await order(200);
  await owner();
  await query(
    "update dna_benefits set granted_at=now()-interval '400 days' where id=$1",
    [b],
  );
  await login(finance);
  await assert.rejects(
    act("voucher_redeem", { id: v.id, order_id: oid, cashback_used: 30 }),
    /expirou/,
  );
  await login(member);
  await assert.rejects(
    act("voucher_request", { cashback: 10 }),
    /insuficiente/,
  );
});
test("customer can request conversion but only staff can approve and initial category is required", async () => {
  await login(other);
  const req = await act("reseller_request", { message: "Tenho interesse" });
  await assert.rejects(
    act("reseller_decide", {
      id: req.id,
      decision: "approve",
      level: "DNA Profissional",
      reason: "Conferido",
    }),
    /equipe interna/,
  );
  await login(finance);
  await act("reseller_decide", {
    id: req.id,
    decision: "approve",
    level: "DNA Profissional",
    reason: "Cadastro conferido",
  });
  await login(other);
  assert.equal(
    (await query("select role from dna_members"))[0].role,
    "revendedor",
  );
});
test("gift has one active voucher and cannot be delivered twice", async () => {
  await login(admin);
  const b = (
    await act("benefit_grant", {
      member_id: member,
      kind: "gift",
      mode: "fixed",
      value: 0,
      title: "Kit DNA MOR",
      once: true,
      reason: "Boas-vindas",
    })
  ).id;
  await assert.rejects(
    act("benefit_grant", {
      member_id: member,
      kind: "gift",
      mode: "fixed",
      value: 0,
      title: "Kit DNA MOR",
      once: true,
      reason: "Duplicado",
    }),
    /única/,
  );
  await login(member);
  const v = await act("voucher_request", { benefit_id: b });
  assert.equal((await act("voucher_request", { benefit_id: b })).id, v.id);
  await login(finance);
  await act("voucher_redeem", { id: v.id, reason: "Retirado na unidade" });
  await assert.rejects(
    act("voucher_redeem", { id: v.id, reason: "Repetir" }),
    /encerrada/,
  );
});
test("campaign eligibility is calculated on paid purchases and applies stock and per-person limit", async () => {
  await order(500);
  await login(admin);
  const c = await act("campaign_save", {
    name: "Semana",
    starts_on: "2026-01-01",
    ends_on: "2030-12-31",
    audience: "all",
    levels: [],
    state: "active",
    conditions: { purchase_min: 400, referrals_min: 0, match: "all" },
    reward: { kind: "cashback", mode: "fixed", value: 50 },
    expiry: { mode: "days", days: 10 },
    max_awards: 1,
    stock: 1,
  });
  await act("campaign_award", { id: c.id, member_id: member });
  await assert.rejects(
    act("campaign_award", { id: c.id, member_id: member }),
    /Limite/,
  );
  await assert.rejects(
    act("campaign_award", { id: c.id, member_id: other }),
    /Metas/,
  );
  assert.equal(
    Number((await query("select remaining from dna_benefits"))[0].remaining),
    50,
  );
});
test("referral reward is based on paid products, freezes category and prevents double concession", async () => {
  await login(finance);
  const ref = (
    await act("referral_register", { referrer_id: member, referred_id: other })
  ).id;
  await login(admin);
  await act("member_update", {
    id: member,
    role: "revendedor",
    level: "DNA MOR",
    reason: "Subiu de nível",
  });
  const now = new Date().toISOString().slice(0, 10);
  const oid = await order(200, {
    member_id: other,
    ordered_on: now,
    paid_on: now,
  });
  await login(finance);
  await act("referral_decide", {
    id: ref,
    order_id: oid,
    decision: "approve",
    confirmed_new_client: true,
    confirmed_before_order: true,
  });
  const benefits = await query(
    "select * from dna_benefits where member_id=$1",
    [member],
  );
  assert.equal(Number(benefits[0].value), 12);
  await assert.rejects(
    act("referral_decide", {
      id: ref,
      order_id: oid,
      decision: "approve",
      confirmed_new_client: true,
      confirmed_before_order: true,
    }),
    /pendente/,
  );
});
test("concurrent cashback requests cannot reserve the same balance twice", async () => {
  await credit(100);
  await login(member);
  const results = await Promise.allSettled([
    act("voucher_request", { cashback: 80 }),
    act("voucher_request", { cashback: 80 }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
});
test("first-order welcome discount is recorded before reward calculation and cancellation revokes both grants", async () => {
  await owner();
  await query("update dna_members set level='DNA Profissional' where id=$1", [
    member,
  ]);
  await login(finance);
  const ref = (
    await act("referral_register", { referrer_id: member, referred_id: other })
  ).id;
  const now = new Date().toISOString().slice(0, 10);
  const oid = await order(200, {
    member_id: other,
    ordered_on: now,
    paid_on: now,
  });
  await assert.rejects(
    act("referral_decide", {
      id: ref,
      order_id: oid,
      decision: "approve",
      confirmed_new_client: true,
      confirmed_before_order: true,
    }),
    /boas-vindas/,
  );
  await act("referral_decide", {
    id: ref,
    order_id: oid,
    decision: "approve",
    confirmed_new_client: true,
    confirmed_before_order: true,
    confirmed_client_discount: true,
  });
  assert.equal(
    Number(
      (
        await query("select discount_applied from dna_orders where id=$1", [
          oid,
        ])
      )[0].discount_applied,
    ),
    2,
  );
  await act("order_state", {
    id: oid,
    state: "cancelled",
    reason: "Cancelamento confirmado no Omni",
  });
  assert.ok(
    (await query("select state from dna_benefits")).every(
      (b) => b.state === "revoked",
    ),
  );
});
test("campaign repeated percent cashback grants only the newly earned amount", async () => {
  await order(100);
  await login(admin);
  const c = await act("campaign_save", {
    name: "Recorrente",
    starts_on: "2026-01-01",
    ends_on: "2030-12-31",
    audience: "all",
    levels: [],
    state: "active",
    conditions: { purchase_min: 100, referrals_min: 0, match: "all" },
    reward: { kind: "cashback", mode: "percent", value: 10 },
    expiry: { mode: "days", days: 365 },
    max_awards: 2,
    stock: null,
  });
  await act("campaign_award", { id: c.id, member_id: member });
  await order(100);
  await login(admin);
  await act("campaign_award", { id: c.id, member_id: member });
  assert.equal(
    Number(
      (await query("select sum(value) amount from dna_benefits"))[0].amount,
    ),
    20,
  );
});
test("customer cannot redeem someone else voucher and staff must use the owner order", async () => {
  await credit(100);
  await login(member);
  const v = await act("voucher_request", { cashback: 40 });
  await login(other);
  await assert.rejects(
    act("voucher_cancel", { id: v.id, reason: "Tentativa" }),
    /não encontrada/,
  );
  const oid = await order(200, { member_id: other });
  await login(finance);
  await assert.rejects(
    act("voucher_redeem", { id: v.id, order_id: oid, cashback_used: 40 }),
    /titular/,
  );
});
test("configuration rejects incomplete rules and cashback above 50 percent", async () => {
  await login(admin);
  await assert.rejects(act("settings_save", { value: {} }), /incompleta/);
  const config = (await query("select value from dna_settings"))[0].value;
  await assert.rejects(
    act("settings_save", { value: { ...config, cashback_limit: 51 } }),
    /limite/,
  );
  await act("settings_save", { value: { ...config, cashback_limit: 30 } });
  await credit(100);
  const oid = await order(100);
  await login(member);
  const v = await act("voucher_request", { cashback: 40 });
  await login(finance);
  await assert.rejects(
    act("voucher_redeem", { id: v.id, order_id: oid, cashback_used: 40 }),
    /limite/,
  );
});
test("manual revocation requires reason, releases reserved balance and preserves audit", async () => {
  const b = await credit(80);
  await login(member);
  const v = await act("voucher_request", { cashback: 50 });
  await login(finance);
  await assert.rejects(act("benefit_revoke", { id: b }), /justificativa/);
  await act("benefit_revoke", { id: b, reason: "Compra de origem estornada" });
  assert.equal(
    (await query("select state from dna_vouchers where id=$1", [v.id]))[0]
      .state,
    "cancelled",
  );
  assert.equal(
    (await query("select state from dna_benefits where id=$1", [b]))[0].state,
    "revoked",
  );
  assert.ok(
    (await query("select * from dna_audit where action='benefit_revoke'"))
      .length === 1,
  );
});

test("legacy migration preserves identities/codes and imports only unambiguous orders as pending", async () => {
  const legacy = new PGlite();
  try {
    await legacy.exec(`create role anon; create role authenticated; alter default privileges in schema public grant execute on functions to anon,authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table profiles(id uuid primary key,full_name text,role text,level text,referral_code text);
      create table sales(id uuid primary key,revendedor_id uuid,cliente_id uuid,order_number text,revenue_brl numeric,volume_kg numeric,status text,created_at timestamptz);
      create table referrals(id uuid primary key,referrer_id uuid,referred_id uuid,referrer_level_at_creation text,created_at timestamptz);`);
    await legacy.query(
      "insert into auth.users(id,email) values($1,'rev@example.test'),($2,'client@example.test')",
      [member, other],
    );
    await legacy.query(
      "insert into profiles values($1,'Revendedora','revendedor','DNA Master','DNA-ORIGINAL'),($2,'Cliente','cliente',null,null)",
      [member, other],
    );
    await legacy.query(
      "insert into sales values($1,$2,null,'OLD-1',200,5,'approved',now()),($3,$2,$4,'AMBIGUOUS',300,5,'approved',now())",
      [id(10), member, id(11), other],
    );
    await legacy.query(
      "insert into referrals values($1,$2,$3,'DNA Master',now())",
      [id(12), member, other],
    );
    await legacy.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/202610010001_clube_dna.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const members = (await legacy.query("select * from dna_members")).rows;
    assert.equal(
      members.find((m) => m.id === member).referral_code,
      "DNA-ORIGINAL",
    );
    const orders = (await legacy.query("select * from dna_orders")).rows;
    assert.equal(orders.length, 1);
    assert.equal(orders[0].state, "pending");
    assert.equal(orders[0].omni_number, "OLD-1");
    assert.equal(
      (await legacy.query("select state from dna_referrals")).rows[0].state,
      "pending",
    );
    assert.equal(
      (await legacy.query("select count(*) from sales")).rows[0].count,
      2,
    );
  } finally {
    await legacy.close();
  }
});
