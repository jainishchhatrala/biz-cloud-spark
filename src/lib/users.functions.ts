import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["Admin", "Sales", "Production", "QC", "Accountant", "Dealer"] as const;
export const authEmail = (loginId: string) =>
  `${loginId.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_")}@aalidhra-erp.app`;

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "Admin" });
  if (!data) throw new Error("Only Admin can manage users");
}

const userInput = z.object({
  name: z.string().min(1).max(120),
  email: z.string().max(255).default(""),
  login_id: z.string().min(2).max(60),
  password: z.string().min(6).max(128),
  role: z.enum(ROLES),
  phone: z.string().max(40).nullable().optional(),
  active: z.boolean().default(true),
});

export const createErpUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => userInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: exists } = await supabaseAdmin.from("profiles").select("id").eq("login_id", data.login_id).maybeSingle();
    if (exists) throw new Error("login_id already taken");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail(data.login_id), password: data.password, email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message || "Could not create user");
    const id = created.user.id;
    await supabaseAdmin.from("profiles").insert({ id, name: data.name, email: data.email, login_id: data.login_id, phone: data.phone ?? null, active: data.active });
    await supabaseAdmin.from("user_roles").insert({ user_id: id, role: data.role });
    return { id, name: data.name, email: data.email, login_id: data.login_id, role: data.role, phone: data.phone ?? null, active: data.active };
  });

export const updateErpUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), patch: userInput.partial() }).parse(d))
  .handler(async ({ data, context }) => {
    const isSelf = data.id === context.userId;
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "Admin" });
    if (!isAdmin && !isSelf) throw new Error("Forbidden");
    const p = data.patch;
    if (!isAdmin && (p.role || p.active !== undefined || p.login_id)) throw new Error("Only Admin can change role, status or login ID");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const authPatch: { email?: string; password?: string } = {};
    if (p.password) authPatch.password = p.password;
    if (p.login_id) authPatch.email = authEmail(p.login_id);
    if (Object.keys(authPatch).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, authPatch);
      if (error) throw new Error(error.message);
    }
    const prof: any = {};
    for (const k of ["name", "email", "login_id", "phone", "active"] as const) if (p[k] !== undefined) prof[k] = p[k];
    if (Object.keys(prof).length) await supabaseAdmin.from("profiles").update(prof).eq("id", data.id);
    if (p.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: p.role });
    }
    return { ok: true };
  });

export const deleteErpUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("You cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").delete().eq("id", data.id);
    await supabaseAdmin.auth.admin.deleteUser(data.id);
    return { deleted: true };
  });

/** One-time setup: creates the demo team only when no accounts exist yet. */
export const bootstrapWorkspace = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return { created: 0 };
  const demo: [string, string, string, (typeof ROLES)[number]][] = [
    ["Aarav Shah", "admin@forgeflow.demo", "admin", "Admin"],
    ["Mira Patel", "sales@forgeflow.demo", "sales", "Sales"],
    ["Rohan Desai", "production@forgeflow.demo", "production", "Production"],
    ["Kavya Iyer", "qc@forgeflow.demo", "qc", "QC"],
    ["Nilesh Trivedi", "accountant@forgeflow.demo", "accountant", "Accountant"],
    ["Vikram Dealer", "dealer@forgeflow.demo", "dealer", "Dealer"],
  ];
  let created = 0; const errors: (string | undefined)[] = [];
  for (const [name, email, login_id, role] of demo) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email: authEmail(login_id), password: "Aalidhra@2026", email_confirm: true });
    if (error || !data.user) { console.error("demo user", login_id, error?.message); errors.push(error?.message); continue; }
    await supabaseAdmin.from("profiles").insert({ id: data.user.id, name, email, login_id, phone: "+91 98250 00000" });
    await supabaseAdmin.from("user_roles").insert({ user_id: data.user.id, role });
    created++;
  }
  return { created, errors };
});
