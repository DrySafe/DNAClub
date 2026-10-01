import test from "node:test";
import assert from "node:assert/strict";
import { createInviteHandler } from "../supabase/functions/dna-invite/handler.js";

const origin = "https://dna-club.vercel.app";
function fixture({
  role = "admin",
  authError = null,
  inviteError = null,
  updateError = null,
} = {}) {
  const calls = [];
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: authError ? null : { id: "caller" } },
        error: authError,
      }),
      admin: {
        inviteUserByEmail: async (...args) => {
          calls.push(["invite", ...args]);
          return { data: { user: { id: "new-user" } }, error: inviteError };
        },
      },
    },
    from: (table) => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({
          data: query.updated ? { id: "new-user" } : { role },
          error: query.updated ? updateError : null,
        }),
        update: (values) => {
          query.updated = true;
          calls.push(["update", values]);
          return query;
        },
        insert: async (values) => {
          calls.push(["audit", values]);
          return { error: null };
        },
      };
      return query;
    },
  };
  return {
    calls,
    handler: createInviteHandler({
      origin,
      url: "https://example.test",
      serviceKey: "test-only",
      createClient: () => client,
    }),
  };
}
function request(
  body = { email: "new@example.test", full_name: "Novo Admin", role: "admin" },
  headers = {},
) {
  return new Request(`${origin}/invite`, {
    method: "POST",
    headers: {
      Origin: origin,
      Authorization: "Bearer test",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
test("preflight succeeds without authentication and allows Supabase client headers", async () => {
  const { handler, calls } = fixture();
  const res = await handler(
    new Request(`${origin}/invite`, {
      method: "OPTIONS",
      headers: { Origin: origin },
    }),
  );
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), origin);
  assert.match(
    res.headers.get("Access-Control-Allow-Headers"),
    /authorization/,
  );
  assert.match(res.headers.get("Access-Control-Allow-Headers"), /content-type/);
  assert.deepEqual(calls, []);
});
test("missing or invalid authentication does not send invitations", async () => {
  for (const opts of [{}, { authError: new Error("invalid") }]) {
    const { handler, calls } = fixture(opts);
    const req = request();
    if (!opts.authError) req.headers.delete("Authorization");
    const res = await handler(req);
    assert.equal(res.status, 401);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), origin);
    assert.deepEqual(calls, []);
  }
});
test("non-admin roles and foreign origins cannot invite", async () => {
  for (const role of ["cliente", "revendedor", "financeiro"]) {
    const { handler, calls } = fixture({ role });
    assert.equal((await handler(request())).status, 403);
    assert.deepEqual(calls, []);
  }
  const { handler, calls } = fixture();
  assert.equal(
    (await handler(request(undefined, { Origin: "https://other.test" })))
      .status,
    403,
  );
  assert.deepEqual(calls, []);
});
test("admin invitation sets the chosen role, trusted redirect and audit", async () => {
  const { handler, calls } = fixture();
  const res = await handler(
    request({
      email: "new@example.test",
      full_name: " Novo Admin ",
      role: "admin",
      redirectTo: "https://other.test",
    }),
  );
  assert.equal(res.status, 200);
  assert.equal(calls[0][2].redirectTo, `${origin}/recuperar-senha?mode=reset`);
  assert.deepEqual(calls[1], ["update", { role: "admin", level: null }]);
  assert.equal(calls[2][1].actor_id, "caller");
  assert.equal(calls[2][1].target_id, "new-user");
});
test("invalid role or reseller category is rejected before sending", async () => {
  for (const body of [
    null,
    { email: "new@example.test", full_name: "Name", role: "owner" },
    {
      email: "new@example.test",
      full_name: "Name",
      role: "revendedor",
      level: "invalid",
    },
  ]) {
    const { handler, calls } = fixture();
    assert.equal((await handler(request(body))).status, 400);
    assert.deepEqual(calls, []);
  }
});
test("mail and profile errors keep CORS headers and do not report success", async () => {
  for (const [opts, status] of [
    [{ inviteError: new Error("SMTP") }, 400],
    [{ updateError: new Error("profile") }, 409],
  ]) {
    const { handler } = fixture(opts);
    const res = await handler(request());
    assert.equal(res.status, status);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), origin);
    assert.ok((await res.json()).error);
  }
});
