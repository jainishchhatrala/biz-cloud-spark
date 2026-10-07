// Data layer for Aalidhra ERP — business rules ported from backend/server.py, backed by Lovable Cloud.
import { supabase } from "@/integrations/supabase/client";
import { createErpUser, updateErpUser, deleteErpUser, bootstrapWorkspace } from "@/lib/users.functions";

const authEmail = (loginId) =>
  `${String(loginId).trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_")}@aalidhra-erp.app`;
const nowIso = () => new Date().toISOString();

const fail = (msg, status = 400) => {
  const e = new Error(msg);
  e.response = { status, data: { detail: msg } };
  throw e;
};
const run = async (q) => {
  const { data, error } = await q;
  if (error) fail(error.message);
  return data;
};
const one = (table, id, label) =>
  run(supabase.from(table).select("*").eq("id", id).maybeSingle()).then((r) => r || fail(`${label} not found`, 404));
const list = (table, sort = "created_at", asc = false) =>
  run(supabase.from(table).select("*").order(sort, { ascending: asc }).limit(1000));
const insert = (table, row) => run(supabase.from(table).insert(row).select().single());
const update = (table, id, patch) => run(supabase.from(table).update(patch).eq("id", id).select().single());
const del = async (table, id) => { await run(supabase.from(table).delete().eq("id", id)); return { deleted: true }; };
const nextNumber = (prefix) => run(supabase.rpc("next_doc_number", { _prefix: prefix }));
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k] === "" && /_id$/.test(k) ? null : obj[k]]));

const CLIENT_KEYS = ["company", "person", "phone", "email", "city", "state", "source", "status", "rating", "color", "notes", "dealer_id"];
const QUOTE_KEYS = ["number", "client_id", "client_name", "order_date", "valid_until", "status", "items", "notes", "dealer_id"];
const ORDER_KEYS = ["number", "quotation_id", "client_id", "client_name", "order_date", "expected_delivery", "dispatch_date", "items", "status", "notes", "dealer_id"];
const PRODUCT_KEYS = ["name", "model_code", "description", "unit", "default_price", "active"];
const INV_KEYS = ["sku", "name", "category", "unit", "current_stock", "min_level", "supplier", "location"];
const JW_KEYS = ["number", "vendor", "item", "work_type", "inventory_item_id", "initial_quantity", "quantity_sent", "quantity_received", "stages", "current_stage_index", "send_date", "expected_return", "status", "direction", "process_stage", "images", "next_followup_at", "followup_notes", "notes"];
const COMPANY_KEYS = ["company_name", "tagline", "address", "phone", "email", "gstin", "website", "logo_data", "terms_html"];

let me = null;
const currentUser = async () => {
  if (me) return me;
  const { data } = await supabase.auth.getUser();
  if (!data.user) fail("Not authenticated", 401);
  const [p, r] = await Promise.all([
    run(supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle()),
    run(supabase.from("user_roles").select("role").eq("user_id", data.user.id)),
  ]);
  if (!p || !p.active) fail("Account inactive or not set up", 401);
  me = { id: p.id, name: p.name, email: p.email, login_id: p.login_id, role: r?.[0]?.role || "Sales", phone: p.phone, active: p.active };
  return me;
};

const orderStatus = (items) => {
  const stages = items.map((i) => i.stage);
  if (stages.length && stages.every((s) => s === "Dispatched")) return "Dispatched";
  if (stages.some((s) => s === "Ready for Dispatch")) return "Ready for Dispatch";
  return "In Production";
};
const orderTotals = (o) => {
  const subtotal = (o.items || []).reduce((a, i) => a + i.quantity * i.unit_price, 0);
  const gst = (o.items || []).reduce((a, i) => a + (i.quantity * i.unit_price * i.gst_percent) / 100, 0);
  return { subtotal, gst, grand: subtotal + gst };
};

