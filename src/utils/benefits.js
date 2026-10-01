export const LEVELS = [
  "DNA Profissional",
  "DNA Referência",
  "DNA Master",
  "DNA MOR",
];
export const currency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
export const dateLabel = (value) =>
  value
    ? new Date(
        value.length === 10 ? `${value}T12:00:00-03:00` : value,
      ).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "—";
export const cents = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100);
export const dayInBrazil = (value) =>
  value.length === 10
    ? value
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value));
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const isStaff = (role) => ["admin", "financeiro"].includes(role);
export const labels = {
  cliente: "Cliente",
  revendedor: "Revendedora",
  financeiro: "Financeiro",
  admin: "Administrador",
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
  refunded: "Estornado",
  approved: "Aprovado",
  rejected: "Recusado",
  requested: "Solicitado",
  handling: "Em atendimento",
  used: "Utilizado",
  returned: "Devolvido",
  available: "Disponível",
  revoked: "Revogado",
  draft: "Rascunho",
  active: "Ativa",
  paused: "Pausada",
  ended: "Encerrada",
  cashback: "Cashback",
  discount: "Desconto",
  gift: "Brinde",
  expired: "Vencido",
};

export function expiryOf(benefit, settings, campaigns = []) {
  const campaign = campaigns.find((c) => c.id === benefit.campaign_id);
  if (campaign?.expiry?.mode === "date") {
    const end = new Date(`${campaign.expiry.date}T03:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    return end;
  }
  return new Date(
    new Date(benefit.granted_at).getTime() +
      Number(campaign?.expiry?.days ?? settings.validity_days ?? 365) *
        86400000,
  );
}

export function creditBalance(memberId, data, now = new Date()) {
  const credits = data.benefits.filter(
    (b) =>
      b.member_id === memberId &&
      b.kind === "cashback" &&
      b.state === "available" &&
      expiryOf(b, data.settings, data.campaigns) > now,
  );
  const creditIds = new Set(credits.map((b) => b.id));
  const pendingIds = new Set(
    data.vouchers
      .filter(
        (v) =>
          v.member_id === memberId &&
          ["requested", "handling"].includes(v.state),
      )
      .map((v) => v.id),
  );
  const balance = credits.reduce((sum, b) => sum + cents(b.remaining), 0);
  const reserved = data.allocations
    .filter((a) => creditIds.has(a.benefit_id) && pendingIds.has(a.voucher_id))
    .reduce((sum, a) => sum + cents(a.amount), 0);
  return {
    total: balance / 100,
    reserved: reserved / 100,
    available: Math.max(0, balance - reserved) / 100,
  };
}

export function effectiveDiscount(benefit, data) {
  let rule;
  if (benefit.source === "Indicação") {
    const referral = data.referrals.find((r) => r.id === benefit.referral_id);
    rule = data.settings.referral_rules[referral?.level_at_creation];
  } else if (benefit.campaign_id)
    rule = data.campaigns.find((c) => c.id === benefit.campaign_id)?.reward;
  return rule?.kind === "discount" && rule.mode === benefit.mode
    ? Number(rule.value)
    : Number(benefit.value);
}

export function quoteOrder({
  products,
  freight = 0,
  discount = null,
  cashback = 0,
  settings,
  existingDiscount = 0,
  existingCashback = 0,
}) {
  const productsCents = cents(products);
  if (!Number.isFinite(productsCents) || productsCents <= 0)
    throw new Error("Informe o valor dos produtos.");
  const amount = discount
    ? discount.mode === "percent"
      ? Math.round((productsCents * Number(discount.value)) / 100)
      : cents(discount.value)
    : 0;
  if (amount + cents(existingDiscount) > productsCents)
    throw new Error(
      "O desconto precisa ser utilizado integralmente em um pedido suficiente.",
    );
  if (discount && existingDiscount > 0)
    throw new Error("Descontos não acumulam no mesmo pedido.");
  const cashbackCents = cents(cashback);
  if (!Number.isFinite(cashbackCents) || cashbackCents < 0)
    throw new Error("Cashback inválido.");
  if (
    amount + cents(existingDiscount) > 0 &&
    cashbackCents + cents(existingCashback) > 0 &&
    !settings.allow_combination
  )
    throw new Error(
      "A configuração atual não permite combinar desconto e cashback.",
    );
  const net = productsCents - amount - cents(existingDiscount);
  const limit = Math.round((net * Number(settings.cashback_limit)) / 100);
  if (cashbackCents + cents(existingCashback) > limit)
    throw new Error(
      `Cashback máximo disponível neste pedido: ${currency(Math.max(0, limit - cents(existingCashback)) / 100)}.`,
    );
  return {
    discount: amount / 100,
    cashback: cashbackCents / 100,
    maximumCashback: Math.max(0, limit - cents(existingCashback)) / 100,
    payable:
      (net - cashbackCents - cents(existingCashback) + cents(freight)) / 100,
  };
}

export function campaignProgress(campaign, member, data) {
  const eligibleOrders = data.orders.filter(
    (o) =>
      o.member_id === member.id &&
      o.state === "paid" &&
      o.paid_on >= campaign.starts_on &&
      o.paid_on <= campaign.ends_on,
  );
  const purchases =
    eligibleOrders.reduce(
      (sum, o) =>
        sum +
        cents(o.products) -
        cents(o.discount_applied) -
        cents(o.cashback_applied),
      0,
    ) / 100;
  const referrals = data.referrals.filter(
    (r) =>
      r.referrer_id === member.id &&
      r.state === "approved" &&
      dayInBrazil(r.created_at) >= campaign.starts_on &&
      dayInBrazil(r.created_at) <= campaign.ends_on &&
      data.orders.some(
        (o) =>
          o.id === r.order_id &&
          o.state === "paid" &&
          o.paid_on >= campaign.starts_on &&
          o.paid_on <= campaign.ends_on,
      ),
  ).length;
  return { purchases, referrals };
}

export function whatsappUrl(phone, voucher, benefit, member) {
  const number = String(phone || "").replace(/\D/g, "");
  if (number.length < 10 || number.length > 15)
    throw new Error("A equipe precisa configurar o WhatsApp da empresa.");
  const text = `Olá! Quero utilizar meu benefício na compra.\nVoucher: ${voucher.code}\nTitular: ${member.full_name}\n${benefit ? `Benefício: ${benefit.title}\n` : ""}${Number(voucher.cashback_requested) > 0 ? `Cashback solicitado: ${currency(voucher.cashback_requested)}\n` : ""}Por favor, confira as condições atuais e aplique no meu pedido.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function exportCsv(rows, filename) {
  if (!rows.length) throw new Error("Não há registros para exportar.");
  const keys = Object.keys(rows[0]);
  const quote = (value) =>
    `"${String(value ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  const csv =
    "\ufeff" +
    [keys, ...rows.map((row) => keys.map((k) => row[k]))]
      .map((row) => row.map(quote).join(";"))
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
