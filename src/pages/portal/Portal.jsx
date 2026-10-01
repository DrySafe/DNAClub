import Brand from "../../components/Brand.jsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  Award,
  BarChart3,
  ChevronRight,
  Gift,
  Home,
  LogOut,
  Menu,
  Settings,
  Share2,
  ShoppingBag,
  Ticket,
  Users,
  Wallet,
  X,
  Megaphone,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { supabase } from "../../config/supabaseClient.js";
import { action, loadPortal } from "../../services/portalService.js";
import {
  LEVELS,
  campaignProgress,
  creditBalance,
  currency,
  dateLabel,
  dayInBrazil,
  effectiveDiscount,
  expiryOf,
  exportCsv,
  isStaff,
  labels,
  quoteOrder,
  today,
  whatsappUrl,
} from "../../utils/benefits.js";

const NAV = [
  ["inicio", "Início", Home, "all"],
  ["compras", "Minhas compras", ShoppingBag, "member"],
  ["indicacoes", "Indicações", Share2, "reseller"],
  ["beneficios", "Meus benefícios", Wallet, "member"],
  ["solicitacoes", "Solicitações", Ticket, "all"],
  ["campanhas", "Campanhas", Megaphone, "all"],
  ["revenda", "Quero ser revendedor", Award, "client"],
  ["pessoas", "Pessoas", Users, "staff"],
  ["pedidos", "Pedidos", ShoppingBag, "staff"],
  ["validacoes", "Indicações", Share2, "staff"],
  ["entregas", "Brindes e entregas", Gift, "staff"],
  ["aprovacoes", "Solicitações de revenda", Award, "staff"],
  ["relatorios", "Relatórios", BarChart3, "staff"],
  ["configuracoes", "Configurações", Settings, "admin"],
  ["historico", "Histórico de alterações", RefreshCw, "admin"],
  ["perfil", "Meu perfil", UserRound, "all"],
];
const roleOptions = Object.entries({
  cliente: "Cliente",
  revendedor: "Revendedora",
  financeiro: "Financeiro",
  admin: "Administrador",
});
const kindOptions = [
  ["discount", "Desconto"],
  ["cashback", "Cashback"],
  ["gift", "Brinde"],
];
const field = (name, label, type = "text", extra = {}) => ({
  name,
  label,
  type,
  ...extra,
});
const optionRows = (members) =>
  members
    .filter((m) => ["cliente", "revendedor"].includes(m.role))
    .map((m) => [m.id, `${m.full_name} · ${m.email}`]);
const status = (value) => (
  <span className={`status status-${value}`}>{labels[value] || value}</span>
);
const memberName = (data, id) =>
  data.members.find((m) => m.id === id)?.full_name || "Participante";
const moneyFields = [
  field("products", "Valor dos produtos (R$)", "number", {
    min: 0.01,
    step: "0.01",
  }),
  field("freight", "Frete (R$)", "number", {
    min: 0,
    step: "0.01",
    defaultValue: 0,
  }),
  field("weight_kg", "Peso (kg)", "number", {
    min: 0,
    step: "0.001",
    defaultValue: 0,
  }),
];

function Empty({ children = "Nenhum registro por aqui ainda." }) {
  return (
    <div className="empty">
      <Gift size={28} />
      <p>{children}</p>
    </div>
  );
}
function Stat({ label, value, hint, icon: Icon = Wallet }) {
  return (
    <article className="stat">
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}
function Table({ columns, rows, empty }) {
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty>{empty}</Empty>
  );
}
function Section({ title, description, children, action: button }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {button}
      </div>
      {children}
    </section>
  );
}