const STALE_DAYS = 14;
const enrichClients = async (clients) => {
  if (!clients.length) return clients;
  const rows = await run(supabase.from("interactions").select("*").in("client_id", clients.map((c) => c.id)));
  const now = new Date();
  return clients.map((c) => {
    const inters = rows.filter((r) => r.client_id === c.id);
    let last = null, next = null, overdue = false;
    for (const i of inters) {
      const at = i.at ? new Date(i.at) : null;
      if (at && (!last || at > last)) last = at;
      const fu = i.next_followup_at ? new Date(i.next_followup_at) : null;
      if (fu && fu > now && (!next || fu < next)) next = fu;
      if (fu && fu < now) overdue = true;
    }
    if (!last) last = new Date(c.created_at);
    const days = Math.floor((now - last) / 86400000);
    return { ...c, last_contact_at: last.toISOString(), next_followup_at: next ? next.toISOString() : null,
      days_since_contact: days, followup_overdue: overdue, is_stale: days > STALE_DAYS && !next };
  });
};

// ---------- Job work helpers ----------
const synthStages = (j) => {
  if (!j.stages || !j.stages.length) {
    j.stages = [{
      stage_number: 1, vendor: j.vendor || "", process: j.work_type || j.process_stage || "", challan_number: "",
      quantity_sent: Number(j.quantity_sent) || 0, sent_date: j.send_date, expected_return: j.expected_return,
      actual_return: j.actual_return, quantity_received: Number(j.quantity_received) || 0, rejection_quantity: 0,
      status: j.status === "Completed" ? "Completed" : ["In Process", "Partially Received"].includes(j.status) ? "In Process" : j.status === "Material Sent" ? "Sent" : "Pending",
      notes: "", images: j.images || [],
    }];
    j.current_stage_index = 0;
    j.initial_quantity = Number(j.quantity_sent) || 0;
  }
  return j;
};
const jwOverdue = (j, now) => {
  if (["Completed", "Cancelled"].includes(j.status)) return false;
  const cur = (j.stages || [])[j.current_stage_index || 0];
  if (cur && cur.expected_return && cur.expected_return < now && cur.status !== "Completed") return true;
  return !!(j.expected_return && j.expected_return < now);
};
const decorateJob = (j) => {
  synthStages(j);
  const now = nowIso();
  j.is_overdue = jwOverdue(j, now);
  j.current_stage = j.stages[j.current_stage_index || 0] || null;
  j.total_stages = j.stages.length;
  return j;
};
const stockIn = async (j, stage, u) => {
  const qty = Number(stage.quantity_received) || 0;
  if (!j.inventory_item_id || j.auto_stock_in_done || qty <= 0) return;
  const txn = await insert("inventory_transactions", {
    item_id: j.inventory_item_id, txn_type: "IN", quantity: qty, at: nowIso(), reference_number: j.number,
    party: stage.vendor || j.vendor || "", remarks: `Auto stock-in from job work ${j.number} final stage`,
    by_user: u.id, job_work_id: j.id,
  });
  j.auto_stock_in_done = true;
  j.inventory_transaction_id = txn.id;
};
const recomputeJob = async (j, u) => {
  const stages = j.stages || [];
  const now = nowIso();
  for (const s of stages) if (!["Completed", "Cancelled"].includes(s.status) && s.expected_return && s.expected_return < now) s.status = "Delayed";
  let idx = stages.findIndex((s) => s.status !== "Completed");
  if (idx < 0) idx = Math.max(0, stages.length - 1);
  j.current_stage_index = idx;
  const allDone = stages.length && stages.every((s) => s.status === "Completed");
  if (allDone) {
    j.status = "Completed";
    const fin = stages[stages.length - 1];
    j.actual_return = fin.actual_return || now;
    j.quantity_received = fin.quantity_received || 0;
  } else if (stages.some((s) => ["Delayed", "Sent", "In Process", "Completed"].includes(s.status))) j.status = "In Process";
  else if (stages.length && stages.every((s) => s.status === "Pending")) j.status = "Pending";
  if (allDone && j.id) await stockIn(j, stages[stages.length - 1], u);
  return j;
};
const saveJob = (j) => update("job_work", j.id, pick(j, [...JW_KEYS, "actual_return", "auto_stock_in_done", "inventory_transaction_id", "process_history"]));

