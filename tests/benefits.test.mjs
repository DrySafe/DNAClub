import { test } from "node:test";
import assert from "node:assert/strict";
import {
  creditBalance,
  dateLabel,
  dayInBrazil,
  expiryOf,
  quoteOrder,
  whatsappUrl,
} from "../src/utils/benefits.js";
const settings = {
  allow_combination: true,
  cashback_limit: 50,
  validity_days: 365,
};
test("cashback is capped after discount and excludes freight", () => {
  assert.deepEqual(
    quoteOrder({
      products: 200,
      freight: 30,
      discount: { mode: "percent", value: 10 },
      cashback: 90,
      settings,
    }),
    { discount: 20, cashback: 90, maximumCashback: 90, payable: 120 },
  );
  assert.throws(
    () =>
      quoteOrder({
        products: 200,
        freight: 100,
        discount: { mode: "percent", value: 10 },
        cashback: 90.01,
        settings,
      }),
    /máximo/,
  );
});
test("current configuration forbids even previously requested combinations", () => {
  assert.throws(
    () =>
      quoteOrder({
        products: 200,
        discount: { mode: "percent", value: 10 },
        cashback: 20,
        settings: { ...settings, allow_combination: false },
      }),
    /configuração atual/,
  );
});
test("fixed discounts must be used in full and discounts never stack", () => {
  assert.throws(
    () =>
      quoteOrder({
        products: 20,
        discount: { mode: "fixed", value: 30 },
        settings,
      }),
    /integralmente/,
  );
  assert.throws(
    () =>
      quoteOrder({
        products: 200,
        discount: { mode: "percent", value: 10 },
        existingDiscount: 5,
        settings,
      }),
    /não acumulam/,
  );
});
test("all origins accumulate, but expired credits and active reservations are excluded", () => {
  const data = {
    settings,
    campaigns: [],
    benefits: [
      {
        id: "a",
        member_id: "m",
        kind: "cashback",
        state: "available",
        remaining: 50,
        granted_at: "2026-10-01T12:00:00Z",
      },
      {
        id: "b",
        member_id: "m",
        kind: "cashback",
        state: "available",
        remaining: 25.25,
        granted_at: "2026-10-01T12:00:00Z",
      },
      {
        id: "expired",
        member_id: "m",
        kind: "cashback",
        state: "available",
        remaining: 100,
        granted_at: "2024-10-01T12:00:00Z",
      },
    ],
    vouchers: [
      { id: "v", member_id: "m", state: "requested" },
      { id: "done", member_id: "m", state: "used" },
    ],
    allocations: [
      { voucher_id: "v", benefit_id: "a", amount: 20 },
      { voucher_id: "done", benefit_id: "b", amount: 5 },
    ],
  };
  assert.deepEqual(creditBalance("m", data, new Date("2026-10-02T12:00:00Z")), {
    total: 75.25,
    reserved: 20,
    available: 55.25,
  });
});
test("campaign expiry uses current rules and includes the final day in Brazil", () => {
  const benefit = { granted_at: "2026-10-01T12:00:00Z", campaign_id: "c" };
  assert.equal(
    expiryOf(benefit, settings, [
      { id: "c", expiry: { mode: "date", date: "2026-10-31" } },
    ]).toISOString(),
    "2026-11-01T03:00:00.000Z",
  );
  assert.equal(
    expiryOf(benefit, settings, [
      { id: "c", expiry: { mode: "days", days: 7 } },
    ]).toISOString(),
    "2026-10-08T12:00:00.000Z",
  );
});
test("WhatsApp identifies the voucher without disclosing documents", () => {
  const url = whatsappUrl(
    "+55 (11) 99999-9999",
    { code: "DNA-TEST", cashback_requested: 30 },
    null,
    { full_name: "Maria", cpf_cnpj: "private" },
  );
  assert.match(url, /^https:\/\/wa.me\/5511999999999/);
  assert.match(decodeURIComponent(url), /DNA-TEST/);
  assert.doesNotMatch(url, /private/);
  assert.throws(() => whatsappUrl("", {}, null, {}), /configurar/);
});

test("dates and expiration boundaries use the Brazil business timezone", () => {
  assert.equal(dateLabel("2026-11-01T02:59:59Z"), "31/10/2026");
  assert.equal(dayInBrazil("2026-11-01T00:30:00Z"), "2026-10-31");
  assert.equal(dateLabel("2026-11-01"), "01/11/2026");
});