function Sheet({ spec, close, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    function key(e) {
      if (e.key === "Escape" && !busy) close();
      if (e.key === "Tab") {
        const elements = [
          ...ref.current.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),select,textarea,a[href]",
          ),
        ];
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [busy, close]);
  return (
    <div className="sheet-backdrop">
      <section
        ref={ref}
        tabIndex={-1}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <div className="panel-heading">
          <h2 id="sheet-title">{spec.title}</h2>
          <button
            className="icon-button"
            aria-label="Fechar"
            disabled={busy}
            onClick={close}
          >
            <X />
          </button>
        </div>
        {spec.note && <p className="notice">{spec.note}</p>}
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            spec.fields
              .filter((x) => x.type === "checkbox")
              .forEach((x) => {
                f[x.name] = f[x.name] === "on";
              });
            await spec.submit(f);
          }}
        >
          {spec.fields.map((f) => (
            <label
              key={f.name}
              className={f.type === "checkbox" ? "check" : ""}
            >
              {f.type !== "checkbox" && f.label}
              {f.type === "select" ? (
                <select
                  aria-label={f.label}
                  name={f.name}
                  required={f.required !== false}
                  defaultValue={spec.initial?.[f.name] ?? f.defaultValue ?? ""}
                >
                  <option value="">Selecione</option>
                  {f.options.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  aria-label={f.label}
                  name={f.name}
                  required={f.required !== false}
                  defaultValue={spec.initial?.[f.name] ?? f.defaultValue ?? ""}
                />
              ) : (
                <input
                  aria-label={f.label}
                  name={f.name}
                  type={f.type}
                  required={f.required ?? f.type !== "checkbox"}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  minLength={f.minLength}
                  list={f.suggestions ? `list-${f.name}` : undefined}
                  defaultChecked={
                    f.type === "checkbox"
                      ? Boolean(spec.initial?.[f.name] ?? f.defaultValue)
                      : undefined
                  }
                  defaultValue={
                    f.type === "checkbox"
                      ? undefined
                      : (spec.initial?.[f.name] ?? f.defaultValue ?? "")
                  }
                />
              )}
              {f.suggestions && (
                <datalist id={`list-${f.name}`}>
                  {f.suggestions.filter(Boolean).map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              )}
              {f.type === "checkbox" && f.label}
              {f.hint && <small>{f.hint}</small>}
            </label>
          ))}
          <div className="form-actions">
            <button type="button" disabled={busy} onClick={close}>
              Cancelar
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Salvando…" : spec.submitLabel || "Confirmar"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Portal() {
  const { section = "inicio" } = useParams();
  const { profile, logout, refreshProfile } = useAuth();
  const staff = isStaff(profile.role),
    admin = profile.role === "admin";
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [sheet, setSheet] = useState(null),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState("");
  const [benefitTab, setBenefitTab] = useState("discount");
  const [reportMember, setReportMember] = useState(""),
    [reportFrom, setReportFrom] = useState(""),
    [reportTo, setReportTo] = useState("");
  const nav = NAV.filter(
    ([, , , access]) =>
      access === "all" ||
      (access === "member" && !staff) ||
      (access === "staff" && staff) ||
      (access === "admin" && admin) ||
      (access === "client" && profile.role === "cliente") ||
      (access === "reseller" && profile.role === "revendedor"),
  );
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadPortal(staff);
      setData(result);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [staff]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    setSearch("");
    setMobile(false);
    setMessage("");
    setSheet(null);
  }, [section]);
  async function mutate(name, payload) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await action(name, payload);
      setSheet(null);
      setMessage(
        name === "voucher_request"
          ? `Solicitação registrada${result.code ? ": " + result.code : ""}. Compartilhe em Solicitações.`
          : "Operação registrada com sucesso.",
      );
      await refresh();
      if (["profile_save", "member_update", "reseller_decide"].includes(name))
        refreshProfile();
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  const closeSheet = useCallback(() => setSheet(null), []);
  function open(title, fields, name, initial = {}, extra = {}, note = "") {
    setError("");
    setSheet({
      title,
      fields,
      initial,
      note,
      submit: (f) => mutate(name, { ...extra, ...f }),
    });
  }
  function notifyError(e) {
    setError(e.message);
  }
  function share(voucher) {
    try {
      window.open(
        whatsappUrl(
          data.settings.company_whatsapp,
          voucher,
          data.benefits.find((b) => b.id === voucher.benefit_id),
          data.members.find((m) => m.id === voucher.member_id) || profile,
        ),
        "_blank",
        "noopener,noreferrer",
      );
    } catch (e) {
      notifyError(e);
    }
  }
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copiado para a área de transferência.");
    } catch {
      setError(
        "Não foi possível copiar. Selecione o código e copie manualmente.",
      );
    }
  }
  if (!nav.some(([key]) => key === section))
    return <Navigate to="/app/inicio" replace />;
  const title = nav.find(([key]) => key === section)?.[1];
  const filtered = (rows) =>
    rows.filter(
      (row) =>
        !search ||
        JSON.stringify(row)
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()) ||
        memberName(data, row.member_id || row.referred_id)
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
    );
  const mine = (rows) => rows.filter((row) => row.member_id === profile.id);
  const balance = data
    ? creditBalance(profile.id, data)
    : { total: 0, reserved: 0, available: 0 };
  const benefitText = (b) =>
    b.kind === "gift"
      ? b.title
      : b.kind === "cashback"
        ? currency(b.remaining)
        : b.mode === "percent"
          ? `${effectiveDiscount(b, data)}% de desconto`
          : `${currency(effectiveDiscount(b, data))} de desconto`;
  const currentRulesNote =
    "As regras atuais valem também para benefícios e vouchers antigos. Cashback não pode ser sacado nem transferido; seu uso é exclusivo em produtos.";

  function requestBenefit(b) {
    const fields = [];
    if (!b || b.kind === "cashback")
      fields.push(
        field("cashback", "Cashback a solicitar (R$)", "number", {
          min: 0.01,
          max: balance.available,
          step: "0.01",
        }),
      );
    else if (b.kind === "discount" && data.settings.allow_combination)
      fields.push(
        field("cashback", "Adicionar cashback (R$)", "number", {
          min: 0,
          max: balance.available,
          step: "0.01",
          defaultValue: 0,
        }),
      );
    open(
      b?.kind === "gift"
        ? "Solicitar recebimento do brinde"
        : "Solicitar utilização",
      fields,
      "voucher_request",
      {},
      { benefit_id: b?.kind !== "cashback" ? b?.id : null },
      `${b && b.kind !== "cashback" ? benefitText(b) + ". " : ""}Disponível: ${currency(balance.available)}. O limite atual é ${data.settings.cashback_limit}% dos produtos após desconto, sem frete. A equipe confere o pedido antes de confirmar.`,
    );
  }
  function orderForm() {
    open(
      "Registrar pedido do Omni",
      [
        field("member_id", "Titular", "select", {
          options: optionRows(data.members),
        }),
        field("omni_number", "Número do pedido no Omni"),
        ...moneyFields,
        field("ordered_on", "Data do pedido", "date", {
          defaultValue: today(),
        }),
        field("state", "Pagamento", "select", {
          options: [
            ["pending", "Pendente"],
            ["paid", "Pago"],
          ],
          defaultValue: "pending",
        }),
        field("paid_on", "Data do pagamento (obrigatória para pago)", "date", {
          required: false,
          defaultValue: today(),
        }),
      ],
      "order_save",
    );
  }
  function grantForm() {
    const fields = [
      field("member_id", "Participante", "select", {
        options: optionRows(data.members),
      }),
      field("title", "Nome do benefício", "text", {
        suggestions: data.settings.gift_catalog,
      }),
      field("kind", "Tipo", "select", {
        options: kindOptions,
        defaultValue: "gift",
      }),
      field("mode", "Forma de cálculo", "select", {
        options: [
          ["fixed", "Valor em R$ / brinde"],
          ["percent", "Desconto percentual"],
        ],
        defaultValue: "fixed",
      }),
      field("value", "Valor ou percentual (0 para brinde)", "number", {
        min: 0,
        step: "0.01",
        defaultValue: 0,
      }),
      field("once", "Concessão única para este participante", "checkbox"),
      field("reason", "Origem e justificativa", "textarea"),
    ];
    open(
      "Conceder benefício",
      fields,
      "benefit_grant",
      {},
      {},
      "Cashback manual é sempre informado em R$. Placa e kit DNA MOR devem ser marcados como concessão única.",
    );
  }
  function redeemForm(v) {
    const b = data.benefits.find((b) => b.id === v.benefit_id);
    if (b?.kind === "gift")
      return open(
        "Confirmar entrega",
        [field("reason", "Detalhes da entrega / retirada", "textarea")],
        "voucher_redeem",
        {},
        { id: v.id },
      );
    const orders = data.orders.filter(
      (o) =>
        o.member_id === v.member_id && ["paid", "pending"].includes(o.state),
    );
    setSheet({
      title: `Aplicar voucher ${v.code}`,
      fields: [
        field("order_id", "Pedido do titular", "select", {
          options: orders.map((o) => [
            o.id,
            `Omni ${o.omni_number} · ${currency(o.products)} em produtos`,
          ]),
        }),
        field(
          "cashback_used",
          "Cashback efetivamente aplicado (R$)",
          "number",
          {
            min: 0,
            max: v.cashback_requested,
            step: "0.01",
            defaultValue: v.cashback_requested,
          },
        ),
      ],
      note: "Confirme somente depois de aplicar no pedido. O portal verifica novamente a configuração atual.",
      submit: async (f) => {
        try {
          const order = orders.find((o) => o.id === f.order_id);
          const quote = quoteOrder({
            products: order.products,
            freight: order.freight,
            discount: b ? { ...b, value: effectiveDiscount(b, data) } : null,
            cashback: f.cashback_used,
            settings: data.settings,
            existingDiscount: order.discount_applied,
            existingCashback: order.cashback_applied,
          });
          if (
            !window.confirm(
              `Confirmar desconto de ${currency(quote.discount)} e cashback de ${currency(quote.cashback)} no pedido ${order.omni_number}?`,
            )
          )
            return;
          await mutate("voucher_redeem", { id: v.id, ...f });
        } catch (e) {
          notifyError(e);
        }
      },
    });
  }
  function voucherRows(rows) {
    return filtered(rows)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((v) => {
        const b = data.benefits.find((b) => b.id === v.benefit_id);
        return [
          <strong>{v.code}</strong>,
          staff ? memberName(data, v.member_id) : dateLabel(v.created_at),
          <>
            {b && <div>{benefitText(b)}</div>}
            {Number(v.cashback_requested) > 0 && (
              <div>Cashback: {currency(v.cashback_requested)}</div>
            )}
            {v.reason && <small>{v.reason}</small>}
          </>,
          status(v.state),
          v.order_id
            ? data.orders.find((o) => o.id === v.order_id)?.omni_number
            : "—",
          <div className="row-actions">
            {["requested", "handling"].includes(v.state) && (
              <>
                {!staff && <button onClick={() => share(v)}>WhatsApp</button>}
                <button
                  disabled={busy}
                  onClick={() =>
                    open(
                      "Cancelar solicitação",
                      [field("reason", "Motivo", "textarea")],
                      "voucher_cancel",
                      {},
                      { id: v.id },
                    )
                  }
                >
                  Cancelar
                </button>
                {staff && v.state === "requested" && (
                  <button
                    disabled={busy}
                    onClick={() => mutate("voucher_handle", { id: v.id })}
                  >
                    Atender
                  </button>
                )}
                {staff && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => redeemForm(v)}
                  >
                    {b?.kind === "gift" ? "Entregar" : "Aplicar"}
                  </button>
                )}
              </>
            )}
            {staff && v.state === "used" && (
              <button
                onClick={() =>
                  open(
                    "Devolver benefício",
                    [field("reason", "Justificativa obrigatória", "textarea")],
                    "voucher_return",
                    {},
                    { id: v.id },
                    "A devolução restaura o benefício; a validade continua sujeita à regra atual. Registre o cancelamento do pedido em seguida, quando aplicável.",
                  )
                }
              >
                Devolver
              </button>
            )}
            <button
              aria-label={`Copiar voucher ${v.code}`}
              onClick={() => copy(v.code)}
            >
              Copiar
            </button>
          </div>,
        ];
      });
  }
  function campaignForm(c) {
    const initial = c
      ? {
          ...c,
          purchase_min: c.conditions.purchase_min,
          referrals_min: c.conditions.referrals_min,
          match: c.conditions.match,
          kind: c.reward.kind,
          mode: c.reward.mode,
          value: c.reward.value,
          gift: c.reward.gift,
          expiry_mode: c.expiry.mode,
          expiry_days: c.expiry.days,
          expiry_date: c.expiry.date,
          level: c.levels.length === 1 ? c.levels[0] : "",
        }
      : {
          starts_on: today(),
          ends_on: today(),
          audience: "all",
          state: "draft",
          purchase_min: 0,
          referrals_min: 0,
          match: "all",
          kind: "discount",
          mode: "percent",
          value: 5,
          expiry_mode: "days",
          expiry_days: 365,
          max_awards: 1,
        };
    setSheet({
      title: c ? "Editar campanha" : "Criar campanha",
      initial,
      note: "Compras contam pelo valor dos produtos efetivamente pago, sem frete. Alterações de condições de uso alcançam benefícios e vouchers pendentes. Metas de indicação exigem público de revendedoras.",
      fields: [
        field("name", "Nome"),
        field("description", "Descrição", "textarea", { required: false }),
        field("starts_on", "Início", "date"),
        field("ends_on", "Fim", "date"),
        field("audience", "Público", "select", {
          options: [
            ["all", "Clientes e revendedoras"],
            ["cliente", "Clientes"],
            ["revendedor", "Revendedoras"],
          ],
        }),
        field("level", "Categoria específica (opcional)", "select", {
          required: false,
          options: LEVELS.map((l) => [l, l]),
        }),
        field("purchase_min", "Meta de compras pagas (R$)", "number", {
          min: 0,
          step: "0.01",
        }),
        field(
          "referrals_min",
          "Meta de indicações com primeiro pedido pago",
          "number",
          { min: 0, step: 1 },
        ),
        field("match", "Condições", "select", {
          options: [
            ["all", "Cumprir todas"],
            ["any", "Cumprir pelo menos uma"],
          ],
        }),
        field("kind", "Recompensa", "select", { options: kindOptions }),
        field("mode", "Cálculo", "select", {
          options: [
            ["percent", "Percentual"],
            ["fixed", "Valor fixo / brinde"],
          ],
        }),
        field("value", "Valor ou percentual (0 para brinde)", "number", {
          min: 0,
          step: "0.01",
        }),
        field("gift", "Nome do brinde", "text", {
          required: false,
          suggestions: data.settings.gift_catalog,
        }),
        field("expiry_mode", "Prazo de utilização", "select", {
          options: [
            ["days", "Dias após a concessão"],
            ["date", "Data final fixa"],
          ],
        }),
        field("expiry_days", "Dias para uso", "number", {
          min: 1,
          max: 3650,
          required: false,
        }),
        field("expiry_date", "Último dia para solicitar e usar", "date", {
          required: false,
        }),
        field(
          "max_awards",
          "Máximo de recompensas por participante",
          "number",
          { min: 1, step: 1 },
        ),
        field("stock", "Disponibilidade total (vazio = sem limite)", "number", {
          min: 0,
          step: 1,
          required: false,
        }),
        field("state", "Situação", "select", {
          options: [
            ["draft", "Rascunho"],
            ["active", "Ativa"],
            ["paused", "Pausada"],
            ["ended", "Encerrada"],
          ],
        }),
      ],
      submit: (f) =>
        mutate("campaign_save", {
          ...(c ? { id: c.id } : {}),
          name: f.name,
          description: f.description,
          starts_on: f.starts_on,
          ends_on: f.ends_on,
          audience: f.audience,
          levels: f.level ? [f.level] : [],
          state: f.state,
          conditions: {
            purchase_min: Number(f.purchase_min),
            referrals_min: Number(f.referrals_min),
            match: f.match,
          },
          reward: {
            kind: f.kind,
            mode: f.mode,
            value: Number(f.value),
            gift: f.gift,
          },
          expiry:
            f.expiry_mode === "date"
              ? { mode: "date", date: f.expiry_date }
              : { mode: "days", days: Number(f.expiry_days) },
          max_awards: Number(f.max_awards),
          stock: f.stock || null,
        }),
    });
  }

  function content() {
    if (!data) return null;
    if (section === "inicio") {
      const orders = staff ? data.orders : mine(data.orders);
      const paidTotal = orders
        .filter((o) => o.state === "paid")
        .reduce(
          (s, o) =>
            s +
            Number(o.products) -
            Number(o.discount_applied) -
            Number(o.cashback_applied),
          0,
        );
      const vouchers = staff ? data.vouchers : mine(data.vouchers);
      return (
        <>
          <section className="welcome">
            <div>
              <p className="eyebrow">
                {staff ? "OPERAÇÃO DO CLUBE" : "SEU CLUBE, SUAS CONQUISTAS"}
              </p>
              <h2>Olá, {profile.full_name.split(" ")[0] || "bem-vinda"}.</h2>
              <p>
                {staff
                  ? "Acompanhe as solicitações e mantenha os benefícios em dia."
                  : "Tudo para acompanhar seus benefícios e aproveitar sua próxima compra."}
              </p>
              <Link
                className="primary button"
                to={staff ? "/app/solicitacoes" : "/app/beneficios"}
              >
                {staff ? "Ver solicitações" : "Ver meus benefícios"}{" "}
                <ChevronRight size={17} />
              </Link>
            </div>
            <div className="welcome-seal">
              <Award size={44} />
              <span>
                {profile.level ||
                  (staff ? "Equipe Depilamor" : "Cliente do clube")}
              </span>
            </div>
          </section>
          <div className="stats">
            {staff ? (
              <>
                <Stat
                  label="Participantes"
                  value={
                    data.members.filter((m) =>
                      ["cliente", "revendedor"].includes(m.role),
                    ).length
                  }
                  icon={Users}
                />
                <Stat
                  label="Indicações pendentes"
                  value={
                    data.referrals.filter((r) => r.state === "pending").length
                  }
                  icon={Share2}
                />
              </>
            ) : (
              <>
                <Stat
                  label="Cashback em produtos"
                  value={currency(balance.total)}
                  hint={`${currency(balance.reserved)} reservado`}
                />
                <Stat
                  label="Descontos disponíveis"
                  value={
                    mine(data.benefits).filter(
                      (b) =>
                        b.kind === "discount" &&
                        b.state === "available" &&
                        expiryOf(b, data.settings, data.campaigns) > new Date(),
                    ).length
                  }
                  icon={Ticket}
                />
              </>
            )}
            <Stat
              label="Compras pagas"
              value={currency(paidTotal)}
              hint="Produtos, sem frete"
              icon={ShoppingBag}
            />
            <Stat
              label="Solicitações abertas"
              value={
                vouchers.filter((v) =>
                  ["requested", "handling"].includes(v.state),
                ).length
              }
              icon={Ticket}
            />
          </div>
          <Section
            title="Solicitações recentes"
            description="Acompanhe o andamento de cada benefício."
          >
            <Table
              columns={[
                "Voucher",
                staff ? "Titular" : "Data",
                "Benefício",
                "Situação",
                "Omni",
                "Ações",
              ]}
              rows={voucherRows(
                vouchers
                  .slice()
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 5),
              )}
            />
          </Section>
          <div className="notice">{currentRulesNote}</div>
          {profile.role === "revendedor" && (
            <Section
              title={`Benefícios ${profile.level}`}
              description={data.settings.classification_description}
            >
              <ul className="level-benefits">
                {(data.settings.level_benefits?.[profile.level] || []).map(
                  (item) => (
                    <li key={item}>{item}</li>
                  ),
                )}
              </ul>
            </Section>
          )}
        </>
      );
    }
    if (section === "compras" || section === "pedidos")
      return (
        <Section
          title={staff ? "Pedidos do Omni" : "Histórico de compras"}
          description="Registro manual e conferência pela equipe Depilamor."
          action={
            staff && (
              <button className="primary" onClick={orderForm}>
                Registrar pedido
              </button>
            )
          }
        >
          <Table
            columns={[
              "Pedido",
              ...(staff ? ["Titular"] : []),
              "Data",
              "Produtos",
              "Frete",
              "Peso",
              "Desconto / cashback",
              "Situação",
              ...(staff ? ["Ações"] : []),
            ]}
            rows={filtered(staff ? data.orders : mine(data.orders))
              .sort((a, b) => b.ordered_on.localeCompare(a.ordered_on))
              .map((o) => [
                <>
                  {o.omni_number}
                  {o.note && <small>{o.note}</small>}
                </>,
                ...(staff ? [memberName(data, o.member_id)] : []),
                dateLabel(o.ordered_on),
                currency(o.products),
                currency(o.freight),
                `${o.weight_kg} kg`,
                `${currency(o.discount_applied)} / ${currency(o.cashback_applied)}`,
                status(o.state),
                ...(staff
                  ? [
                      <div className="row-actions">
                        {o.state === "pending" && (
                          <button
                            onClick={() =>
                              open(
                                "Confirmar pagamento",
                                [
                                  field(
                                    "paid_on",
                                    "Data do pagamento",
                                    "date",
                                    { defaultValue: today() },
                                  ),
                                ],
                                "order_state",
                                {},
                                { id: o.id, state: "paid" },
                              )
                            }
                          >
                            Confirmar pagamento
                          </button>
                        )}
                        {["pending", "paid"].includes(o.state) && (
                          <button
                            onClick={() =>
                              open(
                                "Cancelar ou estornar pedido",
                                [
                                  field("state", "Situação", "select", {
                                    options: [
                                      ["cancelled", "Cancelado"],
                                      ["refunded", "Estornado"],
                                    ],
                                  }),
                                  field("reason", "Justificativa", "textarea"),
                                ],
                                "order_state",
                                {},
                                { id: o.id },
                              )
                            }
                          >
                            Cancelar / estornar
                          </button>
                        )}
                      </div>,
                    ]
                  : []),
              ])}
          />
        </Section>
      );
    if (section === "indicacoes" || section === "validacoes") {
      const refs = staff
        ? data.referrals
        : data.referrals.filter((r) => r.referrer_id === profile.id);
      return (
        <>
          {!staff && (
            <Section
              title="Compartilhe sua indicação"
              description="A pessoa indicada precisa ser cliente nova e informar a indicação antes da conclusão do primeiro pedido."
            >
              <div className="referral-link">
                <strong>{profile.referral_code}</strong>
                <button
                  onClick={() =>
                    copy(
                      `${window.location.origin}/indicacao?ref=${profile.referral_code}`,
                    )
                  }
                >
                  Copiar link
                </button>
                <a
                  className="button primary"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://wa.me/?text=${encodeURIComponent(`Conheça o Clube DNA Depilamor! Informe minha indicação antes de concluir seu primeiro pedido: ${window.location.origin}/indicacao?ref=${profile.referral_code}`)}`}
                >
                  Compartilhar
                </a>
              </div>
            </Section>
          )}
          <Section
            title="Acompanhamento de indicações"
            description="A concessão depende do primeiro pedido pago e da conferência da equipe."
            action={
              staff && (
                <button
                  className="primary"
                  onClick={() =>
                    open(
                      "Registrar indicação antes do primeiro pedido",
                      [
                        field("referrer_id", "Indicadora", "select", {
                          options: data.members
                            .filter((m) => m.role === "revendedor")
                            .map((m) => [m.id, m.full_name]),
                        }),
                        field("referred_id", "Pessoa indicada", "select", {
                          options: optionRows(data.members),
                        }),
                      ],
                      "referral_register",
                    )
                  }
                >
                  Registrar indicação
                </button>
              )
            }
          >
            <Table
              columns={[
                ...(staff ? ["Indicadora"] : []),
                "Pessoa indicada",
                "Registro",
                "Categoria na indicação",
                "Situação",
                ...(staff ? ["Ações"] : []),
              ]}
              rows={filtered(refs).map((r) => [
                ...(staff ? [memberName(data, r.referrer_id)] : []),
                r.referred_name || memberName(data, r.referred_id),
                dateLabel(r.created_at),
                r.level_at_creation,
                status(r.state),
                ...(staff
                  ? [
                      r.state === "pending" && (
                        <div className="row-actions">
                          <button
                            onClick={() =>
                              open(
                                "Validar indicação",
                                [
                                  field(
                                    "order_id",
                                    "Primeiro pedido pago",
                                    "select",
                                    {
                                      options: data.orders
                                        .filter(
                                          (o) =>
                                            o.member_id === r.referred_id &&
                                            o.state === "paid",
                                        )
                                        .map((o) => [
                                          o.id,
                                          `Omni ${o.omni_number} · ${currency(o.products)}`,
                                        ]),
                                    },
                                  ),
                                  field(
                                    "confirmed_new_client",
                                    "Conferi no Omni: cliente sem compras anteriores",
                                    "checkbox",
                                    { required: true },
                                  ),
                                  field(
                                    "confirmed_before_order",
                                    "Indicação informada antes da conclusão do primeiro pedido",
                                    "checkbox",
                                    { required: true },
                                  ),
                                  field(
                                    "confirmed_client_discount",
                                    "Se a regra prevê desconto no primeiro pedido, confirmei sua aplicação",
                                    "checkbox",
                                  ),
                                ],
                                "referral_decide",
                                {},
                                { id: r.id, decision: "approve" },
                              )
                            }
                          >
                            Validar
                          </button>
                          <button
                            onClick={() =>
                              open(
                                "Recusar indicação",
                                [field("reason", "Motivo", "textarea")],
                                "referral_decide",
                                {},
                                { id: r.id, decision: "reject" },
                              )
                            }
                          >
                            Recusar
                          </button>
                        </div>
                      ),
                    ]
                  : []),
              ])}
            />
          </Section>
        </>
      );
    }
    if (section === "beneficios") {
      const benefits = filtered(mine(data.benefits)).filter(
        (b) => b.kind === benefitTab,
      );
      return (
        <>
          <div className="tabs" role="tablist" aria-label="Tipos de benefício">
            {kindOptions.map(([kind, label]) => (
              <button
                role="tab"
                aria-selected={benefitTab === kind}
                className={benefitTab === kind ? "selected" : ""}
                key={kind}
                onClick={() => setBenefitTab(kind)}
              >
                {label}
              </button>
            ))}
          </div>
          {benefitTab === "cashback" && (
            <>
              <div className="stats">
                <Stat
                  label="Saldo em produtos"
                  value={currency(balance.total)}
                />
                <Stat
                  label="Disponível para solicitar"
                  value={currency(balance.available)}
                />
                <Stat
                  label="Reservado em vouchers"
                  value={currency(balance.reserved)}
                />
              </div>
              <div className="toolbar">
                <p>
                  Créditos de todas as origens acumulam. Usamos primeiro os que
                  vencem antes.
                </p>
                <button
                  className="primary"
                  disabled={balance.available <= 0}
                  onClick={() => requestBenefit()}
                >
                  Solicitar cashback
                </button>
              </div>
            </>
          )}
          <div className="benefit-grid">
            {benefits.map((b) => {
              const expired =
                expiryOf(b, data.settings, data.campaigns) <= new Date();
              const pending = data.vouchers.find(
                (v) =>
                  v.benefit_id === b.id &&
                  ["requested", "handling"].includes(v.state),
              );
              return (
                <article className="benefit-card" key={b.id}>
                  <div className="benefit-top">
                    <span className="benefit-icon">
                      {b.kind === "cashback" ? (
                        <Wallet />
                      ) : b.kind === "gift" ? (
                        <Gift />
                      ) : (
                        <Ticket />
                      )}
                    </span>
                    {expired
                      ? status("expired")
                      : status(pending ? "requested" : b.state)}
                  </div>
                  <p className="eyebrow">{b.source}</p>
                  <h2>{benefitText(b)}</h2>
                  <p>{b.title}</p>
                  <dl>
                    <div>
                      <dt>Concedido em</dt>
                      <dd>{dateLabel(b.granted_at)}</dd>
                    </div>
                    <div>
                      <dt>Válido até</dt>
                      <dd>
                        {dateLabel(
                          new Date(
                            expiryOf(
                              b,
                              data.settings,
                              data.campaigns,
                            ).getTime() - 1,
                          ).toISOString(),
                        )}
                      </dd>
                    </div>
                  </dl>
                  {b.note && <small>{b.note}</small>}
                  {b.kind !== "cashback" && (
                    <button
                      className="primary"
                      disabled={expired || b.state !== "available"}
                      onClick={() => requestBenefit(b)}
                    >
                      {pending
                        ? "Ver solicitação existente"
                        : b.kind === "gift"
                          ? "Solicitar brinde"
                          : "Solicitar desconto"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          {!benefits.length && <Empty>Nenhum benefício nesta categoria.</Empty>}
          <div className="notice">
            {currentRulesNote} Descontos são utilizados integralmente e não
            acumulam entre si.
          </div>
        </>
      );
    }
    if (section === "solicitacoes")
      return (
        <Section
          title={staff ? "Central de vouchers" : "Minhas solicitações"}
          description="O código identifica o benefício; a equipe verifica a titularidade e as regras atuais antes de aplicar."
        >
          <Table
            columns={[
              "Voucher",
              staff ? "Titular" : "Data",
              "Benefício",
              "Situação",
              "Omni",
              "Ações",
            ]}
            rows={voucherRows(staff ? data.vouchers : mine(data.vouchers))}
          />
        </Section>
      );
    if (section === "entregas")
      return (
        <Section
          title="Brindes e entregas"
          description="Controle de concessão e entrega. Placa e kit DNA MOR são benefícios únicos."
          action={
            <button className="primary" onClick={grantForm}>
              Conceder benefício
            </button>
          }
        >
          <Table
            columns={["Titular", "Brinde", "Origem", "Validade", "Situação"]}
            rows={filtered(data.benefits.filter((b) => b.kind === "gift")).map(
              (b) => [
                memberName(data, b.member_id),
                b.title,
                b.source,
                dateLabel(
                  expiryOf(b, data.settings, data.campaigns).toISOString(),
                ),
                status(b.state),
              ],
            )}
          />
          <h3 className="subheading">Solicitações de entrega</h3>
          <Table
            columns={[
              "Voucher",
              "Titular",
              "Benefício",
              "Situação",
              "Omni",
              "Ações",
            ]}
            rows={voucherRows(
              data.vouchers.filter((v) =>
                data.benefits.some(
                  (b) => b.id === v.benefit_id && b.kind === "gift",
                ),
              ),
            )}
          />
        </Section>
      );
    if (section === "campanhas")
      return (
        <>
          <div className="toolbar">
            <p>
              Metas calculadas a partir de compras e indicações confirmadas.
            </p>
            {admin && (
              <button className="primary" onClick={() => campaignForm()}>
                Criar campanha
              </button>
            )}
          </div>
          <div className="campaign-grid">
            {filtered(data.campaigns).map((c) => {
              const progress = campaignProgress(c, profile, data);
              return (
                <article className="campaign-card" key={c.id}>
                  <div className="campaign-banner">
                    <Megaphone />
                    <span>{c.name}</span>
                    {status(c.state)}
                  </div>
                  <div className="campaign-body">
                    <p>{c.description}</p>
                    <small>
                      {dateLabel(c.starts_on)} até {dateLabel(c.ends_on)} ·{" "}
                      {c.audience === "all"
                        ? "Clientes e revendedoras"
                        : labels[c.audience]}
                    </small>
                    <h3>Como participar</h3>
                    <ul>
                      {Number(c.conditions.purchase_min) > 0 && (
                        <li>
                          Comprar {currency(c.conditions.purchase_min)} em
                          produtos pagos.
                          {!staff &&
                            ` Confirmado: ${currency(progress.purchases)}.`}
                        </li>
                      )}
                      {Number(c.conditions.referrals_min) > 0 && (
                        <li>
                          {c.conditions.referrals_min} indicações com primeiro
                          pedido pago.
                          {!staff && ` Confirmadas: ${progress.referrals}.`}
                        </li>
                      )}
                    </ul>
                    <small>
                      {c.conditions.match === "all"
                        ? "Cumprir todas as condições"
                        : "Cumprir pelo menos uma condição"}
                    </small>
                    <h3>Recompensa</h3>
                    <p>
                      {c.reward.kind === "gift"
                        ? c.reward.gift
                        : c.reward.mode === "percent"
                          ? `${c.reward.value}% ${c.reward.kind === "cashback" ? "das compras elegíveis em cashback" : "de desconto no pedido"}`
                          : currency(c.reward.value) +
                            " em " +
                            labels[c.reward.kind].toLowerCase()}
                    </p>
                    <p className="muted">
                      Uso:{" "}
                      {c.expiry.mode === "date"
                        ? `até ${dateLabel(c.expiry.date)}`
                        : `${c.expiry.days} dias após concessão`}
                      . Máximo de {c.max_awards} recompensa(s) por pessoa.
                    </p>
                    <div className="row-actions">
                      {admin && (
                        <button onClick={() => campaignForm(c)}>Editar</button>
                      )}
                      {staff && (
                        <button
                          className="primary"
                          disabled={c.state !== "active"}
                          onClick={() =>
                            open(
                              "Conferir e conceder recompensa",
                              [
                                field("member_id", "Participante", "select", {
                                  options: optionRows(data.members),
                                }),
                              ],
                              "campaign_award",
                              {},
                              { id: c.id },
                              "As metas e a disponibilidade serão verificadas no banco. Premiações repetidas exigem novos múltiplos da meta.",
                            )
                          }
                        >
                          Conceder recompensa
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!data.campaigns.length && (
            <Empty>Nenhuma campanha disponível.</Empty>
          )}
        </>
      );
    if (section === "pessoas")
      return (
        <Section
          title="Participantes e equipe"
          description="Classificação manual, com justificativa e histórico."
          action={
            <div className="row-actions">
              {admin && (
                <button
                  onClick={() =>
                    setSheet({
                      title: "Convidar participante",
                      fields: [
                        field("full_name", "Nome completo"),
                        field("email", "E-mail", "email"),
                        field("role", "Perfil", "select", {
                          options: roleOptions,
                          defaultValue: "cliente",
                        }),
                        field("level", "Categoria para revendedora", "select", {
                          options: LEVELS.map((l) => [l, l]),
                          required: false,
                        }),
                      ],
                      note: "O participante receberá por e-mail um convite para definir a senha e acessar o clube com o perfil escolhido.",
                      submit: async (f) => {
                        setBusy(true);
                        try {
                          const { data: res, error: e } =
                            await supabase.functions.invoke("dna-invite", {
                              body: f,
                            });
                          if (e) {
                            const detail =
                              e.context instanceof Response
                                ? await e.context.json().catch(() => null)
                                : null;
                            throw new Error(
                              detail?.error ||
                                "Não foi possível conectar ao serviço de convites. Tente novamente.",
                            );
                          }
                          if (res?.error) throw new Error(res.error);
                          setSheet(null);
                          setMessage("Convite enviado.");
                          await refresh();
                        } catch (e) {
                          notifyError(e);
                        } finally {
                          setBusy(false);
                        }
                      },
                    })
                  }
                >
                  Convidar
                </button>
              )}
              <button className="primary" onClick={grantForm}>
                Conceder benefício
              </button>
            </div>
          }
        >
          <Table
            columns={[
              "Nome",
              "E-mail",
              "Documento",
              "Perfil",
              "Categoria",
              "Ações",
            ]}
            rows={filtered(data.members).map((m) => [
              m.full_name,
              m.email,
              m.cpf_cnpj,
              status(m.role),
              m.level || "—",
              <div className="row-actions">
                {admin && (
                  <button
                    onClick={() =>
                      open(
                        "Alterar perfil e categoria",
                        [
                          field("role", "Perfil", "select", {
                            options: roleOptions,
                          }),
                          field(
                            "level",
                            "Categoria para revendedora",
                            "select",
                            {
                              options: LEVELS.map((l) => [l, l]),
                              required: false,
                            },
                          ),
                          field("reason", "Justificativa", "textarea"),
                        ],
                        "member_update",
                        m,
                        { id: m.id },
                      )
                    }
                  >
                    Editar acesso / nível
                  </button>
                )}
                <button
                  onClick={() => {
                    setReportMember(m.id);
                    setMessage(
                      "Participante selecionado. Abra Relatórios para consultar o histórico.",
                    );
                  }}
                >
                  {" "}
                  {reportMember === m.id
                    ? "Selecionado para relatório"
                    : "Selecionar para relatório"}
                </button>
              </div>,
            ])}
          />
        </Section>
      );
    if (section === "revenda")
      return (
        <Section
          title="Faça parte da nossa rede"
          description="A equipe avaliará sua solicitação. Ao aprovar, sua conta mantém o histórico e recebe uma categoria inicial."
          action={
            <button
              className="primary"
              disabled={data.reseller_requests.some(
                (r) => r.member_id === profile.id && r.state === "pending",
              )}
              onClick={() =>
                open(
                  "Quero ser revendedor",
                  [
                    field(
                      "message",
                      "Conte um pouco sobre seu interesse",
                      "textarea",
                    ),
                  ],
                  "reseller_request",
                )
              }
            >
              Solicitar participação
            </button>
          }
        >
          <Table
            columns={["Data", "Mensagem", "Situação", "Resposta da equipe"]}
            rows={mine(data.reseller_requests).map((r) => [
              dateLabel(r.created_at),
              r.message,
              status(r.state),
              r.reason || "Aguardando análise",
            ])}
          />
        </Section>
      );
    if (section === "aprovacoes")
      return (
        <Section title="Solicitações para revenda">
          <Table
            columns={["Cliente", "Data", "Mensagem", "Situação", "Ações"]}
            rows={filtered(data.reseller_requests).map((r) => [
              memberName(data, r.member_id),
              dateLabel(r.created_at),
              r.message,
              status(r.state),
              r.state === "pending" && (
                <div className="row-actions">
                  <button
                    onClick={() =>
                      open(
                        "Aprovar participação",
                        [
                          field("level", "Categoria inicial", "select", {
                            options: LEVELS.map((l) => [l, l]),
                          }),
                          field("reason", "Justificativa", "textarea"),
                        ],
                        "reseller_decide",
                        {},
                        { id: r.id, decision: "approve" },
                      )
                    }
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() =>
                      open(
                        "Recusar solicitação",
                        [field("reason", "Justificativa", "textarea")],
                        "reseller_decide",
                        {},
                        { id: r.id, decision: "reject" },
                      )
                    }
                  >
                    Recusar
                  </button>
                </div>
              ),
            ])}
          />
        </Section>
      );
    if (section === "perfil")
      return (
        <Section
          title="Meu perfil"
          description="Seu histórico permanece vinculado a esta conta."
        >
          <form
            className="form-grid profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              mutate(
                "profile_save",
                Object.fromEntries(new FormData(e.currentTarget)),
              );
            }}
          >
            <label>
              Nome completo
              <input
                name="full_name"
                required
                minLength={3}
                defaultValue={profile.full_name}
              />
            </label>
            <label>
              CPF / CNPJ
              <input name="cpf_cnpj" defaultValue={profile.cpf_cnpj} />
            </label>
            <label>
              WhatsApp
              <input name="phone" type="tel" defaultValue={profile.phone} />
            </label>
            <label>
              E-mail
              <input readOnly value={profile.email} />
            </label>
            <p>
              Perfil: {labels[profile.role]}{" "}
              {profile.level && `· ${profile.level}`}
            </p>
            <button className="primary" disabled={busy}>
              Salvar meus dados
            </button>
          </form>
        </Section>
      );
    if (section === "configuracoes")
      return (
        <SettingsForm
          settings={data.settings}
          busy={busy}
          save={(value) => mutate("settings_save", { value })}
        />
      );
    if (section === "historico")
      return (
        <Section
          title="Histórico de alterações"
          description="Configurações, decisões e movimentações registradas com responsável e data."
        >
          <Table
            columns={["Data", "Responsável", "Ação", "Detalhes"]}
            rows={filtered(data.audit || []).map((a) => [
              dateLabel(a.created_at) +
                " " +
                new Date(a.created_at).toLocaleTimeString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                }),
              memberName(data, a.actor_id),
              a.action,
              <details>
                <summary>Ver registro</summary>
                <pre>{JSON.stringify(a.details, null, 2)}</pre>
              </details>,
            ])}
          />
        </Section>
      );
    if (section === "relatorios") {
      const benefits = data.benefits.filter(
        (b) =>
          (!reportMember || b.member_id === reportMember) &&
          (!reportFrom || dayInBrazil(b.granted_at) >= reportFrom) &&
          (!reportTo || dayInBrazil(b.granted_at) <= reportTo),
      );
      const vouchers = data.vouchers.filter(
        (v) =>
          (!reportMember || v.member_id === reportMember) &&
          (!reportFrom || dayInBrazil(v.created_at) >= reportFrom) &&
          (!reportTo || dayInBrazil(v.created_at) <= reportTo),
      );
      const csv = benefits.map((b) => ({
        Titular: memberName(data, b.member_id),
        Tipo: labels[b.kind],
        Beneficio: b.title,
        Origem: b.source,
        Detalhes: b.note,
        Indicacao:
          data.referrals.find((r) => r.id === b.referral_id)?.referred_name ||
          "",
        Concessao: dateLabel(b.granted_at),
        Validade: dateLabel(
          expiryOf(b, data.settings, data.campaigns).toISOString(),
        ),
        Valor: b.value,
        Saldo: b.kind === "cashback" ? b.remaining : "",
        Situacao: labels[b.state],
        Pedido_origem:
          data.orders.find((o) => o.id === b.order_id)?.omni_number || "",
      }));
      return (
        <>
          <div className="report-filters">
            <label>
              Participante
              <select
                value={reportMember}
                onChange={(e) => setReportMember(e.target.value)}
              >
                <option value="">Todos</option>
                {data.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              De
              <input
                type="date"
                value={reportFrom}
                onChange={(e) => setReportFrom(e.target.value)}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={reportTo}
                onChange={(e) => setReportTo(e.target.value)}
              />
            </label>
          </div>
          <div className="stats">
            <Stat
              label="Cashback concedido"
              value={currency(
                benefits
                  .filter((b) => b.kind === "cashback")
                  .reduce((s, b) => s + Number(b.value), 0),
              )}
            />
            <Stat
              label="Cashback utilizado"
              value={currency(
                vouchers
                  .filter((v) => v.state === "used")
                  .reduce((s, v) => s + Number(v.used_cashback), 0),
              )}
            />
            <Stat
              label="Descontos aplicados"
              value={currency(
                vouchers
                  .filter((v) => v.state === "used")
                  .reduce((s, v) => s + Number(v.used_discount), 0),
              )}
            />
          </div>
          <Section
            title="Origem dos benefícios"
            description="Cada crédito permanece identificado mesmo compondo um saldo único."
            action={
              <button
                onClick={() => {
                  try {
                    exportCsv(csv, "beneficios-dna.csv");
                  } catch (e) {
                    notifyError(e);
                  }
                }}
              >
                Exportar CSV
              </button>
            }
          >
            <Table
              columns={[
                "Titular",
                "Tipo",
                "Origem",
                "Concedido",
                "Saldo restante",
                "Validade",
                "Situação",
                "Ações",
              ]}
              rows={benefits.map((b) => [
                memberName(data, b.member_id),
                labels[b.kind],
                <>
                  {b.source + " · " + b.title}
                  <small>
                    {data.referrals.find((r) => r.id === b.referral_id)
                      ?.referred_name || b.note}
                  </small>
                </>,
                b.mode === "percent" ? b.value + "%" : currency(b.value),
                b.kind === "cashback" ? currency(b.remaining) : "—",
                dateLabel(
                  expiryOf(b, data.settings, data.campaigns).toISOString(),
                ),
                status(b.state),
                b.state === "available" && (
                  <button
                    onClick={() =>
                      open(
                        "Revogar benefício",
                        [
                          field(
                            "reason",
                            "Justificativa obrigatória",
                            "textarea",
                          ),
                        ],
                        "benefit_revoke",
                        {},
                        { id: b.id },
                        "Para benefícios já utilizados, devolva as utilizações antes de revogar. A ação fica registrada no histórico.",
                      )
                    }
                  >
                    Revogar
                  </button>
                ),
              ])}
            />
          </Section>
          <Section title="Utilizações e devoluções">
            <Table
              columns={[
                "Voucher",
                "Titular",
                "Benefício",
                "Situação",
                "Omni",
                "Ações",
              ]}
              rows={voucherRows(
                vouchers.filter((v) => ["used", "returned"].includes(v.state)),
              )}
            />
          </Section>
        </>
      );
    }
  }

  return (
    <div className="portal">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Brand />
        <p className="sidebar-caption">CLUBE DE BENEFÍCIOS</p>
        <nav aria-label="Menu principal">
          {nav.map(([key, label, Icon]) => (
            <Link
              key={key}
              to={`/app/${key}`}
              className={section === key ? "active" : ""}
              aria-current={section === key ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <strong>{profile.full_name}</strong>
          <small>{labels[profile.role]}</small>
          <button onClick={() => logout().catch(notifyError)}>
            <LogOut size={16} /> Sair da conta
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-overlay"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        />
      )}
      <main className="portal-main">
        <header className="portal-header">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Abrir menu"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <p className="eyebrow">CLUBE DNA DEPILAMOR</p>
            <h1>{title}</h1>
          </div>
          <div className="header-actions">
            <span className="profile-chip">
              {profile.level || labels[profile.role]}
            </span>
            <button
              className="icon-button"
              aria-label="Atualizar dados"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </header>
        {message && (
          <p className="notice success" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
            {!data && (
              <span>
                {" "}
                Aplique a migração documentada em docs/ATIVACAO.md para ativar o
                portal.
              </span>
            )}
          </p>
        )}
        {loading && !data ? (
          <div className="portal-loading">Carregando o portal…</div>
        ) : (
          <>
            {data && (
              <div className="search-row">
                <input
                  aria-label="Buscar nesta página"
                  placeholder="Buscar por nome, código ou situação…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            {content()}
          </>
        )}
      </main>
      {sheet && (
        <>
          <Sheet spec={sheet} close={closeSheet} busy={busy} />
          {error && (
            <div className="sheet-error notice error" role="alert">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SettingsForm({ settings, busy, save }) {
  const [value, setValue] = useState(() => structuredClone(settings));
  useEffect(() => setValue(structuredClone(settings)), [settings]);
  const set = (key, v) => setValue((s) => ({ ...s, [key]: v }));
  const ruleSet = (level, key, v) =>
    setValue((s) => ({
      ...s,
      referral_rules: {
        ...s.referral_rules,
        [level]: { ...s.referral_rules[level], [key]: v },
      },
    }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(value);
      }}
    >
      <Section
        title="Regras de utilização"
        description="A configuração atual é aplicada a todos os benefícios e vouchers pendentes, inclusive os antigos."
      >
        <div className="form-grid settings-grid">
          <label className="check">
            <input
              type="checkbox"
              checked={value.allow_combination}
              onChange={(e) => set("allow_combination", e.target.checked)}
            />
            Permitir desconto e cashback no mesmo pedido
          </label>
          <label>
            Limite de cashback (% dos produtos após desconto, sem frete)
            <input
              type="number"
              min={0}
              max={50}
              step="0.01"
              required
              value={value.cashback_limit}
              onChange={(e) => set("cashback_limit", Number(e.target.value))}
            />
          </label>
          <label>
            Validade padrão (dias)
            <input
              type="number"
              min={1}
              max={3650}
              required
              value={value.validity_days}
              onChange={(e) => set("validity_days", Number(e.target.value))}
            />
            <small>
              365 dias inicialmente. Campanhas podem ter prazo próprio.
            </small>
          </label>
          <label>
            WhatsApp da empresa (país + DDD + número)
            <input
              type="tel"
              value={value.company_whatsapp}
              onChange={(e) => set("company_whatsapp", e.target.value)}
            />
          </label>
        </div>
      </Section>
      <Section
        title="Clube e catálogo de brindes"
        description="Categorias definidas manualmente. Benefícios de relacionamento não geram créditos automaticamente."
      >
        <div className="form-grid">
          <label>
            Orientações de classificação
            <textarea
              value={value.classification_description || ""}
              onChange={(e) =>
                set("classification_description", e.target.value)
              }
            />
          </label>
          <label>
            Catálogo de brindes (um por linha)
            <textarea
              value={(value.gift_catalog || []).join("\n")}
              onChange={(e) => set("gift_catalog", e.target.value.split("\n"))}
            />
          </label>
          {LEVELS.map((level) => (
            <label key={level}>
              Benefícios {level} (um por linha)
              <textarea
                value={(value.level_benefits?.[level] || []).join("\n")}
                onChange={(e) =>
                  set("level_benefits", {
                    ...value.level_benefits,
                    [level]: e.target.value.split("\n"),
                  })
                }
              />
            </label>
          ))}
        </div>
      </Section>
      <Section
        title="Programa de indicação"
        description="A categoria considerada é a registrada na indicação. Cashback concedido entra no saldo em R$; descontos são benefícios separados."
      >
        <div className="form-grid settings-grid">
          <label>
            Início
            <input
              type="date"
              required
              value={value.referral_start}
              onChange={(e) => set("referral_start", e.target.value)}
            />
          </label>
          <label>
            Fim
            <input
              type="date"
              required
              min={value.referral_start}
              value={value.referral_end}
              onChange={(e) => set("referral_end", e.target.value)}
            />
          </label>
        </div>
        {LEVELS.map((level) => {
          const r = value.referral_rules[level];
          return (
            <fieldset className="rule-card" key={level}>
              <legend>{level}</legend>
              <div className="form-grid settings-grid">
                <label>
                  Premiação da indicadora
                  <select
                    value={r.kind}
                    onChange={(e) => {
                      ruleSet(level, "kind", e.target.value);
                      if (e.target.value === "cashback")
                        ruleSet(level, "base", "paid_order");
                    }}
                  >
                    <option value="discount">Desconto</option>
                    <option value="cashback">Cashback</option>
                  </select>
                </label>
                <label>
                  Forma de cálculo
                  <select
                    value={r.mode}
                    onChange={(e) => ruleSet(level, "mode", e.target.value)}
                  >
                    <option value="percent">Percentual</option>
                    <option value="fixed">Valor em R$</option>
                  </select>
                </label>
                <label>
                  Valor / percentual
                  <input
                    type="number"
                    required
                    min={0}
                    max={r.mode === "percent" ? 100 : undefined}
                    step="0.01"
                    value={r.value}
                    onChange={(e) =>
                      ruleSet(level, "value", Number(e.target.value))
                    }
                  />
                </label>
                <label>
                  Base de cálculo
                  <select
                    value={r.base}
                    disabled={r.kind === "cashback"}
                    onChange={(e) => ruleSet(level, "base", e.target.value)}
                  >
                    <option value="paid_order">
                      Valor dos produtos pago pela indicada
                    </option>
                    <option value="next_order">
                      Próximo pedido da indicadora
                    </option>
                  </select>
                </label>
                <label>
                  Benefício da indicada
                  <select
                    value={r.client_kind}
                    onChange={(e) =>
                      ruleSet(level, "client_kind", e.target.value)
                    }
                  >
                    <option value="discount">Desconto</option>
                    <option value="cashback">Cashback</option>
                  </select>
                </label>
                <label>
                  Percentual da indicada
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    step="0.01"
                    value={r.client_value}
                    onChange={(e) =>
                      ruleSet(level, "client_value", Number(e.target.value))
                    }
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={r.client_first_order}
                    onChange={(e) =>
                      ruleSet(level, "client_first_order", e.target.checked)
                    }
                    disabled={r.client_kind === "cashback"}
                  />
                  Desconto da indicada aplicado no primeiro pedido
                </label>
              </div>
            </fieldset>
          );
        })}
      </Section>
      <div className="notice">
        Cashback não pode pagar mais de 50% do pedido. O administrador pode
        reduzir esse limite. Mudanças no tipo de premiação valem para novas
        concessões; os créditos já contabilizados permanecem no extrato. As
        condições atuais de uso e validade alcançam todos os benefícios
        pendentes.
      </div>
      <button className="primary save-settings" disabled={busy}>
        {busy ? "Salvando…" : "Salvar configurações"}
      </button>
    </form>
  );
}
