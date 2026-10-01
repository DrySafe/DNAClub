export function createInviteHandler({ origin, url, serviceKey, createClient }) {
  const cors = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  const response = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  return async (req) => {
    if (!origin || !url || !serviceKey)
      return response({ error: "Serviço de convites não configurado." }, 503);
    const requestOrigin = req.headers.get("Origin");
    if (requestOrigin && requestOrigin !== origin)
      return response({ error: "Origem não permitida." }, 403);
    // Preflight carries no session. Authenticate the actual POST inside the handler.
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST")
      return response({ error: "Método não permitido." }, 405);
    const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
    if (!token) return response({ error: "Autenticação necessária." }, 401);
    try {
      const client = createClient(url, serviceKey, {
        auth: { persistSession: false },
      });
      const { data: auth, error: authError } = await client.auth.getUser(token);
      if (authError || !auth.user)
        return response({ error: "Sessão inválida." }, 401);
      const { data: caller, error: callerError } = await client
        .from("dna_members")
        .select("role")
        .eq("id", auth.user.id)
        .single();
      if (callerError || caller?.role !== "admin")
        return response(
          { error: "Apenas administradores podem convidar." },
          403,
        );
      let body;
      try {
        body = await req.json();
      } catch {
        return response({ error: "Dados inválidos para o convite." }, 400);
      }
      if (
        !body ||
        !["cliente", "revendedor", "financeiro", "admin"].includes(body.role) ||
        typeof body.full_name !== "string" ||
        !body.full_name.trim() ||
        typeof body.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
      ) {
        return response({ error: "Confira nome, e-mail e perfil." }, 400);
      }
      if (
        body.role === "revendedor" &&
        ![
          "DNA Profissional",
          "DNA Referência",
          "DNA Master",
          "DNA MOR",
        ].includes(body.level)
      ) {
        return response({ error: "Selecione a categoria inicial." }, 400);
      }
      const { data, error } = await client.auth.admin.inviteUserByEmail(
        body.email,
        {
          data: { full_name: body.full_name.trim() },
          redirectTo: `${origin}/recuperar-senha?mode=reset`,
        },
      );
      if (error)
        return response(
          {
            error:
              "Não foi possível convidar. Confira se o e-mail já possui conta ou se o envio de e-mail está configurado.",
          },
          400,
        );
      const { error: updateError } = await client
        .from("dna_members")
        .update({
          role: body.role,
          level: body.role === "revendedor" ? body.level : null,
        })
        .eq("id", data.user.id)
        .select("id")
        .single();
      if (updateError)
        return response(
          {
            error:
              "Convite enviado, mas o perfil precisa ser ajustado na tela Pessoas.",
          },
          409,
        );
      const { error: auditError } = await client
        .from("dna_audit")
        .insert({
          actor_id: auth.user.id,
          action: "member_invite",
          target_id: data.user.id,
          details: { role: body.role, full_name: body.full_name.trim() },
        });
      if (auditError)
        return response(
          {
            error:
              "Convite enviado e perfil atualizado, mas não foi possível registrar o histórico.",
          },
          409,
        );
      return response({ ok: true });
    } catch {
      return response(
        { error: "Não foi possível processar o convite. Tente novamente." },
        500,
      );
    }
  };
}