export const api = {
  // auth
  login: async (login_id, password) => {
    await bootstrapWorkspace().catch(() => {});
    me = null;
    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail(login_id), password });
    if (error) fail("Invalid credentials", 401);
    try { const user = await currentUser(); return { token: data.session.access_token, user }; }
    catch (e) { await supabase.auth.signOut(); throw e; }
  },
  me: async () => { me = null; return currentUser(); },
  logout: async () => { me = null; localStorage.removeItem("aa-user"); await supabase.auth.signOut(); },

  // settings
  getCompany: async () => (await run(supabase.from("company_settings").select("*").limit(1)))[0] || null,
  updateCompany: async (b) => {
    const cur = await api.getCompany();
    return update("company_settings", cur.id, pick(b, COMPANY_KEYS));
  },

  // users / team
  listUsers: async () => {
    const [ps, rs] = await Promise.all([list("profiles"), run(supabase.from("user_roles").select("*"))]);
    return ps.map((p) => ({ ...p, role: rs.find((r) => r.user_id === p.id)?.role || "Sales" }));
  },
  createUser: (b) => createErpUser({ data: { ...b, active: b.active ?? true } }).catch((e) => fail(e.message)),
  updateUser: async (id, b) => {
    const patch = { ...b }; if (!patch.password) delete patch.password;
    await updateErpUser({ data: { id, patch } }).catch((e) => fail(e.message));
    return { id, ...patch };
  },
  deleteUser: (id) => deleteErpUser({ data: { id } }).catch((e) => fail(e.message)),

  // roles
  listRoles: () => list("role_permissions"),
  updateRole: async (role, modules) => {
    const ex = await run(supabase.from("role_permissions").select("id").eq("role", role).maybeSingle());
    return ex ? update("role_permissions", ex.id, { modules }) : insert("role_permissions", { role, modules });
  },

  // clients
  listClients: async () => enrichClients(await list("clients")),
  listStaleClients: async () => (await api.listClients()).filter((c) => c.days_since_contact >= STALE_DAYS && !c.next_followup_at).sort((a, b) => b.days_since_contact - a.days_since_contact),
  getClient: (id) => one("clients", id, "Client"),
  createClient: async (b) => {
    const u = await currentUser();
    const row = { ...pick(b, CLIENT_KEYS), owner_id: u.id };
    if (u.role === "Dealer") row.dealer_id = u.id;
    return insert("clients", row);
  },
  updateClient: (id, b) => update("clients", id, pick(b, CLIENT_KEYS)),
  deleteClient: (id) => del("clients", id),

  // interactions
  listInteractions: (cid) => run(supabase.from("interactions").select("*").eq("client_id", cid).order("at", { ascending: false })),
  createInteraction: async (b) => {
    const u = await currentUser();
    return insert("interactions", { ...pick(b, ["client_id", "at", "discussion", "outcome", "next_step", "next_followup_at", "accent"]), at: b.at || nowIso(), next_followup_at: b.next_followup_at || null, by_user: u.id });
  },
  allFollowups: async () => {
    const rows = await run(supabase.from("interactions").select("*, client:clients(*)").not("next_followup_at", "is", null).order("next_followup_at", { ascending: true }).limit(500));
    return rows.map((r) => ({ ...r, client: r.client || {} }));
  },

  // products
  listProducts: () => list("products"),
  createProduct: (b) => insert("products", pick(b, PRODUCT_KEYS)),
  updateProduct: (id, b) => update("products", id, pick(b, PRODUCT_KEYS)),
  deleteProduct: (id) => del("products", id),

  // quotations
  listQuotations: async () => {
    const [qs, os] = await Promise.all([list("quotations"), run(supabase.from("orders").select("id, number, status, quotation_id").not("quotation_id", "is", null))]);
    return qs.map((q) => { const o = os.find((x) => x.quotation_id === q.id); return o ? { ...q, synced_order_id: o.id, synced_order_number: o.number, synced_order_status: o.status } : q; });
  },
  getQuotation: async (id) => (await api.listQuotations()).find((q) => q.id === id) || fail("Quotation not found", 404),
  createQuotation: async (b) => {
    const u = await currentUser();
    const row = pick(b, QUOTE_KEYS);
    row.number = row.number || (await nextNumber("QT"));
    row.order_date = row.order_date || nowIso();
    row.created_by = u.id;
    if (u.role === "Dealer") row.dealer_id = u.id;
    if (!row.client_name) row.client_name = (await one("clients", row.client_id, "Client")).company;
    return insert("quotations", row);
  },
  updateQuotation: async (id, b) => {
    const q = await update("quotations", id, pick(b, QUOTE_KEYS));
    const linked = await run(supabase.from("orders").select("*").eq("quotation_id", id).maybeSingle());
    if (linked) {
      const prev = Object.fromEntries((linked.items || []).map((i) => [i.name, i]));
      const items = (q.items || []).map((qi) => {
        const p = prev[qi.name];
        return { product_id: p?.product_id ?? null, name: qi.name, description: qi.description || "", quantity: qi.quantity, unit_price: qi.unit_price, gst_percent: qi.gst_percent, stage: p?.stage || "In Planning", progress: p?.progress ?? 0, notes: p?.notes || "" };
      });
      await update("orders", linked.id, { items, status: orderStatus(items), revised_at: nowIso() });
      q.synced_order_id = linked.id; q.synced_order_number = linked.number;
    }
    return q;
  },
  deleteQuotation: (id) => del("quotations", id),
  convertQuotation: async (id) => {
    const u = await currentUser();
    const q = await one("quotations", id, "Quotation");
    const order = await insert("orders", {
      number: await nextNumber("ORD"), quotation_id: id, client_id: q.client_id, client_name: q.client_name || "",
      order_date: nowIso(), dealer_id: q.dealer_id, created_by: u.id,
      items: (q.items || []).map((i) => ({ product_id: null, name: i.name, description: i.description || "", quantity: i.quantity, unit_price: i.unit_price, gst_percent: i.gst_percent, stage: "In Planning", progress: 0, notes: "" })),
    });
    await update("quotations", id, { status: "Converted" });
    return order;
  },

  // orders
  listOrders: () => list("orders"),
  getOrder: (id) => one("orders", id, "Order"),
  createOrder: async (b) => {
    const u = await currentUser();
    const row = pick(b, ORDER_KEYS);
    row.number = row.number || (await nextNumber("ORD"));
    row.order_date = row.order_date || nowIso();
    row.created_by = u.id;
    if (u.role === "Dealer") row.dealer_id = u.id;
    if (!row.client_name) row.client_name = (await one("clients", row.client_id, "Client")).company;
    return insert("orders", row);
  },
  updateOrder: (id, b) => update("orders", id, pick(b, ["expected_delivery", "dispatch_date", "items", "status", "notes", "dealer_id"])),
  deleteOrder: (id) => del("orders", id),
  updateStage: async (id, b) => {
    const u = await currentUser();
    const o = await one("orders", id, "Order");
    const idx = Number(b.item_index || 0);
    if (idx >= o.items.length) fail("Invalid item_index");
    const it = o.items[idx];
    if (b.stage) it.stage = b.stage;
    if (b.progress !== undefined && b.progress !== null) it.progress = parseInt(b.progress, 10);
    if (b.notes) it.notes = b.notes;
    const saved = await update("orders", id, { items: o.items, status: orderStatus(o.items) });
    await insert("production_updates", { order_id: id, item_index: idx, stage: it.stage, progress: it.progress, notes: b.notes || "", by_user: u.id });
    return saved;
  },
  orderSummary: async (id) => {
    const o = await one("orders", id, "Order");
    const pays = await run(supabase.from("payments").select("amount").eq("order_id", id));
    const received = pays.reduce((a, p) => a + Number(p.amount), 0);
    const { subtotal, gst, grand } = orderTotals(o);
    return { subtotal, gst, grand_total: grand, received, pending: Math.max(grand - received, 0), payment_status: received >= grand ? "Fully Paid" : received === 0 ? "Unpaid" : "Partially Paid" };
  },

  // dispatch
  listDispatches: async () => {
    const rows = await run(supabase.from("dispatches").select("*, order:orders(number, client_name, items)").order("created_at", { ascending: false }));
    return rows.map(({ order, ...r }) => {
      const items = order?.items || [];
      return { ...r, order_number: order?.number, client_name: order?.client_name, item_name: items.length ? items[Math.min(r.item_index || 0, items.length - 1)]?.name : null };
    });
  },
  createDispatch: async (b) => {
    const row = pick(b, ["number", "order_id", "item_index", "dispatch_at", "vehicle_number", "transporter", "driver_name", "driver_phone", "bilty_number", "notes", "status"]);
    row.item_index = Number(row.item_index || 0);
    row.number = row.number || (await nextNumber("DSP"));
    row.dispatch_at = row.dispatch_at || nowIso();
    const d = await insert("dispatches", row);
    const o = await one("orders", row.order_id, "Order");
    if (row.item_index < o.items.length) {
      o.items[row.item_index].stage = "Dispatched";
      o.items[row.item_index].progress = 100;
      const patch = { items: o.items, dispatch_date: row.dispatch_at };
      if (o.items.every((i) => i.stage === "Dispatched")) patch.status = "Dispatched";
      await update("orders", o.id, patch);
    }
    return d;
  },

  // payments
  listPayments: () => list("payments"),
  createPayment: async (b) => {
    const row = pick(b, ["number", "order_id", "client_id", "at", "amount", "mode", "reference", "notes"]);
    row.number = row.number || (await nextNumber("PAY"));
    row.at = row.at || nowIso();
    if (!row.client_id) row.client_id = (await one("orders", row.order_id, "Order")).client_id;
    return insert("payments", row);
  },
  deletePayment: (id) => del("payments", id),

  // inventory
  listInventory: () => list("inventory_items", "name", true),
  inventoryAlerts: async () => (await api.listInventory()).filter((i) => Number(i.current_stock) < Number(i.min_level)).sort((a, b) => (a.current_stock - a.min_level) - (b.current_stock - b.min_level)),
  createInventory: (b) => insert("inventory_items", pick(b, INV_KEYS)),
  updateInventory: (id, b) => update("inventory_items", id, pick(b, INV_KEYS)),
  deleteInventory: (id) => del("inventory_items", id),
  listInventoryTxns: async () => {
    const [rows, users] = await Promise.all([
      run(supabase.from("inventory_transactions").select("*, item:inventory_items(sku, name, unit), order:orders(number, client_name), jw:job_work(number, item)").order("at", { ascending: false })),
      run(supabase.from("profiles").select("id, name")),
    ]);
    return rows.map(({ item, order, jw, ...r }) => ({
      ...r, item_sku: item?.sku, item_name: item?.name, item_unit: item?.unit,
      order_number: order?.number, order_client: order?.client_name,
      job_work_number: jw?.number, job_work_item: jw?.item,
      by_user_name: users.find((x) => x.id === r.by_user)?.name,
    }));
  },
  createInventoryTxn: async (b) => {
    const u = await currentUser();
    const row = pick(b, ["item_id", "txn_type", "quantity", "at", "reference_number", "party", "remarks", "order_id", "job_work_id", "allow_negative"]);
    row.by_user = u.id; row.at = row.at || nowIso(); row.quantity = Number(row.quantity) || 0;
    const { data, error } = await supabase.from("inventory_transactions").insert(row).select().single();
    if (error) fail(error.message.includes("Insufficient") ? error.message + " Pass allow_negative=true to override." : error.message);
    return data;
  },

  // vendors
  listVendors: async () => {
    const [vendors, jobs] = await Promise.all([list("vendors", "name", true), list("job_work")]);
    const now = nowIso();
    const key = (s) => (s || "").trim().toLowerCase();
    const map = new Map(vendors.map((v) => [key(v.name), { ...v, registered: true }]));
    for (const j of jobs.map(decorateJob)) for (const s of j.stages || []) {
      if (!key(s.vendor)) continue;
      if (!map.has(key(s.vendor))) map.set(key(s.vendor), { id: null, name: s.vendor.trim(), vendor_type: "Job Work", registered: false });
      const v = map.get(key(s.vendor));
      v._stages = [...(v._stages || []), { ...s, job_id: j.id, job_number: j.number, item: j.item }];
    }
    return [...map.values()].map((v) => {
      const st = v._stages || [];
      const done = st.filter((s) => s.status === "Completed");
      const day = (d) => (d ? String(d).slice(0, 10) : null);
      const onTime = done.filter((s) => !s.expected_return || day(s.actual_return) <= day(s.expected_return)).length;
      const lateDone = done.length - onTime;
      const openLate = st.filter((s) => !["Completed", "Cancelled"].includes(s.status) && s.expected_return && s.expected_return < now);
      const recv = done.reduce((a, s) => a + (Number(s.quantity_received) || 0), 0);
      const rej = done.reduce((a, s) => a + (Number(s.rejection_quantity) || 0), 0);
      const judged = done.length + openLate.length;
      const onTimePct = judged ? onTime / judged : null;
      const rejPct = recv + rej > 0 ? rej / (recv + rej) : 0;
      const score = onTimePct == null ? null : 0.5 * onTimePct + 0.5 * (1 - Math.min(1, rejPct * 5));
      const { _stages, ...rest } = v;
      return { ...rest, stages: st, total_jobs: st.length, completed: done.length, on_time: onTime,
        delayed: lateDone + openLate.length, open_delayed: openLate, active: v.active ?? true,
        received_qty: recv, rejected_qty: rej, rejection_pct: rejPct * 100,
        on_time_pct: onTimePct == null ? null : onTimePct * 100,
        rating: score == null ? null : Math.round((1 + 4 * score) * 10) / 10 };
    }).sort((a, b) => a.name.localeCompare(b.name));
  },
  saveVendor: async (b) => {
    const row = pick(b, ["name", "vendor_type", "contact_person", "phone", "whatsapp", "email", "city", "address", "services", "notes", "active"]);
    return b.id ? update("vendors", b.id, row) : insert("vendors", row);
  },
  deleteVendor: (id) => del("vendors", id),
  vendorLogs: (vendorId) => run(supabase.from("vendor_logs").select("*, jw:job_work(number, item)").eq("vendor_id", vendorId).order("created_at", { ascending: false })),
  addVendorLog: async (b) => {
    const u = await currentUser();
    return insert("vendor_logs", { ...pick(b, ["vendor_id", "job_work_id", "log_type", "note", "delay_reason", "next_followup_at"]), by_user: u.id });
  },
  deleteVendorLog: (id) => del("vendor_logs", id),

  // job work
  listJobwork: async () => (await list("job_work")).map(decorateJob),
  jobworkSuggestions: async () => {
    const rows = await list("job_work");
    const collect = (k) => {
      const v = new Set();
      for (const r of rows) {
        if ((r[k] || "").trim()) v.add(r[k].trim());
        if (k === "vendor" || k === "process") for (const s of r.stages || []) if ((s[k] || "").trim()) v.add(s[k].trim());
      }
      return [...v].sort();
    };
    const ps = collect("process"), pst = collect("process_stage");
    return { vendors: collect("vendor"), items: collect("item"), work_types: collect("work_type"),
      processes: ps.length ? ps : ["Hardening", "Nitriding", "Blackodising", "Plating", "Grinding", "Polishing"],
      process_stages: pst.length ? pst : ["Cutting", "Grinding", "Hardening", "Plating", "Polishing", "QC", "Final"] };
  },
  createJobwork: async (b) => {
    const u = await currentUser();
    const j = pick(b, JW_KEYS);
    j.number = j.number || (await nextNumber("JW"));
    j.stages = (j.stages || []).map((s, i) => ({ ...s, stage_number: i + 1 }));
    j.current_stage_index = 0;
    if (j.stages.length) {
      const s0 = j.stages[0];
      if (!j.initial_quantity) j.initial_quantity = s0.quantity_sent || 0;
      j.vendor = s0.vendor || ""; j.quantity_sent = s0.quantity_sent || 0;
      j.send_date = s0.sent_date || j.send_date || null; j.expected_return = s0.expected_return || j.expected_return || null;
    }
    await recomputeJob(j, u);
    let saved = await insert("job_work", j);
    if (saved.status === "Completed" && saved.inventory_item_id) { await recomputeJob(saved, u); saved = await saveJob(saved); }
    return decorateJob(saved);
  },
  updateJobwork: async (id, b) => {
    const u = await currentUser();
    const j = { ...(await one("job_work", id, "Job work")), ...pick(b, JW_KEYS) };
    await recomputeJob(j, u);
    return decorateJob(await saveJob(j));
  },
  deleteJobwork: (id) => del("job_work", id),
  jobworkProcess: async (id, b) => {
    const u = await currentUser();
    const j = await one("job_work", id, "Job work");
    j.process_history = [...(j.process_history || []), { at: nowIso(), stage: b.stage, quantity: b.quantity ?? null, note: b.note || "", by_user: u.id }];
    j.process_stage = b.stage;
    if (b.quantity_received_delta) {
      j.quantity_received = Number(j.quantity_received || 0) + Number(b.quantity_received_delta);
      if (j.quantity_received >= Number(j.quantity_sent || 0)) { j.status = "Completed"; j.actual_return = nowIso(); }
      else if (j.quantity_received > 0) j.status = "Partially Received";
    }
    return saveJob(j);
  },
  updateJobworkStage: async (id, idx, b) => {
    const u = await currentUser();
    const j = await one("job_work", id, "Job work");
    if (idx >= (j.stages || []).length) fail("Invalid stage index");
    j.stages[idx] = { ...j.stages[idx], ...b };
    await recomputeJob(j, u);
    return saveJob(j);
  },
  addJobworkStage: async (id, b) => {
    const u = await currentUser();
    const j = await one("job_work", id, "Job work");
    j.stages = [...(j.stages || []), { quantity_sent: 0, quantity_received: 0, rejection_quantity: 0, status: "Pending", notes: "", images: [], ...b, stage_number: (j.stages || []).length + 1 }];
    await recomputeJob(j, u);
    return saveJob(j);
  },
  recomputeJobwork: async (id) => {
    const u = await currentUser();
    const j = await one("job_work", id, "Job work");
    await recomputeJob(j, u);
    return decorateJob(await saveJob(j));
  },
  completeJobworkStage: async (id, idx, body) => {
    const u = await currentUser();
    const j = await one("job_work", id, "Job work");
    const stages = j.stages || [];
    if (idx >= stages.length) fail("Invalid stage index");
    const cur = stages[idx];
    cur.status = "Completed";
    cur.actual_return = body.actual_return || nowIso();
    if (body.quantity_received != null) cur.quantity_received = Number(body.quantity_received);
    if (body.rejection_quantity != null) cur.rejection_quantity = Number(body.rejection_quantity);
    if (body.notes) cur.notes = body.notes;
    if (body.challan_number) cur.challan_number = body.challan_number;
    if (idx < stages.length - 1) {
      j.current_stage_index = idx + 1;
      const nxt = stages[idx + 1];
      if (!nxt.quantity_sent) nxt.quantity_sent = cur.quantity_received;
      if (!nxt.sent_date) nxt.sent_date = nowIso();
      if (nxt.status === "Pending") nxt.status = "Sent";
      j.status = "In Process";
    } else {
      j.status = "Completed";
      j.actual_return = cur.actual_return;
      j.quantity_received = cur.quantity_received;
      if (body.add_to_inventory) {
        if (body.new_inventory_item) {
          const nd = body.new_inventory_item;
          if (!nd.sku || !nd.name) fail("new_inventory_item requires sku and name");
          const it = await insert("inventory_items", { sku: nd.sku, name: nd.name, category: nd.category || "Raw Material", unit: nd.unit || "pcs", current_stock: 0, min_level: Number(nd.min_level || 0), supplier: nd.supplier || cur.vendor || "", location: nd.location || "" });
          j.inventory_item_id = it.id;
        } else if (body.inventory_item_id) j.inventory_item_id = body.inventory_item_id;
      }
      await stockIn(j, cur, u);
    }
    j.stages = stages;
    return decorateJob(await saveJob(j));
  },

  // dashboard
  dashboard: async () => {
    const [clients, orders, payments, followups, inv, jobs] = await Promise.all([
      api.listClients(), api.listOrders(), api.listPayments(),
      run(supabase.from("interactions").select("next_followup_at").not("next_followup_at", "is", null)),
      api.listInventory(), api.listJobwork(),
    ]);
    const dispatched = orders.filter((o) => o.status === "Dispatched").length;
    let pending = 0;
    for (const o of orders) {
      const paid = payments.filter((p) => p.order_id === o.id).reduce((a, p) => a + Number(p.amount), 0);
      pending += Math.max(orderTotals(o).grand - paid, 0);
    }
    const now = nowIso(), today = now.slice(0, 10);
    return {
      total_clients: clients.length, total_orders: orders.length, active_orders: orders.length - dispatched,
      in_production: orders.filter((o) => o.status === "In Production").length,
      ready_for_dispatch: orders.filter((o) => (o.items || []).some((i) => i.stage === "Ready for Dispatch")).length,
      dispatched,
      today_followups: followups.filter((f) => f.next_followup_at.slice(0, 10) === today).length,
      overdue_followups: followups.filter((f) => f.next_followup_at < now).length,
      pending_payments: pending,
      stale_clients: clients.filter((c) => c.is_stale).length,
      low_stock_count: inv.filter((i) => Number(i.current_stock) < Number(i.min_level)).length,
      vendor_overdue_count: jobs.filter((j) => j.is_overdue).length,
    };
  },
};

// Formatting helpers
export const fmtMoney = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
export const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return iso; }
};
export const fmtDateTime = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
};
export const relTime = (iso) => {
  if (!iso) return "";
  const diff = (new Date(iso) - new Date()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 3600) return `${Math.round(abs / 60)} min ${diff < 0 ? "ago" : "to go"}`;
  if (abs < 86400) return `${Math.round(abs / 3600)} hr ${diff < 0 ? "ago" : "to go"}`;
  return fmtDate(iso);
};

// UI permission helper (the database enforces the real rules)
export const can = (user, moduleId) => {
  if (!user) return false;
  if (user.role === "Admin") return true;
  const map = {
    Sales: ["dashboard", "clients", "followups", "quotations", "orders", "settings"],
    Production: ["dashboard", "orders", "production", "dispatch", "inventory", "jobwork"],
    QC: ["dashboard", "orders", "production", "dispatch"],
    Accountant: ["dashboard", "clients", "quotations", "orders", "payments", "reports", "settings"],
    Dealer: ["dashboard", "clients", "quotations", "orders", "production", "dispatch"],
  };
  return (map[user.role] || []).includes(moduleId);
};
export const hidesFinance = (user) => user?.role === "Production" || user?.role === "QC";
