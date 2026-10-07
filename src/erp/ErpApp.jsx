import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./erp.css";
import { Toaster, toast } from "sonner";
import {
  Activity, ArrowUpRight, Bell, Box, BriefcaseBusiness, CalendarDays, Check, ChevronDown,
  ClipboardList, Clock3, Factory, FileText, HardHat, LayoutDashboard, Menu, Moon,
  MoreHorizontal, Package, PanelLeftClose, Phone, Plus, Printer, Receipt, Search, Settings,
  ShieldCheck, Truck, UserRound, Users, WalletCards, Wrench, X, Zap, LogOut, Sun, MessageCircle,
  Pencil, Trash2, Download, FileEdit, Building2, Image as ImageIcon, Bold, Italic, List as ListIcon,
  Pilcrow, Save, UploadCloud,
} from "lucide-react";
import { api, fmtMoney, fmtDate, fmtDateTime, relTime, can, hidesFinance } from "./api";

/* ========================= Config ========================= */
const BRAND = { name: "Aalidhra", suffix: " Cashew", tagline: "CASHEW EXPORT ERP" };
const ROLE_META = {
  Admin: { initials: "AD", color: "orange" },
  Sales: { initials: "SV", color: "blue" },
  Production: { initials: "PM", color: "green" },
  QC: { initials: "QC", color: "purple" },
  Accountant: { initials: "AC", color: "teal" },
  Dealer: { initials: "DL", color: "orange" },
};
const NAV = [
  { label: "Workspace", items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clients", label: "Clients & CRM", icon: Users },
    { id: "followups", label: "Follow-ups", icon: CalendarDays },
  ]},
  { label: "Operations", items: [
    { id: "quotations", label: "Quotations", icon: FileText },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "production", label: "Production", icon: Factory },
    { id: "dispatch", label: "Dispatch", icon: Truck },
  ]},
  { label: "Finance & Stock", items: [
    { id: "payments", label: "Payments", icon: WalletCards },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "jobwork", label: "Job Work", icon: Wrench },
    { id: "vendors", label: "Vendors", icon: Building2 },
    { id: "reports", label: "Reports", icon: Activity },
  ]},
  { label: "Administration", items: [
    { id: "team", label: "Team & Roles", icon: ShieldCheck },
    { id: "products", label: "Product Master", icon: Box },
    { id: "settings", label: "Company Settings", icon: Settings },
  ]},
];

const STAGES = ["In Planning", "Production Started", "Assembly & Wiring", "Testing & QC", "Ready for Dispatch", "Dispatched"];
const STATUS_TONES = {
  "Hot": "orange", "Warm": "blue", "Cold": "gray", "Order Won": "green", "Lost": "red",
  "Draft": "gray", "Sent": "blue", "Awaiting response": "orange", "Approved": "green", "Rejected": "red", "Converted": "purple",
  "In Production": "blue", "Ready for Dispatch": "orange", "Dispatched": "green",
  "Fully Paid": "green", "Partially Paid": "orange", "Unpaid": "red",
  "Pending": "gray", "Material Sent": "blue", "In Process": "orange", "Partially Received": "orange", "Completed": "green", "Cancelled": "red",
};

/* ========================= Primitives ========================= */
const Badge = ({ children, tone }) => (
  <span className={`badge badge-${tone || STATUS_TONES[children] || "neutral"}`}
    data-testid={`status-badge-${String(children).toLowerCase().replaceAll(" ", "-")}`}>{children}</span>
);
const Stars = ({ value }) => (
  <span className="stars" data-testid="client-rating">{"★".repeat(value || 0)}<i>{"★".repeat(5 - (value || 0))}</i></span>
);
const Metric = ({ label, value, change, icon: Icon, tone = "orange", onClick }) => (
  <button className="metric-card metric-btn" onClick={onClick}
    data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}>
    <div className={`metric-icon ${tone}`}><Icon size={19} /></div>
    <div className="metric-label">{label}</div>
    <div className="metric-value">{value}</div>
    {change && <div className="metric-change"><span>{change}</span></div>}
  </button>
);
const Avatar = ({ name, color = "blue", xl }) => (
  <div className={`avatar ${xl ? "xl" : ""} ${color}`}>
    {String(name || "").split(" ").filter(Boolean).map(x => x[0]).slice(0, 2).join("").toUpperCase() || "?"}
  </div>
);
const Modal = ({ show, onClose, title, eyebrow = "QUICK ACTION", children, wide }) => {
  if (!show) return null;
  return (
    <div className="modal-backdrop" data-testid="modal-backdrop" onClick={onClose}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>
          <button className="icon-btn" onClick={onClose} data-testid="modal-close-button"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};
const Loader = () => <div className="loader" data-testid="loader"><i /><i /><i /></div>;
const Empty = ({ msg }) => <div className="empty-state" data-testid="empty-state"><Factory size={28} /><p>{msg}</p></div>;

/* ========================= Rich text editor for T&C ========================= */
const RichText = ({ value, onChange }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);
  const exec = (cmd, arg) => {
    document.execCommand(cmd, false, arg || null);
    if (ref.current) onChange(ref.current.innerHTML);
    ref.current?.focus();
  };
  return (
    <div className="rich-text" data-testid="rich-text-editor">
      <div className="rich-toolbar">
        <button type="button" onClick={() => exec("bold")} data-testid="rt-bold"><Bold size={14} /></button>
        <button type="button" onClick={() => exec("italic")} data-testid="rt-italic"><Italic size={14} /></button>
        <button type="button" onClick={() => exec("insertUnorderedList")} data-testid="rt-list"><ListIcon size={14} /></button>
        <button type="button" onClick={() => exec("formatBlock", "<p>")} data-testid="rt-paragraph"><Pilcrow size={14} /></button>
      </div>
      <div className="rich-editor" contentEditable ref={ref} suppressContentEditableWarning
        data-testid="rich-text-area"
        onInput={e => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
};

/* ========================= Login ========================= */
function LoginPage({ onLogin }) {
  const [loginId, setLoginId] = useState("admin");
  const [password, setPassword] = useState("Aalidhra@2026");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const demoRoles = [
    ["admin", "Admin"], ["sales", "Sales"], ["production", "Production"],
    ["qc", "QC"], ["accountant", "Accountant"], ["dealer", "Dealer"],
  ];
  const submit = async (e) => {
    e?.preventDefault();
    setErr(""); setBusy(true);
    try {
      const data = await api.login(loginId, password);
      localStorage.setItem("aa-token", data.token);
      localStorage.setItem("aa-user", JSON.stringify(data.user));
      toast.success(`Welcome back, ${data.user.name}`);
      onLogin(data.user);
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };
  return (
    <main className="login-shell" data-testid="login-page">
      <section className="login-art">
        <div className="login-brand"><span className="brand-mark"><Factory size={20} /></span><span>{BRAND.name}<strong>{BRAND.suffix}</strong></span></div>
        <div className="art-copy">
          <p className="eyebrow">OPERATIONS CONTROL CENTER</p>
          <h1>Make every<br /><em>move</em> count.</h1>
          <p>One connected workspace for your sales floor, factory and dispatch bay.</p>
        </div>
        <div className="factory-lines"><span /><span /><span /><span /></div>
        <div className="art-foot"><span><Zap size={14} /> Live operational view</span><span>v2.5 · Demo workspace</span></div>
      </section>
      <section className="login-panel">
        <div className="mobile-brand"><span className="brand-mark"><Factory size={18} /></span>{BRAND.name}<strong>{BRAND.suffix}</strong></div>
        <form className="login-card" onSubmit={submit}>
          <div className="login-header">
            <div className="login-icon"><ShieldCheck size={24} /></div>
            <p className="eyebrow">SECURE WORKSPACE</p>
            <h2>Welcome back</h2>
            <p>Sign in to your operations console</p>
          </div>
          <label className="field-label">Quick demo login</label>
          <div className="role-chips">
            {demoRoles.map(([id, label]) => (
              <button type="button" key={id} className={`chip ${loginId === id ? "active" : ""}`}
                onClick={() => { setLoginId(id); setPassword("Aalidhra@2026"); }}
                data-testid={`login-chip-${id}`}>{label}</button>
            ))}
          </div>
          <label className="field-label">Login ID</label>
          <div className="input-wrap"><UserRound size={17} />
            <input value={loginId} onChange={e => setLoginId(e.target.value)}
              data-testid="login-id-input" autoComplete="username" />
          </div>
          <label className="field-label">Password</label>
          <div className="input-wrap"><ShieldCheck size={17} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              data-testid="login-password-input" autoComplete="current-password" />
          </div>
          {err && <p className="form-err" data-testid="login-error">{err}</p>}
          <button type="submit" className="primary-btn login-btn" disabled={busy} data-testid="login-submit-button">
            {busy ? "Signing in..." : "Enter workspace"} <ArrowUpRight size={17} />
          </button>
          <p className="demo-note"><span className="live-dot" /> Demo mode · password is <code>Aalidhra@2026</code> for any role</p>
        </form>
        <div className="login-support">Need help? <span>Contact workspace admin</span></div>
      </section>
    </main>
  );
}

/* ========================= Dashboard ========================= */
function Dashboard({ user, setPage, orders, clients, followups, stats, inventory, jobs }) {
  const readyItems = useMemo(() => {
    const out = [];
    (orders || []).forEach(o => (o.items || []).forEach((it, idx) => {
      if (it.stage === "Ready for Dispatch") out.push({ ...it, orderId: o.id, orderNumber: o.number, client: o.client_name, target: o.expected_delivery, idx });
    }));
    return out;
  }, [orders]);
  const upcoming = (followups || []).slice(0, 4);
  const staleClients = useMemo(() =>
    (clients || []).filter(c => c.is_stale || c.followup_overdue)
      .sort((a, b) => (b.days_since_contact || 0) - (a.days_since_contact || 0))
      .slice(0, 5), [clients]);
  const lowStock = useMemo(() => (inventory || []).filter(i => (i.current_stock || 0) < (i.min_level || 0)).slice(0, 6), [inventory]);
  const vendorAlerts = useMemo(() => (jobs || []).filter(j => j.is_overdue).slice(0, 6), [jobs]);
  const stageCounts = STAGES.map(s => ({ s, n: (orders || []).reduce((a, o) => a + (o.items || []).filter(i => i.stage === s).length, 0) }));

  return (
    <div className="page-content" data-testid="page-dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{fmtDate(new Date().toISOString()).toUpperCase()}</p>
          <h1>Good day, {user.name.split(" ")[0]}</h1>
          <p className="subheading">Here's the operational pulse across your workspace.</p>
        </div>
        <div className="heading-actions">
          <button className="ghost-btn" onClick={() => setPage("followups")} data-testid="dashboard-followups-button"><CalendarDays size={16} /> View follow-ups</button>
          {can(user, "quotations") && <button className="primary-btn" onClick={() => setPage("quotations")} data-testid="dashboard-new-quotation-button"><Plus size={17} /> New quotation</button>}
        </div>
      </div>
      {(stats?.stale_clients > 0 || stats?.overdue_followups > 0 || stats?.low_stock_count > 0 || stats?.vendor_overdue_count > 0) && (
        <div className="attention-banner" data-testid="attention-banner" onClick={() => setPage("clients")}>
          <Bell size={16} />
          <span>
            <strong>Needs your attention</strong>
            {stats?.stale_clients > 0 && ` · ${stats.stale_clients} silent client${stats.stale_clients > 1 ? "s" : ""}`}
            {stats?.overdue_followups > 0 && ` · ${stats.overdue_followups} overdue follow-up${stats.overdue_followups > 1 ? "s" : ""}`}
            {stats?.low_stock_count > 0 && ` · ${stats.low_stock_count} low-stock item${stats.low_stock_count > 1 ? "s" : ""}`}
            {stats?.vendor_overdue_count > 0 && ` · ${stats.vendor_overdue_count} overdue vendor${stats.vendor_overdue_count > 1 ? "s" : ""}`}
          </span>
          <ArrowUpRight size={14} />
        </div>
      )}
      <div className="metric-grid">
        <Metric label="Total clients" value={stats?.total_clients ?? "—"} icon={Users} tone="orange" onClick={() => setPage("clients")} />
        <Metric label="Active orders" value={stats?.active_orders ?? "—"} icon={ClipboardList} tone="blue" onClick={() => setPage("orders")} />
        <Metric label="In production" value={stats?.in_production ?? "—"} icon={Factory} tone="green" onClick={() => setPage("production")} />
        {!hidesFinance(user) && <Metric label="Pending payments" value={fmtMoney(stats?.pending_payments)} icon={WalletCards} tone="purple" onClick={() => setPage("payments")} />}
        {hidesFinance(user) && <Metric label="Ready to dispatch" value={stats?.ready_for_dispatch ?? "—"} icon={Truck} tone="purple" onClick={() => setPage("dispatch")} />}
      </div>
      <div className="dashboard-grid">
        <section className="panel dispatch-panel">
          <div className="panel-head">
            <div><p className="eyebrow">PRODUCTION PULSE</p><h3>Ready for dispatch <span className="count-pill">{readyItems.length}</span></h3></div>
            <button className="text-btn" onClick={() => setPage("dispatch")} data-testid="view-dispatch-link">View dispatch board <ArrowUpRight size={15} /></button>
          </div>
          <div className="dispatch-list">
            {readyItems.length === 0 && <Empty msg="No machines ready to dispatch" />}
            {readyItems.map((it, i) => (
              <div className="dispatch-row" key={`${it.orderId}-${it.idx}`} data-testid={`ready-dispatch-row-${i}`}>
                <div className="machine-thumb"><HardHat size={19} /></div>
                <div className="dispatch-main"><strong>{it.name}</strong><span>{it.client} · {it.orderNumber}</span></div>
                <div className="dispatch-target"><small>Target</small><strong>{fmtDate(it.target)}</strong></div>
                <Badge>Ready for Dispatch</Badge>
                <button className="icon-btn" onClick={() => setPage("dispatch")} data-testid={`dispatch-row-action-${i}`}><ArrowUpRight size={17} /></button>
              </div>
            ))}
          </div>
        </section>
        <section className="panel follow-panel">
          <div className="panel-head">
            <div><p className="eyebrow">YOUR CALENDAR</p><h3>Upcoming follow-ups</h3></div>
            <button className="icon-btn" onClick={() => setPage("followups")} data-testid="followups-calendar-button"><CalendarDays size={17} /></button>
          </div>
          {upcoming.length === 0 && <Empty msg="No follow-ups scheduled" />}
          {upcoming.map((f, i) => (
            <div className="follow-row" key={f.id} data-testid={`upcoming-followup-${i}`}>
              <div className={`timeline-dot ${f.accent || "orange"}`} />
              <div><strong>{f.client?.company || "—"}</strong><span>{f.discussion || f.next_step}</span></div>
              <time>{fmtDateTime(f.next_followup_at)}</time>
            </div>
          ))}
        </section>
      </div>
      {staleClients.length > 0 && can(user, "clients") && (
        <section className="panel attention-panel" data-testid="attention-panel">
          <div className="panel-head">
            <div><p className="eyebrow">NEEDS A CALL</p><h3>Silent clients <span className="count-pill red">{staleClients.length}</span></h3></div>
            <button className="text-btn" onClick={() => setPage("clients")} data-testid="attention-see-all">See all clients <ArrowUpRight size={15} /></button>
          </div>
          <div className="attention-list">
            {staleClients.map((c, i) => (
              <div className="attention-row" key={c.id} data-testid={`attention-row-${i}`}>
                <Avatar name={c.person} color={c.color} />
                <div className="attention-main">
                  <strong>{c.company}</strong>
                  <span>{c.person} · {c.city || "—"}</span>
                </div>
                <div className="attention-meta">
                  <small>Last contact</small>
                  <strong className={c.is_stale ? "red-text" : "orange-text"}>
                    {c.days_since_contact === 0 ? "Today" : c.days_since_contact === 1 ? "Yesterday" : `${c.days_since_contact} days ago`}
                  </strong>
                </div>
                <div className="attention-actions">
                  <a className="icon-btn" href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} data-testid={`attention-call-${i}`}><Phone size={15} /></a>
                  <a className="icon-btn" href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                    data-testid={`attention-whatsapp-${i}`}><MessageCircle size={15} /></a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {(lowStock.length > 0 || vendorAlerts.length > 0) && (
        <div className="dashboard-grid">
          {lowStock.length > 0 && (
            <section className="panel attention-panel stock-panel" data-testid="low-stock-panel">
              <div className="panel-head">
                <div><p className="eyebrow">INVENTORY ALERT</p><h3>Low stock items <span className="count-pill red">{lowStock.length}</span></h3></div>
                <button className="text-btn" onClick={() => setPage("inventory")} data-testid="low-stock-see-all">Open inventory <ArrowUpRight size={15} /></button>
              </div>
              <div className="attention-list">
                {lowStock.map((it, i) => (
                  <div className="attention-row" key={it.id} data-testid={`low-stock-row-${i}`}>
                    <div className="machine-thumb"><Package size={17} /></div>
                    <div className="attention-main">
                      <strong>{it.name} <span className="attention-chip stale">LOW</span></strong>
                      <span>{it.sku} · {it.location || "—"}</span>
                    </div>
                    <div className="attention-meta">
                      <small>Stock / Min</small>
                      <strong className="red-text">{it.current_stock} / {it.min_level} {it.unit}</strong>
                    </div>
                    <div className="attention-actions">
                      <button className="icon-btn" onClick={() => setPage("inventory")}
                        data-testid={`low-stock-reorder-${i}`} title="Reorder"><Plus size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {vendorAlerts.length > 0 && (
            <section className="panel attention-panel vendor-panel" data-testid="vendor-alerts-panel">
              <div className="panel-head">
                <div><p className="eyebrow">VENDOR FOLLOW-UP</p><h3>Overdue vendor deliveries <span className="count-pill red">{vendorAlerts.length}</span></h3></div>
                <button className="text-btn" onClick={() => setPage("jobwork")} data-testid="vendor-alerts-see-all">Open job work <ArrowUpRight size={15} /></button>
              </div>
              <div className="attention-list">
                {vendorAlerts.map((j, i) => {
                  const cur = j.current_stage || (j.stages && j.stages[j.current_stage_index]) || {};
                  const expectedPast = cur.expected_return ? Math.max(0, Math.floor((Date.now() - new Date(cur.expected_return).getTime()) / 86400000)) : 0;
                  return (
                    <div className="attention-row" key={j.id} data-testid={`vendor-alert-row-${i}`}>
                      <div className="machine-thumb"><Wrench size={17} /></div>
                      <div className="attention-main">
                        <strong>{cur.vendor || j.vendor}</strong>
                        <span>{j.number} · {j.item} · {cur.process || j.work_type}</span>
                      </div>
                      <div className="attention-meta">
                        <small>Expected</small>
                        <strong className="red-text">{expectedPast} day{expectedPast !== 1 ? "s" : ""} overdue</strong>
                      </div>
                      <div className="attention-actions">
                        <button className="icon-btn" onClick={() => setPage("jobwork")}
                          data-testid={`vendor-alert-open-${i}`}><ArrowUpRight size={15} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
      <div className="lower-grid">
        <section className="panel">
          <div className="panel-head">
            <div><p className="eyebrow">ORDER PIPELINE</p><h3>Production overview</h3></div>
            <button className="text-btn" onClick={() => setPage("production")} data-testid="production-overview-link">Open production <ArrowUpRight size={15} /></button>
          </div>
          <div className="stage-bars">
            {stageCounts.map(({ s, n }, i) => (
              <div className="stage-item" key={s}>
                <div><span>{s}</span><strong>{n}</strong></div>
                <div className="stage-track"><i className={["gray", "blue", "orange", "purple", "green", "red"][i]} style={{ width: `${Math.min(n * 20 + 12, 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-head"><div><p className="eyebrow">RECENT CLIENTS</p><h3>Latest additions</h3></div></div>
          {(clients || []).slice(0, 4).map((c, i) => (
            <div className="activity-row" key={c.id}>
              <Avatar name={c.person} color={c.color} />
              <div><strong>{c.person}</strong><span>{c.company} · {c.city}</span></div>
              <time>{relTime(c.created_at)}</time>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

/* ========================= Clients ========================= */
const BLANK_CLIENT = {
  company: "", person: "", phone: "", email: "", city: "", state: "",
  source: "Website", status: "Warm", rating: 3, color: "blue", notes: "", dealer_id: null,
};

function ClientForm({ initial, dealers, onSave, onClose }) {
  const [f, setF] = useState({ ...BLANK_CLIENT, ...(initial || {}) });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.company || !f.person || !f.phone) { toast.error("Company, person & phone required"); return; }
    setBusy(true);
    try { await onSave(f); onClose(); } finally { setBusy(false); }
  };
  return (
    <div className="form-grid">
      <div className="form-row-2">
        <div><label className="field-label">Company name *</label><div className="input-wrap"><BriefcaseBusiness size={17} />
          <input autoFocus value={f.company} onChange={e => set("company", e.target.value)} data-testid="client-form-company" /></div></div>
        <div><label className="field-label">Contact person *</label><div className="input-wrap"><UserRound size={17} />
          <input value={f.person} onChange={e => set("person", e.target.value)} data-testid="client-form-person" /></div></div>
      </div>
      <div className="form-row-2">
        <div><label className="field-label">Phone *</label><div className="input-wrap"><Phone size={17} />
          <input value={f.phone} onChange={e => set("phone", e.target.value)} data-testid="client-form-phone" /></div></div>
        <div><label className="field-label">Email</label><div className="input-wrap"><FileText size={17} />
          <input value={f.email} onChange={e => set("email", e.target.value)} data-testid="client-form-email" /></div></div>
      </div>
      <div className="form-row-2">
        <div><label className="field-label">City</label><div className="input-wrap"><Building2 size={17} />
          <input value={f.city} onChange={e => set("city", e.target.value)} data-testid="client-form-city" /></div></div>
        <div><label className="field-label">State</label><div className="input-wrap"><Building2 size={17} />
          <input value={f.state} onChange={e => set("state", e.target.value)} data-testid="client-form-state" /></div></div>
      </div>
      <div className="form-row-3">
        <div><label className="field-label">Inquiry source</label>
          <select value={f.source} onChange={e => set("source", e.target.value)} data-testid="client-form-source">
            {["IndiaMART", "Alibaba", "Google", "Facebook", "Website", "Reference", "Other"].map(s => <option key={s}>{s}</option>)}
          </select></div>
        <div><label className="field-label">Interest status</label>
          <select value={f.status} onChange={e => set("status", e.target.value)} data-testid="client-form-status">
            {["Hot", "Warm", "Cold", "Order Won", "Lost"].map(s => <option key={s}>{s}</option>)}
          </select></div>
        <div><label className="field-label">Rating</label>
          <select value={f.rating} onChange={e => set("rating", parseInt(e.target.value))} data-testid="client-form-rating">
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{"★".repeat(n)}</option>)}
          </select></div>
      </div>
      {dealers && dealers.length > 0 && (
        <div><label className="field-label">Assign dealer (optional)</label>
          <select value={f.dealer_id || ""} onChange={e => set("dealer_id", e.target.value || null)} data-testid="client-form-dealer">
            <option value="">— None (visible to all employees) —</option>
            {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select></div>
      )}
      <div><label className="field-label">Notes</label>
        <textarea value={f.notes} onChange={e => set("notes", e.target.value)} data-testid="client-form-notes" /></div>
      <button className="primary-btn full-btn" onClick={save} disabled={busy} data-testid="save-client-button">
        <Check size={17} /> {busy ? "Saving..." : "Save client"}
      </button>
    </div>
  );
}

function ClientsPage({ user, clients, dealers, reload, openClient }) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [attention, setAttention] = useState(false);
  const filtered = useMemo(() => clients.filter(c =>
    (c.company + " " + c.person + " " + (c.city || "")).toLowerCase().includes(query.toLowerCase())
    && (!status || c.status === status) && (!source || c.source === source)
    && (!attention || c.is_stale || c.followup_overdue)
  ), [clients, query, status, source, attention]);
  const attentionCount = clients.filter(c => c.is_stale || c.followup_overdue).length;

  const save = async (data) => {
    try {
      if (editing) { await api.updateClient(editing.id, data); toast.success("Client updated"); }
      else { await api.createClient(data); toast.success("Client added"); }
      await reload();
      setEditing(null);
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  const del = async (c) => {
    if (!window.confirm(`Delete ${c.company}?`)) return;
    try { await api.deleteClient(c.id); toast.success("Client deleted"); await reload(); }
    catch (e) { toast.error("Delete failed"); }
  };
  return (
    <div className="page-content" data-testid="page-clients">
      <div className="page-heading">
        <div><p className="eyebrow">RELATIONSHIP MANAGEMENT</p><h1>Clients & CRM</h1>
          <p className="subheading">Know every conversation. Grow every account.</p></div>
        <button className="primary-btn" onClick={() => { setEditing(null); setShow(true); }} data-testid="add-client-button">
          <Plus size={17} /> Add client</button>
      </div>
      <div className="mini-stats">
        <div><span>All clients</span><strong>{clients.length}</strong></div>
        <div><span>Hot opportunities</span><strong className="orange-text">{clients.filter(c => c.status === "Hot").length}</strong></div>
        <div><span>Order won</span><strong className="green-text">{clients.filter(c => c.status === "Order Won").length}</strong></div>
        <div><span>Needs attention</span><strong className="red-text">{attentionCount}</strong></div>
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-wrap"><Search size={17} />
            <input placeholder="Search clients, contacts or city..." value={query}
              onChange={e => setQuery(e.target.value)} data-testid="client-search-input" /></div>
          <div className="toolbar-actions">
            <button className={`filter-btn attention-filter ${attention ? "on" : ""}`}
              onClick={() => setAttention(a => !a)} data-testid="attention-filter">
              <Bell size={13} /> Needs attention{attentionCount ? ` · ${attentionCount}` : ""}
            </button>
            <select value={status} onChange={e => setStatus(e.target.value)} className="filter-btn" data-testid="client-status-filter">
              <option value="">All statuses</option>{["Hot", "Warm", "Cold", "Order Won", "Lost"].map(s => <option key={s}>{s}</option>)}</select>
            <select value={source} onChange={e => setSource(e.target.value)} className="filter-btn" data-testid="client-source-filter">
              <option value="">All sources</option>{["IndiaMART", "Alibaba", "Google", "Facebook", "Website", "Reference", "Other"].map(s => <option key={s}>{s}</option>)}</select>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Company / contact</th><th>Location</th><th>Phone</th><th>Last contact</th><th>Interest</th><th>Rating</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan="7"><Empty msg="No clients match your filters" /></td></tr>}
              {filtered.map(c => {
                const rowCls = c.is_stale ? "row-stale" : c.followup_overdue ? "row-overdue" : "";
                return (
                  <tr key={c.id} className={rowCls} onClick={() => openClient(c)} data-testid={`client-row-${c.id}`}>
                    <td><div className="client-cell"><Avatar name={c.person} color={c.color} />
                      <div><strong>{c.company}
                        {c.is_stale && <span className="attention-chip stale" data-testid={`stale-chip-${c.id}`} title={`${c.days_since_contact} days without contact`}>Stale</span>}
                        {c.followup_overdue && !c.is_stale && <span className="attention-chip overdue" data-testid={`overdue-chip-${c.id}`}>Follow-up due</span>}
                      </strong><span>{c.person}</span></div></div></td>
                    <td>{c.city}{c.state ? `, ${c.state}` : ""}</td>
                    <td>
                      <div className="phone-cell">
                        <span>{c.phone}</span>
                        <a className="icon-mini" href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} data-testid={`call-${c.id}`}><Phone size={13} /></a>
                        <a className="icon-mini" href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()} data-testid={`whatsapp-${c.id}`}><MessageCircle size={13} /></a>
                      </div>
                    </td>
                    <td>
                      <span className={`last-contact ${c.is_stale ? "stale" : ""}`} data-testid={`last-contact-${c.id}`}>
                        {c.days_since_contact === 0 ? "Today" :
                          c.days_since_contact === 1 ? "Yesterday" :
                          `${c.days_since_contact} days ago`}
                      </span>
                      {c.next_followup_at && <small className="next-fu">Next: {fmtDate(c.next_followup_at)}</small>}
                    </td>
                    <td><Badge>{c.status}</Badge></td>
                    <td><Stars value={c.rating} /></td>
                    <td className="row-actions" onClick={e => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => { setEditing(c); setShow(true); }} data-testid={`edit-client-${c.id}`}><Pencil size={15} /></button>
                      {user.role === "Admin" && <button className="icon-btn danger" onClick={() => del(c)} data-testid={`delete-client-${c.id}`}><Trash2 size={15} /></button>}
                      <button className="icon-btn" onClick={() => openClient(c)} data-testid={`view-client-${c.id}`}><ArrowUpRight size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <Modal show={show} onClose={() => { setShow(false); setEditing(null); }}
        title={editing ? "Edit client" : "Add a new client"} wide>
        <ClientForm initial={editing} dealers={user.role === "Admin" ? dealers : null}
          onSave={save} onClose={() => { setShow(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

function ClientDetail({ client, onBack, setPage, reload }) {
  const [tab, setTab] = useState("overview");
  const [log, setLog] = useState({ discussion: "", outcome: "", next_step: "", next_followup_at: "" });
  const [interactions, setInteractions] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.listInteractions(client.id).then(setInteractions); }, [client.id]);
  const addLog = async () => {
    if (!log.discussion) { toast.error("Enter discussion"); return; }
    setBusy(true);
    try {
      await api.createInteraction({
        client_id: client.id,
        ...log,
        next_followup_at: log.next_followup_at ? new Date(log.next_followup_at).toISOString() : null,
      });
      toast.success("Interaction logged");
      setLog({ discussion: "", outcome: "", next_step: "", next_followup_at: "" });
      const i = await api.listInteractions(client.id); setInteractions(i);
      reload?.();
    } catch (e) { toast.error("Failed to log"); } finally { setBusy(false); }
  };
  return (
    <div className="page-content" data-testid="page-client-detail">
      <button className="back-btn" onClick={onBack} data-testid="client-detail-back">
        <ChevronDown size={16} className="rotate-90" /> Back to clients
      </button>
      <div className="detail-head">
        <div className="detail-identity">
          <Avatar name={client.person} color={client.color} xl />
          <div>
            <p className="eyebrow">CLIENT PROFILE · {client.source?.toUpperCase()}</p>
            <h1>{client.company}</h1>
            <p className="subheading">{client.person} · {client.city}{client.state ? `, ${client.state}` : ""}</p>
          </div>
        </div>
        <div className="heading-actions">
          <a className="ghost-btn" href={`tel:${client.phone}`} data-testid="client-call-button"><Phone size={16} /> Call</a>
          <a className="ghost-btn" href={`https://wa.me/${client.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" data-testid="client-whatsapp-button"><MessageCircle size={16} /> WhatsApp</a>
          <button className="primary-btn" onClick={() => setPage("quotations", { client_id: client.id })} data-testid="client-new-quotation-button"><Plus size={17} /> New quotation</button>
        </div>
      </div>
      <div className="profile-strip">
        <div><small>Phone</small><strong>{client.phone}</strong></div>
        <div><small>Email</small><strong>{client.email || "—"}</strong></div>
        <div><small>Interest</small><Badge>{client.status}</Badge></div>
        <div><small>Rating</small><Stars value={client.rating} /></div>
        <div><small>Source</small><strong>{client.source}</strong></div>
      </div>
      <div className="tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")} data-testid="client-overview-tab">Overview</button>
        <button className={tab === "timeline" ? "active" : ""} onClick={() => setTab("timeline")} data-testid="client-timeline-tab">
          Interactions <span>{interactions.length}</span>
        </button>
      </div>
      <div className="detail-grid">
        {tab === "overview" ? (
          <>
            <section className="panel">
              <div className="panel-head">
                <div><p className="eyebrow">QUICK LOG</p><h3>Log a conversation</h3></div>
                <Phone size={18} className="panel-icon" />
              </div>
              <label className="field-label">Discussion</label>
              <textarea value={log.discussion} onChange={e => setLog({ ...log, discussion: e.target.value })}
                placeholder="What was discussed?" data-testid="quick-call-notes" />
              <div className="form-row-2">
                <div><label className="field-label">Outcome</label>
                  <input value={log.outcome} onChange={e => setLog({ ...log, outcome: e.target.value })}
                    placeholder="e.g. Awaiting approval" data-testid="quick-call-outcome" /></div>
                <div><label className="field-label">Next step</label>
                  <input value={log.next_step} onChange={e => setLog({ ...log, next_step: e.target.value })}
                    placeholder="e.g. Send revised quote" data-testid="quick-call-nextstep" /></div>
              </div>
              <label className="field-label">Next follow-up</label>
              <input type="datetime-local" value={log.next_followup_at}
                onChange={e => setLog({ ...log, next_followup_at: e.target.value })}
                data-testid="quick-call-followup" />
              <button className="primary-btn" onClick={addLog} disabled={busy} data-testid="log-call-button">
                <Check size={16} /> {busy ? "Saving..." : "Log interaction"}
              </button>
            </section>
            <section className="panel">
              <div className="panel-head"><div><p className="eyebrow">NOTES</p><h3>Account notes</h3></div></div>
              <p style={{ margin: 0, color: "var(--text-mid)" }}>{client.notes || "No notes yet."}</p>
            </section>
          </>
        ) : (
          <section className="panel timeline-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head"><div><p className="eyebrow">CONVERSATION HISTORY</p><h3>Interaction timeline</h3></div></div>
            {interactions.length === 0 && <Empty msg="No interactions logged yet" />}
            {interactions.map((x, i) => (
              <div className="timeline-item" key={x.id} data-testid={`interaction-${i}`}>
                <div className={`timeline-dot ${x.accent || "orange"}`} />
                <div className="timeline-content">
                  <div><strong>{fmtDateTime(x.at)}</strong>{x.outcome && <Badge>{x.outcome}</Badge>}</div>
                  <p>{x.discussion}</p>
                  {x.next_step && <small>Next: {x.next_step}</small>}
                  {x.next_followup_at && <small> · Follow-up {fmtDateTime(x.next_followup_at)}</small>}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

/* ========================= Follow-ups ========================= */
function FollowupsPage({ followups }) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const bucket = (f) => {
    const d = (f.next_followup_at || "").slice(0, 10);
    if (!d) return null;
    if (d === today) return "today";
    if (d === tomorrow) return "tomorrow";
    if (d < today) return "overdue";
    return "upcoming";
  };
  const buckets = { today: [], tomorrow: [], overdue: [], upcoming: [] };
  followups.forEach(f => { const b = bucket(f); if (b) buckets[b].push(f); });
  return (
    <div className="page-content" data-testid="page-followups">
      <div className="page-heading">
        <div><p className="eyebrow">RELATIONSHIP RHYTHM</p><h1>Follow-ups</h1>
          <p className="subheading">Nothing important falls between the cracks.</p></div>
      </div>
      <div className="follow-summary">
        <div className="summary-box orange"><span>Today</span><strong>{buckets.today.length.toString().padStart(2, "0")}</strong><small>follow-ups</small></div>
        <div className="summary-box blue"><span>Tomorrow</span><strong>{buckets.tomorrow.length.toString().padStart(2, "0")}</strong><small>follow-ups</small></div>
        <div className="summary-box red"><span>Overdue</span><strong>{buckets.overdue.length.toString().padStart(2, "0")}</strong><small>need attention</small></div>
        <div className="summary-box green"><span>Upcoming</span><strong>{buckets.upcoming.length.toString().padStart(2, "0")}</strong><small>scheduled ahead</small></div>
      </div>
      <div className="follow-columns">
        {[["Today", "today", "orange"], ["Tomorrow", "tomorrow", "blue"], ["Overdue", "overdue", "red"], ["Upcoming", "upcoming", "green"]].map(([title, type, color]) => (
          <section className="panel follow-column" key={title}>
            <div className="panel-head">
              <div><h3><i className={`dot ${color}`} />{title}</h3>
                <span className="column-sub">{type === "overdue" ? "needs attention" : "follow-ups"}</span></div>
            </div>
            {buckets[type].length === 0 && <Empty msg="Nothing here" />}
            {buckets[type].map((f, i) => (
              <div className="follow-card" key={f.id} data-testid={`followup-card-${type}-${i}`}>
                <div className="follow-card-head">
                  <strong>{f.client?.company || "—"}</strong>
                  <time>{fmtDateTime(f.next_followup_at)}</time>
                </div>
                <p>{f.discussion || f.next_step}</p>
                <div className="follow-card-foot">
                  <a href={`tel:${f.client?.phone || ""}`}><Phone size={13} /> Call</a>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ========================= Quotations ========================= */
const BLANK_QITEM = { name: "", description: "", quantity: 1, unit_price: 0, gst_percent: 18 };

function QuotationForm({ initial, clients, products, onSave, onClose }) {
  const [f, setF] = useState({
    client_id: initial?.client_id || (clients[0]?.id || ""),
    valid_until: initial?.valid_until || "",
    status: initial?.status || "Draft",
    items: initial?.items?.length ? initial.items : [{ ...BLANK_QITEM }],
    notes: initial?.notes || "",
  });
  const linkedOrder = initial?.synced_order_number;
  const [busy, setBusy] = useState(false);
  const setItem = (i, k, v) => setF(s => ({ ...s, items: s.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it) }));
  const addItem = () => setF(s => ({ ...s, items: [...s.items, { ...BLANK_QITEM }] }));
  const removeItem = (i) => setF(s => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));
  const applyProduct = (i, pid) => {
    const p = products.find(x => x.id === pid);
    if (p) setF(s => ({ ...s, items: s.items.map((it, idx) => idx === i ? { ...it, name: p.name, description: p.description, unit_price: p.default_price } : it) }));
  };
  const sub = f.items.reduce((a, it) => a + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const gst = f.items.reduce((a, it) => a + Number(it.quantity || 0) * Number(it.unit_price || 0) * Number(it.gst_percent || 0) / 100, 0);
  const total = sub + gst;
  const save = async () => {
    if (!f.client_id) { toast.error("Client required"); return; }
    if (f.items.some(i => !i.name)) { toast.error("All items need a name"); return; }
    setBusy(true);
    try { await onSave(f); onClose(); } finally { setBusy(false); }
  };
  return (
    <div className="form-grid">
      {linkedOrder && (
        <div className="sync-notice" data-testid="quotation-sync-notice">
          <ArrowUpRight size={14} />
          <span>This quotation is linked to order <strong>{linkedOrder}</strong>. Saving changes will update the order items (production stages are preserved for unchanged items).</span>
        </div>
      )}
      <div className="form-row-2">
        <div><label className="field-label">Client *</label>
          <select value={f.client_id} onChange={e => setF({ ...f, client_id: e.target.value })} data-testid="quotation-client-select">
            {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
          </select></div>
        <div><label className="field-label">Valid until</label>
          <input type="date" value={f.valid_until ? f.valid_until.slice(0, 10) : ""}
            onChange={e => setF({ ...f, valid_until: e.target.value ? new Date(e.target.value).toISOString() : "" })}
            data-testid="quotation-valid-until" /></div>
      </div>
      <label className="field-label">Items</label>
      <div className="qt-items">
        {f.items.map((it, i) => (
          <div className="qt-item" key={i} data-testid={`quotation-item-${i}`}>
            <div className="qt-item-head">
              <strong>Item {i + 1}</strong>
              {products.length > 0 && (
                <select onChange={e => applyProduct(i, e.target.value)} value="" data-testid={`qt-item-product-${i}`}>
                  <option value="">— Use product master —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {f.items.length > 1 && <button type="button" className="icon-btn danger"
                onClick={() => removeItem(i)} data-testid={`qt-item-remove-${i}`}><Trash2 size={14} /></button>}
            </div>
            <div className="form-row-2">
              <div><label className="field-label">Name *</label>
                <input value={it.name} onChange={e => setItem(i, "name", e.target.value)} data-testid={`qt-item-name-${i}`} /></div>
              <div><label className="field-label">Description</label>
                <input value={it.description} onChange={e => setItem(i, "description", e.target.value)} data-testid={`qt-item-desc-${i}`} /></div>
            </div>
            <div className="form-row-3">
              <div><label className="field-label">Quantity</label>
                <input type="number" min="0" step="1" value={it.quantity}
                  onChange={e => setItem(i, "quantity", parseFloat(e.target.value) || 0)} data-testid={`qt-item-qty-${i}`} /></div>
              <div><label className="field-label">Unit price (₹)</label>
                <input type="number" min="0" value={it.unit_price}
                  onChange={e => setItem(i, "unit_price", parseFloat(e.target.value) || 0)} data-testid={`qt-item-price-${i}`} /></div>
              <div><label className="field-label">GST %</label>
                <input type="number" min="0" max="100" value={it.gst_percent}
                  onChange={e => setItem(i, "gst_percent", parseFloat(e.target.value) || 0)} data-testid={`qt-item-gst-${i}`} /></div>
            </div>
            <div className="qt-item-foot">
              Subtotal: <strong>{fmtMoney(it.quantity * it.unit_price)}</strong> ·
              GST ({it.gst_percent}%): <strong>{fmtMoney(it.quantity * it.unit_price * it.gst_percent / 100)}</strong> ·
              Total: <strong className="orange-text">{fmtMoney(it.quantity * it.unit_price * (1 + it.gst_percent / 100))}</strong>
            </div>
          </div>
        ))}
        <button type="button" className="ghost-btn" onClick={addItem} data-testid="qt-add-item">
          <Plus size={14} /> Add another item</button>
      </div>
      <div className="qt-totals">
        <div><span>Subtotal</span><strong>{fmtMoney(sub)}</strong></div>
        <div><span>GST total</span><strong>{fmtMoney(gst)}</strong></div>
        <div className="qt-grand"><span>Grand total</span><strong>{fmtMoney(total)}</strong></div>
      </div>
      <label className="field-label">Notes</label>
      <textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} data-testid="quotation-notes" />
      <button className="primary-btn full-btn" onClick={save} disabled={busy} data-testid="save-quotation-button">
        <Check size={17} /> {busy ? "Saving..." : "Save quotation"}
      </button>
    </div>
  );
}

function printQuotation(q, company) {
  const sub = q.items.reduce((a, it) => a + Number(it.quantity) * Number(it.unit_price), 0);
  const gst = q.items.reduce((a, it) => a + Number(it.quantity) * Number(it.unit_price) * Number(it.gst_percent) / 100, 0);
  const total = sub + gst;
  const win = window.open("", "_blank");
  if (!win) { toast.error("Popup blocked — allow popups for PDF"); return; }
  const logoImg = company.logo_data ? `<img src="${company.logo_data}" style="height:80px;" />` : `<div class="brand-letter">${(company.company_name || "A")[0]}</div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${q.number}</title>
    <style>
      *{box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;color:#0b1220;margin:0;padding:0;}
      .page{page-break-after:always;padding:48px 56px;min-height:100vh;}
      .cover{background:linear-gradient(135deg,#f6f8fb 0%,#ffffff 100%);border-bottom:4px solid #e85d1a;}
      .brand-row{display:flex;align-items:center;gap:20px;margin-bottom:32px;}
      .brand-letter{width:72px;height:72px;background:#0b1220;color:#fff;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;}
      .co-name{font-size:28px;font-weight:800;margin:0;}
      .co-sub{color:#5a6678;margin:4px 0 0;font-size:14px;}
      .cover-hero{margin-top:48px;}
      .cover-hero .eyebrow{color:#e85d1a;letter-spacing:3px;font-size:11px;font-weight:700;}
      .cover-hero h1{font-size:48px;margin:12px 0;letter-spacing:-1px;}
      .cover-hero .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-top:48px;}
      .cover-hero .meta div{padding:16px;border:1px solid #e4e8f0;border-radius:10px;}
      .cover-hero .meta small{color:#5a6678;text-transform:uppercase;font-size:10px;letter-spacing:1.5px;}
      .cover-hero .meta strong{display:block;margin-top:6px;font-size:16px;}
      .co-contact{margin-top:48px;color:#5a6678;font-size:13px;line-height:1.8;}
      table{width:100%;border-collapse:collapse;margin-top:24px;}
      th{background:#0b1220;color:#fff;padding:12px 10px;text-align:left;font-size:11px;letter-spacing:1px;}
      td{padding:12px 10px;border-bottom:1px solid #e4e8f0;font-size:13px;}
      .totals{margin-top:24px;float:right;width:360px;}
      .totals div{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e4e8f0;}
      .totals .grand{border-top:2px solid #0b1220;border-bottom:0;font-size:18px;font-weight:800;color:#e85d1a;}
      .terms{color:#2b3545;line-height:1.7;}
      .terms h2{color:#e85d1a;letter-spacing:1px;font-size:14px;}
      .footer{position:fixed;bottom:16px;right:56px;color:#5a6678;font-size:11px;}
      @media print {.no-print{display:none;}}
    </style></head><body>
    <div class="page cover">
      <div class="brand-row">${logoImg}
        <div><h2 class="co-name">${company.company_name || "Company"}</h2>
          <p class="co-sub">${company.tagline || ""}</p></div></div>
      <div class="cover-hero">
        <p class="eyebrow">QUOTATION ${q.number}</p>
        <h1>For ${q.client_name || ""}</h1>
        <div class="meta">
          <div><small>Issued</small><strong>${fmtDate(q.order_date)}</strong></div>
          <div><small>Valid until</small><strong>${fmtDate(q.valid_until)}</strong></div>
          <div><small>Status</small><strong>${q.status}</strong></div>
          <div><small>Grand total</small><strong>${fmtMoney(total)}</strong></div>
        </div>
      </div>
      <div class="co-contact">
        ${company.address ? company.address + "<br/>" : ""}
        ${company.phone ? "Phone: " + company.phone + " · " : ""}${company.email || ""}<br/>
        ${company.gstin ? "GSTIN: " + company.gstin : ""} ${company.website ? " · " + company.website : ""}
      </div>
    </div>
    <div class="page">
      <h2 style="margin-bottom:4px;">Quotation details</h2>
      <p style="color:#5a6678;margin:0;">${q.number} · ${q.client_name || ""}</p>
      <table><thead><tr><th>#</th><th>Item</th><th>Description</th><th>Qty</th><th>Unit price</th><th>GST%</th><th>Total</th></tr></thead>
      <tbody>${q.items.map((it, i) => `<tr><td>${i + 1}</td><td><strong>${it.name}</strong></td><td>${it.description || ""}</td>
        <td>${it.quantity}</td><td>${fmtMoney(it.unit_price)}</td><td>${it.gst_percent}%</td>
        <td><strong>${fmtMoney(it.quantity * it.unit_price * (1 + it.gst_percent / 100))}</strong></td></tr>`).join("")}</tbody></table>
      <div class="totals">
        <div><span>Subtotal</span><strong>${fmtMoney(sub)}</strong></div>
        <div><span>GST total</span><strong>${fmtMoney(gst)}</strong></div>
        <div class="grand"><span>Grand total</span><strong>${fmtMoney(total)}</strong></div>
      </div>
      <div style="clear:both;"></div>
      ${q.notes ? `<div style="margin-top:40px;padding:16px;background:#f6f8fb;border-left:4px solid #e85d1a;"><strong>Notes:</strong><p>${q.notes}</p></div>` : ""}
    </div>
    <div class="page terms">
      <h2>TERMS &amp; CONDITIONS</h2>
      ${company.terms_html || "<p>Standard terms apply.</p>"}
      <div style="margin-top:60px;display:flex;justify-content:space-between;">
        <div><p style="color:#5a6678;">For ${company.company_name || "Company"}</p>
          <div style="height:60px;"></div><p style="border-top:1px solid #0b1220;padding-top:4px;">Authorised Signatory</p></div>
        <div><p style="color:#5a6678;">For ${q.client_name || "Client"}</p>
          <div style="height:60px;"></div><p style="border-top:1px solid #0b1220;padding-top:4px;">Client Acceptance</p></div>
      </div>
    </div>
    <div class="no-print" style="position:fixed;top:16px;right:16px;">
      <button onclick="window.print()" style="padding:10px 16px;background:#e85d1a;color:#fff;border:0;border-radius:8px;cursor:pointer;">Print / Save PDF</button>
    </div>
    </body></html>`;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

function QuotationsPage({ user, quotations, clients, products, company, reload }) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const filtered = quotations.filter(q => (q.number + " " + (q.client_name || "")).toLowerCase().includes(query.toLowerCase()));
  const save = async (data) => {
    try {
      if (editing) await api.updateQuotation(editing.id, data);
      else await api.createQuotation(data);
      toast.success(editing ? "Updated" : "Quotation created");
      await reload(); setEditing(null);
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  const convert = async (q) => {
    if (!window.confirm(`Convert ${q.number} to an order?`)) return;
    try { await api.convertQuotation(q.id); toast.success("Converted to order"); await reload(); }
    catch (e) { toast.error("Convert failed"); }
  };
  const del = async (q) => {
    if (!window.confirm(`Delete ${q.number}?`)) return;
    try { await api.deleteQuotation(q.id); toast.success("Deleted"); await reload(); }
    catch { toast.error("Delete failed"); }
  };
  return (
    <div className="page-content" data-testid="page-quotations">
      <div className="page-heading">
        <div><p className="eyebrow">SALES DOCUMENTS</p><h1>Quotations</h1>
          <p className="subheading">Build clear, confident proposals that move deals forward.</p></div>
        <button className="primary-btn" onClick={() => { setEditing(null); setShow(true); }} data-testid="quotations-create-button">
          <Plus size={17} /> New quotation</button>
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-wrap"><Search size={17} />
            <input placeholder="Search quotations..." value={query}
              onChange={e => setQuery(e.target.value)} data-testid="quotations-search-input" /></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Quotation</th><th>Client</th><th>Items</th><th>Created</th><th>Valid until</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan="8"><Empty msg="No quotations yet" /></td></tr>}
              {filtered.map((q, i) => {
                const total = q.items.reduce((a, it) => a + it.quantity * it.unit_price * (1 + it.gst_percent / 100), 0);
                return (
                  <tr key={q.id} data-testid={`quotations-row-${i}`}>
                    <td><strong className="mono">{q.number}</strong>
                      {q.synced_order_number && <span className="attention-chip synced" data-testid={`qt-synced-${i}`} title={`Linked to ${q.synced_order_number}`}>→ {q.synced_order_number}</span>}
                    </td>
                    <td><strong>{q.client_name}</strong></td>
                    <td>{q.items.length} item{q.items.length !== 1 ? "s" : ""}</td>
                    <td>{fmtDate(q.order_date)}</td>
                    <td>{fmtDate(q.valid_until)}</td>
                    <td><strong>{fmtMoney(total)}</strong></td>
                    <td><Badge>{q.status}</Badge></td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => printQuotation(q, company)} title="Preview PDF" data-testid={`qt-print-${i}`}><Printer size={15} /></button>
                      <button className="icon-btn" onClick={() => { setEditing(q); setShow(true); }} data-testid={`qt-edit-${i}`}><Pencil size={15} /></button>
                      {q.status !== "Converted" && can(user, "orders") && <button className="icon-btn" title="Convert to order" onClick={() => convert(q)} data-testid={`qt-convert-${i}`}><ArrowUpRight size={15} /></button>}
                      {user.role === "Admin" && <button className="icon-btn danger" onClick={() => del(q)} data-testid={`qt-delete-${i}`}><Trash2 size={15} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <Modal show={show} onClose={() => { setShow(false); setEditing(null); }}
        title={editing ? `Edit ${editing.number}` : "New quotation"} wide
        eyebrow={editing ? "EDIT QUOTATION" : "CREATE QUOTATION"}>
        <QuotationForm initial={editing} clients={clients} products={products}
          onSave={save} onClose={() => { setShow(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

/* ========================= Orders ========================= */
function OrdersPage({ user, orders, clients, products, reload, setPage }) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [show, setShow] = useState(false);
  const filtered = orders.filter(o => {
    if (query && !(o.number + " " + (o.client_name || "")).toLowerCase().includes(query.toLowerCase())) return false;
    if (tab === "production" && o.status !== "In Production") return false;
    if (tab === "ready" && !(o.items || []).some(i => i.stage === "Ready for Dispatch")) return false;
    if (tab === "completed" && o.status !== "Dispatched") return false;
    return true;
  });
  const counts = {
    all: orders.length,
    production: orders.filter(o => o.status === "In Production").length,
    ready: orders.filter(o => (o.items || []).some(i => i.stage === "Ready for Dispatch")).length,
    completed: orders.filter(o => o.status === "Dispatched").length,
  };
  return (
    <div className="page-content" data-testid="page-orders">
      <div className="page-heading">
        <div><p className="eyebrow">COMMERCIAL OPERATIONS</p><h1>Orders</h1>
          <p className="subheading">Track every machine from promise to handover.</p></div>
        {can(user, "quotations") && <button className="primary-btn" onClick={() => setPage("quotations")} data-testid="create-order-button">
          <Plus size={17} /> From quotation</button>}
      </div>
      <div className="status-tabs">
        <button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")} data-testid="orders-all-tab">All <span>{counts.all}</span></button>
        <button className={tab === "production" ? "active" : ""} onClick={() => setTab("production")} data-testid="orders-production-tab">In production <span>{counts.production}</span></button>
        <button className={tab === "ready" ? "active" : ""} onClick={() => setTab("ready")} data-testid="orders-ready-tab">Ready to dispatch <span>{counts.ready}</span></button>
        <button className={tab === "completed" ? "active" : ""} onClick={() => setTab("completed")} data-testid="orders-completed-tab">Dispatched <span>{counts.completed}</span></button>
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-wrap"><Search size={17} />
            <input placeholder="Search order number or client..." value={query}
              onChange={e => setQuery(e.target.value)} data-testid="orders-search-input" /></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Order</th><th>Client</th><th>Items</th><th>Target</th><th>Progress</th>
              {!hidesFinance(user) && <th>Order value</th>}<th>Status</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={hidesFinance(user) ? 6 : 7}><Empty msg="No orders match your filters" /></td></tr>}
              {filtered.map((o, i) => {
                const avgProg = o.items.length ? Math.round(o.items.reduce((a, it) => a + (it.progress || 0), 0) / o.items.length) : 0;
                const total = o.items.reduce((a, it) => a + it.quantity * it.unit_price * (1 + it.gst_percent / 100), 0);
                return (
                  <tr key={o.id} onClick={() => setPage("production", { order_id: o.id })} data-testid={`order-row-${i}`}>
                    <td><strong className="mono">{o.number}</strong>{o.revised_at && <span className="attention-chip revised" data-testid={`order-revised-chip-${i}`} style={{marginLeft:6}}>Revised</span>}<span className="table-sub">{fmtDate(o.order_date)}</span></td>
                    <td><strong>{o.client_name}</strong></td>
                    <td>{o.items.map(it => `${it.name} ×${it.quantity}`).join(", ")}</td>
                    <td>{fmtDate(o.expected_delivery)}</td>
                    <td><div className="progress-cell"><div className="progress-track"><i style={{ width: `${avgProg}%` }} /></div>
                      <span>{avgProg}%</span></div></td>
                    {!hidesFinance(user) && <td><strong>{fmtMoney(total)}</strong></td>}
                    <td><Badge>{o.status}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ========================= Production ========================= */
function ProductionPage({ user, orders, reload, setPage, initialOrderId }) {
  const activeOrders = orders.filter(o => o.status !== "Dispatched");
  const [selId, setSelId] = useState(initialOrderId || (activeOrders[0]?.id || orders[0]?.id));
  const selected = orders.find(o => o.id === selId) || activeOrders[0] || orders[0];
  const [itemIdx, setItemIdx] = useState(0);
  const [notes, setNotes] = useState("");
  useEffect(() => { setItemIdx(0); setNotes(""); }, [selId]);
  if (!selected) return <div className="page-content" data-testid="page-production"><Empty msg="No orders yet. Create one from a quotation." /></div>;
  const item = selected.items[itemIdx] || selected.items[0];
  const currentStageIdx = STAGES.indexOf(item?.stage || "In Planning");

  const advance = async (toStage) => {
    const stageIdx = STAGES.indexOf(toStage);
    const progress = Math.round(((stageIdx + 1) / STAGES.length) * 100);
    try {
      await api.updateStage(selected.id, { item_index: itemIdx, stage: toStage, progress, notes });
      toast.success(`Stage updated → ${toStage}`);
      setNotes(""); await reload();
    } catch { toast.error("Update failed"); }
  };

  return (
    <div className="page-content" data-testid="page-production">
      <div className="page-heading">
        <div><p className="eyebrow">SHOP FLOOR CONTROL</p><h1>Production tracking</h1>
          <p className="subheading">Live status across every machine on the floor.</p></div>
        <button className="primary-btn" onClick={() => setPage("orders")} data-testid="production-orders-button">View orders <ArrowUpRight size={16} /></button>
      </div>
      <div className="production-layout">
        <section className="panel production-board">
          <div className="panel-head"><div><p className="eyebrow">ACTIVE JOBS · {activeOrders.length.toString().padStart(2, "0")}</p>
            <h3>Order list</h3></div></div>
          {activeOrders.map((o, i) => {
            const prog = o.items.length ? Math.round(o.items.reduce((a, it) => a + (it.progress || 0), 0) / o.items.length) : 0;
            return (
              <button className={`production-row ${selId === o.id ? "selected" : ""}`} key={o.id}
                onClick={() => setSelId(o.id)} data-testid={`production-order-${i}`}>
                <div className="machine-thumb"><Factory size={18} /></div>
                <div className="production-info"><strong>{o.items[0]?.name}
                  {o.revised_at && <span className="attention-chip revised" data-testid={`revised-chip-${i}`} title={`Revised ${fmtDate(o.revised_at)}`}>Revised</span>}
                </strong>
                  <span>{o.number} · {o.client_name}</span></div>
                <div className="production-percent"><strong>{prog}%</strong>
                  <span>{o.items[0]?.stage}</span></div>
                <div className="progress-track wide"><i style={{ width: `${prog}%` }} /></div>
              </button>
            );
          })}
          {activeOrders.length === 0 && <Empty msg="All orders dispatched" />}
        </section>
        <section className="panel production-detail">
          <div className="detail-kicker"><Badge>{item?.stage}</Badge>
            {selected.revised_at && <span className="attention-chip revised" data-testid="production-revised-chip" title={`Revised ${fmtDate(selected.revised_at)}`}>Revised {fmtDate(selected.revised_at)}</span>}
          </div>
          <h2>{item?.name}</h2>
          <p className="subheading">{selected.client_name} · {selected.number}</p>
          {selected.items.length > 1 && (
            <div className="item-switch">
              {selected.items.map((it, i) => (
                <button key={i} className={itemIdx === i ? "active" : ""}
                  onClick={() => setItemIdx(i)} data-testid={`item-switch-${i}`}>Item {i + 1}: {it.name}</button>
              ))}
            </div>
          )}
          <div className="stepper">
            {STAGES.map((s, i) => (
              <div className={`step ${i <= currentStageIdx ? "done" : ""} ${s === item?.stage ? "current" : ""}`} key={s}
                data-testid={`stage-step-${i}`}>
                <div className="step-circle">{i < currentStageIdx ? <Check size={13} /> : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="detail-meta">
            <div><small>Target completion</small><strong>{fmtDate(selected.expected_delivery)}</strong></div>
            <div><small>Quantity</small><strong>{item?.quantity} units</strong></div>
            <div><small>Progress</small><strong>{item?.progress}%</strong></div>
          </div>
          <div className="detail-note">
            <strong>Production notes</strong>
            <p>{item?.notes || "No notes yet."}</p>
          </div>
          {can(user, "production") && (
            <>
              <label className="field-label">Add update notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Panel wiring complete, moving to QC..." data-testid="production-notes-input" />
              <div className="stage-actions">
                {STAGES.map((s, i) => (
                  <button key={s} className={i === currentStageIdx + 1 ? "primary-btn" : "ghost-btn"}
                    onClick={() => advance(s)}
                    disabled={i === currentStageIdx}
                    data-testid={`advance-to-${i}`}>{s}</button>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ========================= Dispatch ========================= */
function DispatchPage({ user, orders, dispatches, reload }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ order_id: "", item_index: 0, vehicle_number: "", transporter: "", driver_name: "", driver_phone: "", bilty_number: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const readyOrders = orders.filter(o => (o.items || []).some(i => i.stage === "Ready for Dispatch"));
  const create = async () => {
    if (!form.order_id || !form.vehicle_number) { toast.error("Order & vehicle number required"); return; }
    setBusy(true);
    try {
      await api.createDispatch({ ...form, dispatch_at: new Date().toISOString() });
      toast.success("Dispatch created");
      setShow(false);
      setForm({ order_id: "", item_index: 0, vehicle_number: "", transporter: "", driver_name: "", driver_phone: "", bilty_number: "", notes: "" });
      await reload();
    } catch { toast.error("Create failed"); } finally { setBusy(false); }
  };
  return (
    <div className="page-content" data-testid="page-dispatch">
      <div className="page-heading">
        <div><p className="eyebrow">LOGISTICS CONTROL</p><h1>Dispatch tracking</h1>
          <p className="subheading">Move finished machines from the factory to the customer site.</p></div>
        <button className="primary-btn" onClick={() => setShow(true)} data-testid="create-dispatch-button">
          <Plus size={17} /> Create dispatch</button>
      </div>
      <div className="module-summary">
        <div className="summary-icon"><Truck size={19} /></div>
        <div><strong>{readyOrders.length.toString().padStart(2, "0")}</strong><span>ready for dispatch</span></div>
        <div><strong className="green-text">{dispatches.length.toString().padStart(2, "0")}</strong><span>dispatched this month</span></div>
      </div>
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead><tr><th>Dispatch</th><th>Order</th><th>Client</th><th>Machine</th><th>Date</th><th>Vehicle / transporter</th><th>Driver</th><th>Bilty</th></tr></thead>
            <tbody>
              {dispatches.length === 0 && <tr><td colSpan="8"><Empty msg="No dispatches yet" /></td></tr>}
              {dispatches.map((d, i) => (
                <tr key={d.id} data-testid={`dispatch-row-${i}`}>
                  <td><strong className="mono">{d.number}</strong></td>
                  <td>{d.order_number || "—"}</td>
                  <td><strong>{d.client_name}</strong></td>
                  <td>{d.item_name || "—"}</td>
                  <td>{fmtDateTime(d.dispatch_at)}</td>
                  <td>{d.vehicle_number}<br /><span className="table-sub">{d.transporter}</span></td>
                  <td>{d.driver_name}<br /><span className="table-sub">{d.driver_phone}</span></td>
                  <td>{d.bilty_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Modal show={show} onClose={() => setShow(false)} title="Create dispatch" wide>
        <div className="form-grid">
          <label className="field-label">Order *</label>
          <select value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value, item_index: 0 })} data-testid="dispatch-order">
            <option value="">— Select ready order —</option>
            {readyOrders.map(o => <option key={o.id} value={o.id}>{o.number} · {o.client_name}</option>)}
          </select>
          {form.order_id && (() => {
            const o = orders.find(x => x.id === form.order_id);
            if (o && o.items.length > 1) return (
              <>
                <label className="field-label">Item</label>
                <select value={form.item_index} onChange={e => setForm({ ...form, item_index: parseInt(e.target.value) })} data-testid="dispatch-item">
                  {o.items.map((it, i) => <option key={i} value={i}>{it.name}</option>)}
                </select>
              </>
            );
          })()}
          <div className="form-row-2">
            <div><label className="field-label">Vehicle number *</label>
              <input value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })}
                placeholder="GJ-01-AB-1234" data-testid="dispatch-vehicle" /></div>
            <div><label className="field-label">Transporter</label>
              <input value={form.transporter} onChange={e => setForm({ ...form, transporter: e.target.value })}
                data-testid="dispatch-transporter" /></div>
          </div>
          <div className="form-row-2">
            <div><label className="field-label">Driver name</label>
              <input value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })}
                data-testid="dispatch-driver-name" /></div>
            <div><label className="field-label">Driver phone</label>
              <input value={form.driver_phone} onChange={e => setForm({ ...form, driver_phone: e.target.value })}
                data-testid="dispatch-driver-phone" /></div>
          </div>
          <div><label className="field-label">Bilty / LR number</label>
            <input value={form.bilty_number} onChange={e => setForm({ ...form, bilty_number: e.target.value })}
              data-testid="dispatch-bilty" /></div>
          <div><label className="field-label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              data-testid="dispatch-notes" /></div>
          <button className="primary-btn full-btn" onClick={create} disabled={busy} data-testid="save-dispatch-button">
            <Check size={17} /> {busy ? "Saving..." : "Create dispatch"}</button>
        </div>
      </Modal>
    </div>
  );
}

/* ========================= Payments ========================= */
function PaymentsPage({ user, payments, orders, reload }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ order_id: "", amount: 0, mode: "Bank Transfer", reference: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const create = async () => {
    if (!form.order_id || !form.amount) { toast.error("Order & amount required"); return; }
    setBusy(true);
    try {
      await api.createPayment({ ...form, at: new Date().toISOString() });
      toast.success("Payment recorded");
      setShow(false); setForm({ order_id: "", amount: 0, mode: "Bank Transfer", reference: "", notes: "" });
      await reload();
    } catch { toast.error("Save failed"); } finally { setBusy(false); }
  };
  const totalReceived = payments.reduce((a, p) => a + p.amount, 0);
  return (
    <div className="page-content" data-testid="page-payments">
      <div className="page-heading">
        <div><p className="eyebrow">CASHFLOW CONTROL</p><h1>Payments</h1>
          <p className="subheading">Stay ahead of every collection and commitment.</p></div>
        <button className="primary-btn" onClick={() => setShow(true)} data-testid="payments-create-button">
          <Plus size={17} /> Record payment</button>
      </div>
      <div className="module-summary">
        <div className="summary-icon"><WalletCards size={19} /></div>
        <div><strong>{fmtMoney(totalReceived)}</strong><span>received overall</span></div>
        <div><strong className="orange-text">{payments.length}</strong><span>payment entries</span></div>
      </div>
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead><tr><th>Payment</th><th>Order</th><th>Date</th><th>Mode</th><th>Reference</th><th>Amount</th></tr></thead>
            <tbody>
              {payments.length === 0 && <tr><td colSpan="6"><Empty msg="No payments yet" /></td></tr>}
              {payments.map((p, i) => {
                const o = orders.find(x => x.id === p.order_id);
                return (
                  <tr key={p.id} data-testid={`payment-row-${i}`}>
                    <td><strong className="mono">{p.number}</strong></td>
                    <td>{o?.number || "—"}<br /><span className="table-sub">{o?.client_name}</span></td>
                    <td>{fmtDate(p.at)}</td>
                    <td>{p.mode}</td>
                    <td className="mono">{p.reference || "—"}</td>
                    <td><strong>{fmtMoney(p.amount)}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <Modal show={show} onClose={() => setShow(false)} title="Record payment">
        <div className="form-grid">
          <label className="field-label">Order *</label>
          <select value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })} data-testid="payment-order">
            <option value="">— Select order —</option>
            {orders.map(o => <option key={o.id} value={o.id}>{o.number} · {o.client_name}</option>)}
          </select>
          <div className="form-row-2">
            <div><label className="field-label">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                data-testid="payment-amount" /></div>
            <div><label className="field-label">Mode</label>
              <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })} data-testid="payment-mode">
                {["Bank Transfer", "Cheque", "Cash", "UPI"].map(m => <option key={m}>{m}</option>)}
              </select></div>
          </div>
          <div><label className="field-label">Reference / Transaction no.</label>
            <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} data-testid="payment-reference" /></div>
          <div><label className="field-label">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="payment-notes" /></div>
          <button className="primary-btn full-btn" onClick={create} disabled={busy} data-testid="save-payment-button">
            <Check size={17} /> {busy ? "Saving..." : "Save payment"}</button>
        </div>
      </Modal>
    </div>
  );
}

/* ========================= Inventory ========================= */
function InventoryPage({ user, items, txns, reload }) {
  const [tab, setTab] = useState("items");
  const [txnFilter, setTxnFilter] = useState("");
  const [txnQuery, setTxnQuery] = useState("");
  const [show, setShow] = useState(false);
  const [showTxn, setShowTxn] = useState(false);
  const [edit, setEdit] = useState(null);
  const [item, setItem] = useState({ sku: "", name: "", category: "Raw Material", unit: "pcs", current_stock: 0, min_level: 0, supplier: "", location: "" });
  const [txn, setTxn] = useState({ item_id: "", txn_type: "IN", quantity: 0, reference_number: "", party: "", remarks: "" });
  const save = async () => {
    if (!item.sku || !item.name) { toast.error("SKU & name required"); return; }
    try {
      if (edit) await api.updateInventory(edit.id, item);
      else await api.createInventory(item);
      toast.success("Saved");
      setShow(false); setEdit(null); setItem({ sku: "", name: "", category: "Raw Material", unit: "pcs", current_stock: 0, min_level: 0, supplier: "", location: "" });
      await reload();
    } catch { toast.error("Save failed"); }
  };
  const saveTxn = async () => {
    if (!txn.item_id || !txn.quantity) { toast.error("Item & quantity required"); return; }
    try {
      await api.createInventoryTxn({ ...txn, at: new Date().toISOString() });
      toast.success("Transaction recorded");
      setShowTxn(false); setTxn({ item_id: "", txn_type: "IN", quantity: 0, reference_number: "", party: "", remarks: "" });
      await reload();
    } catch { toast.error("Failed"); }
  };
  const del = async (it) => {
    if (!window.confirm(`Delete ${it.name}?`)) return;
    try { await api.deleteInventory(it.id); toast.success("Deleted"); await reload(); }
    catch { toast.error("Delete failed"); }
  };
  const low = items.filter(i => i.current_stock < i.min_level).length;
  return (
    <div className="page-content" data-testid="page-inventory">
      <div className="page-heading">
        <div><p className="eyebrow">MATERIAL CONTROL</p><h1>Inventory</h1>
          <p className="subheading">Know what's on hand before the next job starts.</p></div>
        <div className="heading-actions">
          <button className="ghost-btn" onClick={() => setShowTxn(true)} data-testid="inv-txn-button"><Plus size={16} /> Stock movement</button>
          <button className="primary-btn" onClick={() => { setEdit(null); setShow(true); }} data-testid="inventory-create-button">
            <Plus size={17} /> Add item</button>
        </div>
      </div>
      <div className="module-summary">
        <div className="summary-icon"><Package size={19} /></div>
        <div><strong>{items.length}</strong><span>total items</span></div>
        <div><strong className="orange-text">{low}</strong><span>low stock alerts</span></div>
        <div><strong className="green-text">{(txns || []).filter(t => t.txn_type === "IN").length}</strong><span>stock-in entries</span></div>
        <div><strong className="red-text">{(txns || []).filter(t => t.txn_type === "OUT").length}</strong><span>stock-out entries</span></div>
      </div>
      <div className="status-tabs">
        <button className={tab === "items" ? "active" : ""} onClick={() => setTab("items")} data-testid="inv-tab-items">
          Items <span>{items.length}</span>
        </button>
        <button className={tab === "movements" ? "active" : ""} onClick={() => setTab("movements")} data-testid="inv-tab-movements">
          Stock movements <span>{(txns || []).length}</span>
        </button>
      </div>
      {tab === "items" && (
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Location</th><th>Stock</th><th>Min level</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan="8"><Empty msg="No inventory items" /></td></tr>}
              {items.map((it, i) => (
                <tr key={it.id} data-testid={`inventory-row-${i}`}>
                  <td><strong className="mono">{it.sku}</strong></td>
                  <td><strong>{it.name}</strong></td>
                  <td>{it.category}</td>
                  <td>{it.location || "—"}</td>
                  <td><strong>{it.current_stock} {it.unit}</strong></td>
                  <td>{it.min_level}</td>
                  <td><Badge tone={it.current_stock < it.min_level ? "red" : "green"}>
                    {it.current_stock < it.min_level ? "Low stock" : "Healthy"}</Badge></td>
                  <td className="row-actions">
                    <button className="icon-btn" onClick={() => { setEdit(it); setItem(it); setShow(true); }} data-testid={`inv-edit-${i}`}><Pencil size={15} /></button>
                    {user.role === "Admin" && <button className="icon-btn danger" onClick={() => del(it)} data-testid={`inv-delete-${i}`}><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}
      {tab === "movements" && (() => {
        const filtered = (txns || []).filter(t =>
          (!txnFilter || t.txn_type === txnFilter)
          && ((t.item_name + " " + t.item_sku + " " + (t.reference_number || "") + " " + (t.party || "") + " " + (t.order_number || "") + " " + (t.job_work_number || "") + " " + (t.remarks || "")).toLowerCase().includes(txnQuery.toLowerCase()))
        );
        return (
          <section className="panel table-panel" data-testid="inv-movements-panel">
            <div className="table-toolbar">
              <div className="search-wrap"><Search size={17} />
                <input placeholder="Search by item, reference, party, order or job work..."
                  value={txnQuery} onChange={e => setTxnQuery(e.target.value)}
                  data-testid="inv-txn-search" /></div>
              <div className="toolbar-actions">
                <button className={`filter-btn attention-filter ${!txnFilter ? "on" : ""}`} onClick={() => setTxnFilter("")} data-testid="inv-filter-all">All ({(txns || []).length})</button>
                <button className={`filter-btn attention-filter ${txnFilter === "IN" ? "on" : ""}`} style={txnFilter === "IN" ? { background: "#e5f8f0", color: "#0b9468", borderColor: "#a8e2c5" } : {}}
                  onClick={() => setTxnFilter("IN")} data-testid="inv-filter-in">Stock In</button>
                <button className={`filter-btn attention-filter ${txnFilter === "OUT" ? "on" : ""}`} style={txnFilter === "OUT" ? { background: "#ffebeb", color: "#d33a36", borderColor: "#f6c0bd" } : {}}
                  onClick={() => setTxnFilter("OUT")} data-testid="inv-filter-out">Stock Out</button>
                <button className={`filter-btn attention-filter ${txnFilter === "ADJUSTMENT" ? "on" : ""}`}
                  onClick={() => setTxnFilter("ADJUSTMENT")} data-testid="inv-filter-adj">Adjustment</button>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr>
                  <th>Date</th><th>Item</th><th>Type</th><th>Qty</th>
                  <th>Reference</th><th>Party</th><th>Linked to</th><th>By</th><th>Remarks</th>
                </tr></thead>
                <tbody>
                  {filtered.length === 0 && <tr><td colSpan="9"><Empty msg="No stock movements match your filters" /></td></tr>}
                  {filtered.map((t, i) => (
                    <tr key={t.id} data-testid={`inv-txn-row-${i}`}>
                      <td>{fmtDateTime(t.at)}</td>
                      <td><strong>{t.item_name || "—"}</strong><br /><span className="table-sub mono">{t.item_sku}</span></td>
                      <td><Badge tone={t.txn_type === "IN" ? "green" : t.txn_type === "OUT" ? "red" : "orange"}>{t.txn_type}</Badge></td>
                      <td><strong className={t.txn_type === "IN" ? "green-text" : t.txn_type === "OUT" ? "red-text" : "orange-text"}>
                        {t.txn_type === "IN" ? "+" : t.txn_type === "OUT" ? "−" : "="}{t.quantity} {t.item_unit || ""}
                      </strong></td>
                      <td className="mono">{t.reference_number || "—"}</td>
                      <td>{t.party || "—"}</td>
                      <td>
                        {t.order_number && <span className="attention-chip synced" data-testid={`inv-txn-order-${i}`}>→ {t.order_number}</span>}
                        {t.job_work_number && <span className="attention-chip synced" data-testid={`inv-txn-jw-${i}`}>JW {t.job_work_number}</span>}
                        {!t.order_number && !t.job_work_number && <span className="muted-cell">—</span>}
                      </td>
                      <td>{t.by_user_name || "—"}</td>
                      <td className="table-sub">{t.remarks || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })()}
      <Modal show={show} onClose={() => { setShow(false); setEdit(null); }} title={edit ? "Edit item" : "Add inventory item"} wide>
        <div className="form-grid">
          <div className="form-row-2">
            <div><label className="field-label">SKU *</label>
              <input value={item.sku} onChange={e => setItem({ ...item, sku: e.target.value })} data-testid="inv-sku" /></div>
            <div><label className="field-label">Name *</label>
              <input value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} data-testid="inv-name" /></div>
          </div>
          <div className="form-row-3">
            <div><label className="field-label">Category</label>
              <select value={item.category} onChange={e => setItem({ ...item, category: e.target.value })} data-testid="inv-category">
                {["Raw Material", "Spare Part", "Finished Machine"].map(c => <option key={c}>{c}</option>)}
              </select></div>
            <div><label className="field-label">Unit</label>
              <input value={item.unit} onChange={e => setItem({ ...item, unit: e.target.value })} data-testid="inv-unit" /></div>
            <div><label className="field-label">Location</label>
              <input value={item.location} onChange={e => setItem({ ...item, location: e.target.value })} data-testid="inv-location" /></div>
          </div>
          <div className="form-row-3">
            <div><label className="field-label">Current stock</label>
              <input type="number" value={item.current_stock} onChange={e => setItem({ ...item, current_stock: parseFloat(e.target.value) || 0 })} data-testid="inv-stock" /></div>
            <div><label className="field-label">Min level</label>
              <input type="number" value={item.min_level} onChange={e => setItem({ ...item, min_level: parseFloat(e.target.value) || 0 })} data-testid="inv-min" /></div>
            <div><label className="field-label">Supplier</label>
              <input value={item.supplier} onChange={e => setItem({ ...item, supplier: e.target.value })} data-testid="inv-supplier" /></div>
          </div>
          <button className="primary-btn full-btn" onClick={save} data-testid="save-inventory-button"><Check size={17} /> Save</button>
        </div>
      </Modal>
      <Modal show={showTxn} onClose={() => setShowTxn(false)} title="Record stock movement">
        <div className="form-grid">
          <label className="field-label">Item</label>
          <select value={txn.item_id} onChange={e => setTxn({ ...txn, item_id: e.target.value })} data-testid="txn-item">
            <option value="">— Select —</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}
          </select>
          <div className="form-row-2">
            <div><label className="field-label">Type</label>
              <select value={txn.txn_type} onChange={e => setTxn({ ...txn, txn_type: e.target.value })} data-testid="txn-type">
                <option value="IN">Stock In</option><option value="OUT">Stock Out</option><option value="ADJUSTMENT">Adjustment</option>
              </select></div>
            <div><label className="field-label">Quantity</label>
              <input type="number" value={txn.quantity} onChange={e => setTxn({ ...txn, quantity: parseFloat(e.target.value) || 0 })} data-testid="txn-qty" /></div>
          </div>
          <div className="form-row-2">
            <div><label className="field-label">Reference</label>
              <input value={txn.reference_number} onChange={e => setTxn({ ...txn, reference_number: e.target.value })} data-testid="txn-ref" /></div>
            <div><label className="field-label">Party</label>
              <input value={txn.party} onChange={e => setTxn({ ...txn, party: e.target.value })} data-testid="txn-party" /></div>
          </div>
          <label className="field-label">Remarks</label>
          <textarea value={txn.remarks} onChange={e => setTxn({ ...txn, remarks: e.target.value })} data-testid="txn-remarks" />
          <button className="primary-btn full-btn" onClick={saveTxn} data-testid="save-txn-button"><Check size={17} /> Save transaction</button>
        </div>
      </Modal>
    </div>
  );
}

/* ========================= Job Work ========================= */
const JW_BLANK_STAGE = {
  stage_number: 1, vendor: "", process: "", challan_number: "",
  quantity_sent: 0, sent_date: "", expected_return: "",
  quantity_received: 0, rejection_quantity: 0, status: "Pending", notes: "", images: [],
};
const JW_BLANK = {
  item: "", work_type: "",
  inventory_item_id: null, initial_quantity: 0,
  stages: [{ ...JW_BLANK_STAGE }],
  current_stage_index: 0, status: "Pending", direction: "Out",
  images: [], next_followup_at: "", followup_notes: "", notes: "",
};

function JobWorkPage({ user, jobs, inventory, reload }) {
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [j, setJ] = useState(JW_BLANK);
  const [sugg, setSugg] = useState({ vendors: [], items: [], work_types: [], processes: [] });
  const [stageModal, setStageModal] = useState(null); // {job, idx} to complete
  const [stageForm, setStageForm] = useState({ quantity_received: "", rejection_quantity: "", challan_number: "", notes: "" });
  const [invChoice, setInvChoice] = useState({ mode: "skip", inventory_item_id: "", new_item: { sku: "", name: "", category: "Raw Material", unit: "pcs", min_level: 0, location: "" } });
  const [detail, setDetail] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => { api.jobworkSuggestions().then(setSugg).catch(() => {}); }, [jobs]);

  const openCreate = () => { setEdit(null); setJ({ ...JW_BLANK, stages: [{ ...JW_BLANK_STAGE }] }); setShow(true); };
  const openEdit = (jw) => { setEdit(jw); setJ({ ...JW_BLANK, ...jw }); setShow(true); };
  const addStage = () => setJ(s => ({ ...s, stages: [...s.stages, { ...JW_BLANK_STAGE, stage_number: s.stages.length + 1 }] }));
  const removeStage = (i) => setJ(s => ({ ...s, stages: s.stages.filter((_, idx) => idx !== i) }));
  const setStage = (i, k, v) => setJ(s => ({ ...s, stages: s.stages.map((st, idx) => idx === i ? { ...st, [k]: v } : st) }));
  const addImages = async (files) => {
    const list = Array.from(files || []).filter(f => f.type.startsWith("image/"));
    const readers = list.map(f => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); }));
    const results = await Promise.all(readers);
    setJ(s => ({ ...s, images: [...(s.images || []), ...results] }));
  };
  const save = async () => {
    if (!j.item) { toast.error("Item required"); return; }
    if (!j.stages.length || !j.stages[0].vendor) { toast.error("At least one stage with vendor is required"); return; }
    try {
      if (edit) await api.updateJobwork(edit.id, j);
      else await api.createJobwork(j);
      toast.success("Saved");
      setShow(false); setEdit(null);
      await reload();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  const del = async (jw) => {
    if (!window.confirm(`Delete ${jw.number}?`)) return;
    try { await api.deleteJobwork(jw.id); toast.success("Deleted"); await reload(); } catch { toast.error("Delete failed"); }
  };
  const openStageComplete = (job, idx) => {
    const s = job.stages[idx] || {};
    const isFinal = idx === job.stages.length - 1;
    setStageForm({
      quantity_received: s.quantity_sent || "",
      rejection_quantity: "0",
      challan_number: s.challan_number || "",
      notes: "",
    });
    // Reset inventory choice: if already linked, default to "existing"; else "skip" for user to decide
    const alreadyLinked = !!job.inventory_item_id;
    setInvChoice({
      mode: alreadyLinked ? "existing" : (isFinal ? "skip" : "skip"),
      inventory_item_id: job.inventory_item_id || "",
      new_item: { sku: "", name: job.item || "", category: "Raw Material", unit: "pcs", min_level: 0, location: "" },
    });
    setStageModal({ job, idx });
  };
  const completeStage = async () => {
    const isFinal = stageModal.idx === stageModal.job.stages.length - 1;
    const body = {
      quantity_received: parseFloat(stageForm.quantity_received) || 0,
      rejection_quantity: parseFloat(stageForm.rejection_quantity) || 0,
      challan_number: stageForm.challan_number,
      notes: stageForm.notes,
    };
    if (isFinal && !stageModal.job.inventory_item_id && invChoice.mode !== "skip") {
      body.add_to_inventory = true;
      if (invChoice.mode === "existing") {
        if (!invChoice.inventory_item_id) { toast.error("Pick an inventory item"); return; }
        body.inventory_item_id = invChoice.inventory_item_id;
      } else if (invChoice.mode === "new") {
        if (!invChoice.new_item.sku || !invChoice.new_item.name) { toast.error("New item needs SKU and Name"); return; }
        body.new_inventory_item = invChoice.new_item;
      }
    } else if (isFinal && stageModal.job.inventory_item_id) {
      body.add_to_inventory = true;
    }
    try {
      await api.completeJobworkStage(stageModal.job.id, stageModal.idx, body);
      toast.success(isFinal
        ? (body.add_to_inventory ? "Final stage complete · stock added to inventory" : "Final stage complete")
        : "Stage completed · advanced to next vendor");
      setStageModal(null);
      await reload();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const overdueCount = jobs.filter(x => x.is_overdue).length;
  const pendingCount = jobs.filter(x => x.status !== "Completed" && x.status !== "Cancelled").length;

  return (
    <div className="page-content" data-testid="page-jobwork">
      <div className="page-heading">
        <div><p className="eyebrow">EXTERNAL OPERATIONS · MULTI-STAGE ROUTING</p><h1>Job Work</h1>
          <p className="subheading">Route a batch through multiple vendors; auto stock-in on return.</p></div>
        <button className="primary-btn" onClick={openCreate} data-testid="jobwork-create-button">
          <Plus size={17} /> Create job work</button>
      </div>

      <div className="module-summary">
        <div className="summary-icon"><Wrench size={19} /></div>
        <div><strong>{jobs.length}</strong><span>total entries</span></div>
        <div><strong className="orange-text">{pendingCount}</strong><span>pending / in process</span></div>
        <div><strong className="red-text">{overdueCount}</strong><span>past expected return</span></div>
      </div>

      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead><tr>
              <th>Job work</th><th>Item</th><th>Routing (stage flow)</th>
              <th>Current stage</th><th>Expected</th><th>Overall</th><th></th>
            </tr></thead>
            <tbody>
              {jobs.length === 0 && <tr><td colSpan="7"><Empty msg="No job work entries yet" /></td></tr>}
              {jobs.map((jw, i) => {
                const rowCls = jw.is_overdue ? "row-stale" : "";
                const curIdx = jw.current_stage_index || 0;
                const cur = jw.current_stage;
                return (
                  <tr key={jw.id} className={rowCls} data-testid={`jobwork-row-${i}`} onClick={() => setDetail(jw)}>
                    <td><strong className="mono">{jw.number}</strong>
                      {jw.is_overdue && <span className="attention-chip stale" data-testid={`jw-overdue-${i}`}>Overdue</span>}
                      {jw.auto_stock_in_done && <span className="attention-chip synced">Stock-in ✓</span>}
                    </td>
                    <td><strong>{jw.item}</strong>{jw.work_type && <><br /><span className="table-sub">{jw.work_type}</span></>}</td>
                    <td>
                      <div className="route-flow">
                        {(jw.stages || []).map((s, k) => (
                          <span key={k} className={`route-step ${s.status === "Completed" ? "done" : k === curIdx ? "current" : "pending"}`}>
                            {s.vendor || "?"}
                            {s.process && <small> · {s.process}</small>}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{cur ? <>
                      <Badge tone={cur.status === "Completed" ? "green" : cur.status === "Delayed" ? "red" : "blue"}>{cur.status}</Badge>
                      <br /><span className="table-sub">Qty {cur.quantity_sent} → {cur.quantity_received}</span>
                    </> : "—"}</td>
                    <td>{fmtDate(cur?.expected_return)}</td>
                    <td><Badge>{jw.status}</Badge><br /><span className="table-sub">{curIdx + 1}/{jw.total_stages || 1}</span></td>
                    <td className="row-actions" onClick={e => e.stopPropagation()}>
                      {jw.status !== "Completed" && cur && cur.status !== "Completed" && <button className="icon-btn" title="Complete this stage" onClick={() => openStageComplete(jw, curIdx)} data-testid={`jw-complete-stage-${i}`}><Check size={15} /></button>}
                      <button className="icon-btn" onClick={() => setDetail(jw)} data-testid={`jw-view-${i}`}><ArrowUpRight size={15} /></button>
                      <button className="icon-btn" onClick={() => openEdit(jw)} data-testid={`jw-edit-${i}`}><Pencil size={15} /></button>
                      {user.role === "Admin" && <button className="icon-btn danger" onClick={() => del(jw)} data-testid={`jw-delete-${i}`}><Trash2 size={15} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create / Edit modal */}
      <Modal show={show} onClose={() => { setShow(false); setEdit(null); }}
        title={edit ? `Edit ${edit.number}` : "Create multi-stage job work"} wide>
        <datalist id="jw-vendors">{sugg.vendors.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="jw-items">{[...new Set([...inventory.map(it => `${it.sku} · ${it.name}`), ...inventory.map(it => it.name), ...sugg.items])].map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="jw-types">{sugg.work_types.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="jw-processes">{(sugg.processes || []).map(v => <option key={v} value={v} />)}</datalist>
        <div className="form-grid">
          <div className="form-row-2">
            <div><label className="field-label">Item / material *</label>
              <input list="jw-items" value={j.item} onChange={e => {
                const v = e.target.value;
                const match = inventory.find(it => `${it.sku} · ${it.name}` === v || it.name === v);
                setJ({ ...j, item: match ? match.name : v, inventory_item_id: match ? match.id : j.inventory_item_id });
              }} data-testid="jw-item" /></div>
            <div><label className="field-label">Work type (optional)</label>
              <input list="jw-types" value={j.work_type} onChange={e => setJ({ ...j, work_type: e.target.value })} data-testid="jw-work-type"
                placeholder="e.g. Hardening + Nitriding + Blackodising" /></div>
          </div>
          <div className="form-row-2">
            <div><label className="field-label">Link to inventory item (for auto stock-in on return)</label>
              <select value={j.inventory_item_id || ""} onChange={e => setJ({ ...j, inventory_item_id: e.target.value || null })} data-testid="jw-inv-link">
                <option value="">— None (manual stock-in) —</option>
                {inventory.map(it => <option key={it.id} value={it.id}>{it.sku} · {it.name}</option>)}
              </select></div>
            <div><label className="field-label">Next follow-up reminder</label>
              <input type="datetime-local" value={j.next_followup_at}
                onChange={e => setJ({ ...j, next_followup_at: e.target.value })} data-testid="jw-followup" /></div>
          </div>
          <label className="field-label">Routing stages (sequential)</label>
          <div className="qt-items">
            {j.stages.map((s, i) => (
              <div className="qt-item" key={i} data-testid={`jw-stage-${i}`}>
                <div className="qt-item-head">
                  <strong>Stage {i + 1}</strong>
                  {j.stages.length > 1 && <button type="button" className="icon-btn danger"
                    onClick={() => removeStage(i)} data-testid={`jw-stage-remove-${i}`}><Trash2 size={14} /></button>}
                </div>
                <div className="form-row-2">
                  <div><label className="field-label">Vendor *</label>
                    <input list="jw-vendors" value={s.vendor} onChange={e => setStage(i, "vendor", e.target.value)}
                      data-testid={`jw-stage-vendor-${i}`} /></div>
                  <div><label className="field-label">Process</label>
                    <input list="jw-processes" value={s.process} onChange={e => setStage(i, "process", e.target.value)}
                      data-testid={`jw-stage-process-${i}`} placeholder="Hardening / Nitriding / Blackodising..." /></div>
                </div>
                <div className="form-row-3">
                  <div><label className="field-label">Quantity sent</label>
                    <input type="number" value={s.quantity_sent}
                      onChange={e => setStage(i, "quantity_sent", parseFloat(e.target.value) || 0)}
                      data-testid={`jw-stage-qty-${i}`} /></div>
                  <div><label className="field-label">Sent date</label>
                    <input type="date" value={s.sent_date ? s.sent_date.slice(0, 10) : ""}
                      onChange={e => setStage(i, "sent_date", e.target.value ? new Date(e.target.value).toISOString() : "")}
                      data-testid={`jw-stage-sent-${i}`} /></div>
                  <div><label className="field-label">Expected return</label>
                    <input type="date" value={s.expected_return ? s.expected_return.slice(0, 10) : ""}
                      onChange={e => setStage(i, "expected_return", e.target.value ? new Date(e.target.value).toISOString() : "")}
                      data-testid={`jw-stage-expected-${i}`} /></div>
                </div>
                <div className="form-row-2">
                  <div><label className="field-label">Challan / outward no.</label>
                    <input value={s.challan_number} onChange={e => setStage(i, "challan_number", e.target.value)}
                      data-testid={`jw-stage-challan-${i}`} /></div>
                  <div><label className="field-label">Status</label>
                    <select value={s.status} onChange={e => setStage(i, "status", e.target.value)}
                      data-testid={`jw-stage-status-${i}`}>
                      {["Pending", "Sent", "In Process", "Completed", "Delayed", "Cancelled"].map(x => <option key={x}>{x}</option>)}
                    </select></div>
                </div>
                <label className="field-label">Stage notes</label>
                <textarea value={s.notes} onChange={e => setStage(i, "notes", e.target.value)} data-testid={`jw-stage-notes-${i}`} />
              </div>
            ))}
            <button type="button" className="ghost-btn" onClick={addStage} data-testid="jw-add-stage">
              <Plus size={14} /> Add next vendor stage
            </button>
          </div>
          <label className="field-label">Notes</label>
          <textarea value={j.notes} onChange={e => setJ({ ...j, notes: e.target.value })} data-testid="jw-notes" />
          <label className="field-label">Images</label>
          <div className="jw-image-grid">
            {(j.images || []).map((img, k) => (
              <div className="jw-image-card" key={k}>
                <img src={img} alt="" />
                <button type="button" className="jw-image-remove"
                  onClick={() => setJ(s => ({ ...s, images: s.images.filter((_, i) => i !== k) }))}
                  data-testid={`jw-image-remove-${k}`}><X size={11} /></button>
              </div>
            ))}
            <label className="jw-image-add" data-testid="jw-image-upload">
              <UploadCloud size={18} /><span>Add image</span>
              <input type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={e => { addImages(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
          <button className="primary-btn full-btn" onClick={save} data-testid="save-jobwork-button"><Check size={17} /> Save</button>
        </div>
      </Modal>

      {/* Stage completion modal */}
      <Modal show={!!stageModal} onClose={() => setStageModal(null)}
        title={stageModal ? `Complete stage ${stageModal.idx + 1} · ${stageModal.job.number}` : ""}
        eyebrow="MARK STAGE COMPLETE">
        {stageModal && (
          <div className="form-grid">
            <div className="stage-complete-summary">
              <strong>{stageModal.job.stages[stageModal.idx]?.vendor}</strong>
              <span>{stageModal.job.stages[stageModal.idx]?.process}</span>
              {stageModal.idx === stageModal.job.stages.length - 1 && stageModal.job.inventory_item_id && (
                <div className="stage-stock-notice"><Package size={13} /> Final stage — stock will be auto-added to the linked inventory item.</div>
              )}
            </div>
            <div className="form-row-2">
              <div><label className="field-label">Quantity received *</label>
                <input type="number" value={stageForm.quantity_received}
                  onChange={e => setStageForm({ ...stageForm, quantity_received: e.target.value })}
                  data-testid="stage-qty-received" /></div>
              <div><label className="field-label">Rejection / scrap</label>
                <input type="number" value={stageForm.rejection_quantity}
                  onChange={e => setStageForm({ ...stageForm, rejection_quantity: e.target.value })}
                  data-testid="stage-qty-rejected" /></div>
            </div>
            <label className="field-label">Vendor challan / bilty</label>
            <input value={stageForm.challan_number} onChange={e => setStageForm({ ...stageForm, challan_number: e.target.value })}
              data-testid="stage-challan" />
            <label className="field-label">Notes</label>
            <textarea value={stageForm.notes} onChange={e => setStageForm({ ...stageForm, notes: e.target.value })}
              data-testid="stage-notes" />

            {/* Final-stage inventory choice (only if not already linked) */}
            {stageModal.idx === stageModal.job.stages.length - 1 && !stageModal.job.inventory_item_id && (
              <div className="inv-choice" data-testid="inventory-choice">
                <div className="inv-choice-head">
                  <Package size={14} />
                  <strong>Add received stock to inventory?</strong>
                </div>
                <div className="inv-choice-tabs">
                  <button type="button" className={invChoice.mode === "skip" ? "active" : ""}
                    onClick={() => setInvChoice({ ...invChoice, mode: "skip" })} data-testid="inv-choice-skip">
                    Skip
                  </button>
                  <button type="button" className={invChoice.mode === "existing" ? "active" : ""}
                    onClick={() => setInvChoice({ ...invChoice, mode: "existing" })} data-testid="inv-choice-existing">
                    Add to existing item
                  </button>
                  <button type="button" className={invChoice.mode === "new" ? "active" : ""}
                    onClick={() => setInvChoice({ ...invChoice, mode: "new" })} data-testid="inv-choice-new">
                    Create new item
                  </button>
                </div>
                {invChoice.mode === "existing" && (
                  <div style={{ marginTop: 10 }}>
                    <label className="field-label">Pick inventory item</label>
                    <select value={invChoice.inventory_item_id}
                      onChange={e => setInvChoice({ ...invChoice, inventory_item_id: e.target.value })}
                      data-testid="inv-choice-pick">
                      <option value="">— Select —</option>
                      {inventory.map(it => <option key={it.id} value={it.id}>{it.sku} · {it.name} ({it.current_stock} {it.unit})</option>)}
                    </select>
                    {inventory.length === 0 && <small className="muted-cell" style={{display:"block",marginTop:6}}>No inventory items yet — switch to "Create new item" to create one on the fly.</small>}
                  </div>
                )}
                {invChoice.mode === "new" && (
                  <div style={{ marginTop: 10 }}>
                    <div className="form-row-2">
                      <div><label className="field-label">SKU *</label>
                        <input value={invChoice.new_item.sku}
                          onChange={e => setInvChoice({ ...invChoice, new_item: { ...invChoice.new_item, sku: e.target.value } })}
                          placeholder="e.g. CUT-SM1200C" data-testid="inv-new-sku" /></div>
                      <div><label className="field-label">Name *</label>
                        <input value={invChoice.new_item.name}
                          onChange={e => setInvChoice({ ...invChoice, new_item: { ...invChoice.new_item, name: e.target.value } })}
                          data-testid="inv-new-name" /></div>
                    </div>
                    <div className="form-row-3">
                      <div><label className="field-label">Category</label>
                        <select value={invChoice.new_item.category}
                          onChange={e => setInvChoice({ ...invChoice, new_item: { ...invChoice.new_item, category: e.target.value } })}
                          data-testid="inv-new-category">
                          {["Raw Material", "Spare Part", "Finished Machine"].map(c => <option key={c}>{c}</option>)}
                        </select></div>
                      <div><label className="field-label">Unit</label>
                        <input value={invChoice.new_item.unit}
                          onChange={e => setInvChoice({ ...invChoice, new_item: { ...invChoice.new_item, unit: e.target.value } })}
                          data-testid="inv-new-unit" /></div>
                      <div><label className="field-label">Min level</label>
                        <input type="number" value={invChoice.new_item.min_level}
                          onChange={e => setInvChoice({ ...invChoice, new_item: { ...invChoice.new_item, min_level: parseFloat(e.target.value) || 0 } })}
                          data-testid="inv-new-min" /></div>
                    </div>
                    <label className="field-label">Location</label>
                    <input value={invChoice.new_item.location}
                      onChange={e => setInvChoice({ ...invChoice, new_item: { ...invChoice.new_item, location: e.target.value } })}
                      placeholder="e.g. Main warehouse" data-testid="inv-new-location" />
                  </div>
                )}
                {invChoice.mode !== "skip" && (
                  <div className="stage-stock-notice" style={{ marginTop: 10 }}>
                    <Package size={13} /> On save, {parseFloat(stageForm.quantity_received) || 0} units will be added to inventory.
                  </div>
                )}
              </div>
            )}

            <button className="primary-btn full-btn" onClick={completeStage} data-testid="save-stage-complete">
              <Check size={17} /> Mark completed{stageModal.idx === stageModal.job.stages.length - 1 ? " & finalize" : " & advance"}
            </button>
          </div>
        )}
      </Modal>

      {/* Detail modal */}
      <Modal show={!!detail} onClose={() => setDetail(null)} title={detail?.number} wide eyebrow="JOB WORK DETAIL">
        {detail && (() => {
          const allCompleted = (detail.stages || []).every(s => s.status === "Completed");
          const finalReceived = detail.stages?.[detail.stages.length - 1]?.quantity_received || 0;
          const stockInState =
            detail.auto_stock_in_done ? { label: "Done ✓", tone: "green", reason: "Stock added" } :
            !detail.inventory_item_id ? { label: "Not configured", tone: "gray", reason: "No inventory item linked" } :
            !allCompleted ? { label: "Waiting", tone: "orange", reason: "All stages must be completed first" } :
            finalReceived <= 0 ? { label: "Pending", tone: "orange", reason: "Final stage received quantity is 0" } :
            { label: "Pending", tone: "orange", reason: "Click Finalize to add stock now" };
          const canFinalize = allCompleted && !detail.auto_stock_in_done;
          const finalize = async () => {
            // If no inventory linked, user must set one first; otherwise just recompute
            if (!detail.inventory_item_id) {
              toast.error("No inventory item linked. Edit the job work to link one, then try again.");
              return;
            }
            if (finalReceived <= 0) {
              const qty = window.prompt("Final stage quantity received is 0. Enter the actual received quantity to stock-in:");
              const n = parseFloat(qty);
              if (!n || n <= 0) { toast.error("Enter a valid quantity"); return; }
              try {
                await api.updateJobworkStage(detail.id, detail.stages.length - 1, { quantity_received: n });
                await api.recomputeJobwork(detail.id);
                toast.success(`Finalized · ${n} units added to inventory`);
                setDetail(null); await reload();
              } catch { toast.error("Failed to finalize"); }
              return;
            }
            try {
              await api.recomputeJobwork(detail.id);
              toast.success("Finalized · stock added to inventory");
              setDetail(null); await reload();
            } catch { toast.error("Failed"); }
          };
          return (
            <div className="form-grid">
              <div className="jw-detail-meta">
                <div><small>Item</small><strong>{detail.item}</strong></div>
                <div><small>Work type</small><strong>{detail.work_type || "—"}</strong></div>
                <div><small>Overall</small><Badge>{detail.status}</Badge></div>
                <div><small>Auto stock-in</small>
                  <strong className={stockInState.tone + "-text"} data-testid="auto-stockin-state">{stockInState.label}</strong>
                  <span className="muted-cell" style={{ fontSize: 9 }}>{stockInState.reason}</span>
                </div>
              </div>
              {canFinalize && (
                <div className="stage-stock-notice" data-testid="finalize-notice" style={{ background: "#fff8f2", color: "#b45309", border: "1px solid #f6c58a", justifyContent: "space-between" }}>
                  <span><Package size={13} /> All stages completed. {!detail.inventory_item_id ? "Link an inventory item (via Edit) to add stock." : finalReceived > 0 ? "Click to stock-in now." : "Enter a received qty to stock-in."}</span>
                  <button className="primary-btn" style={{ padding: "6px 12px" }} onClick={finalize} data-testid="finalize-button">
                    <Check size={13} /> Finalize &amp; stock-in
                  </button>
                </div>
              )}
              <div className="jw-stage-stepper">
                {(detail.stages || []).map((s, i) => (
                  <div className={`jw-stage-card ${s.status === "Completed" ? "done" : i === detail.current_stage_index ? "current" : "upcoming"}`}
                    key={i} data-testid={`jw-detail-stage-${i}`}>
                    <div className="jw-stage-head">
                      <div>
                        <span className="step-no">Stage {i + 1}</span>
                        <strong>{s.vendor}</strong>
                        {s.process && <span className="muted-cell">· {s.process}</span>}
                      </div>
                      <Badge tone={s.status === "Completed" ? "green" : s.status === "Delayed" ? "red" : "blue"}>{s.status}</Badge>
                    </div>
                    <div className="jw-stage-body">
                      <div><small>Sent</small><strong>{s.quantity_sent} on {fmtDate(s.sent_date)}</strong></div>
                      <div><small>Expected</small><strong>{fmtDate(s.expected_return)}</strong></div>
                      <div><small>Received</small><strong>{s.quantity_received}{s.rejection_quantity ? ` (${s.rejection_quantity} rejected)` : ""}</strong></div>
                      <div><small>Challan</small><strong>{s.challan_number || "—"}</strong></div>
                    </div>
                    {s.notes && <p className="jw-stage-notes">{s.notes}</p>}
                    {s.status !== "Completed" && i === detail.current_stage_index && (
                      <button className="primary-btn" onClick={() => { setDetail(null); openStageComplete(detail, i); }}
                        data-testid={`jw-detail-complete-${i}`}><Check size={14} /> Complete this stage</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>

      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(null)} data-testid="image-preview-modal">
          <img src={preview} alt="" style={{ maxHeight: "90vh", maxWidth: "90vw", borderRadius: 8 }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

/* ========================= Team ========================= */
function TeamPage({ user, users, reload }) {
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [u, setU] = useState({ name: "", email: "", login_id: "", password: "", role: "Sales", phone: "", active: true });
  const save = async () => {
    if (!u.name || !u.login_id || (!edit && !u.password)) { toast.error("Name, login & password required"); return; }
    try {
      if (edit) {
        const data = { ...u };
        if (!data.password) delete data.password;
        await api.updateUser(edit.id, data);
      } else await api.createUser(u);
      toast.success("Saved");
      setShow(false); setEdit(null); setU({ name: "", email: "", login_id: "", password: "", role: "Sales", phone: "", active: true });
      await reload();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  const del = async (usr) => {
    if (usr.id === user.id) { toast.error("Can't delete yourself"); return; }
    if (!window.confirm(`Delete ${usr.name}?`)) return;
    try { await api.deleteUser(usr.id); toast.success("Deleted"); await reload(); } catch { toast.error("Delete failed"); }
  };
  return (
    <div className="page-content" data-testid="page-team">
      <div className="page-heading">
        <div><p className="eyebrow">WORKSPACE ACCESS</p><h1>Team & roles</h1>
          <p className="subheading">Keep the right people in the right parts of the operation.</p></div>
        {user.role === "Admin" && <button className="primary-btn" onClick={() => { setEdit(null); setU({ name: "", email: "", login_id: "", password: "", role: "Sales", phone: "", active: true }); setShow(true); }} data-testid="team-create-button">
          <Plus size={17} /> Add team member</button>}
      </div>
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead><tr><th>Member</th><th>Login ID</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((usr, i) => (
                <tr key={usr.id} data-testid={`team-row-${i}`}>
                  <td><div className="client-cell"><Avatar name={usr.name} color={ROLE_META[usr.role]?.color} />
                    <div><strong>{usr.name}</strong><span>{usr.id === user.id ? "You" : ""}</span></div></div></td>
                  <td className="mono">{usr.login_id}</td>
                  <td>{usr.email}</td>
                  <td>{usr.phone}</td>
                  <td><Badge tone={usr.role === "Admin" ? "orange" : "blue"}>{usr.role}</Badge></td>
                  <td><Badge tone={usr.active ? "green" : "red"}>{usr.active ? "Active" : "Inactive"}</Badge></td>
                  <td className="row-actions">
                    {user.role === "Admin" && <button className="icon-btn" onClick={() => { setEdit(usr); setU({ ...usr, password: "" }); setShow(true); }} data-testid={`team-edit-${i}`}><Pencil size={15} /></button>}
                    {user.role === "Admin" && usr.id !== user.id && <button className="icon-btn danger" onClick={() => del(usr)} data-testid={`team-delete-${i}`}><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Modal show={show} onClose={() => { setShow(false); setEdit(null); }} title={edit ? "Edit member" : "Add team member"} wide>
        <div className="form-grid">
          <div className="form-row-2">
            <div><label className="field-label">Name *</label>
              <input value={u.name} onChange={e => setU({ ...u, name: e.target.value })} data-testid="user-name" /></div>
            <div><label className="field-label">Email</label>
              <input value={u.email} onChange={e => setU({ ...u, email: e.target.value })} data-testid="user-email" /></div>
          </div>
          <div className="form-row-2">
            <div><label className="field-label">Login ID *</label>
              <input value={u.login_id} onChange={e => setU({ ...u, login_id: e.target.value })} data-testid="user-login" /></div>
            <div><label className="field-label">Phone</label>
              <input value={u.phone} onChange={e => setU({ ...u, phone: e.target.value })} data-testid="user-phone" /></div>
          </div>
          <div className="form-row-2">
            <div><label className="field-label">{edit ? "New password (leave blank to keep)" : "Password *"}</label>
              <input type="password" value={u.password} onChange={e => setU({ ...u, password: e.target.value })} data-testid="user-password" /></div>
            <div><label className="field-label">Role</label>
              <select value={u.role} onChange={e => setU({ ...u, role: e.target.value })} data-testid="user-role">
                {["Admin", "Sales", "Production", "QC", "Accountant", "Dealer"].map(r => <option key={r}>{r}</option>)}
              </select></div>
          </div>
          <label className="toggle-row"><input type="checkbox" checked={u.active}
            onChange={e => setU({ ...u, active: e.target.checked })} data-testid="user-active" /> Active</label>
          <button className="primary-btn full-btn" onClick={save} data-testid="save-user-button"><Check size={17} /> Save</button>
        </div>
      </Modal>
    </div>
  );
}

/* ========================= Products ========================= */
/* ========================= Vendors ========================= */
const VENDOR_BLANK = { name: "", vendor_type: "Job Work", contact_person: "", phone: "", whatsapp: "", email: "", city: "", address: "", services: "", notes: "", active: true };
const Stars = ({ value }) => value == null ? <span className="muted-cell">No data yet</span> : (
  <span title={`${value} / 5`} style={{ whiteSpace: "nowrap" }}>
    {[1, 2, 3, 4, 5].map(n => <span key={n} style={{ color: n <= Math.round(value) ? "var(--orange, #f59e0b)" : "var(--line, #d1d5db)" }}>★</span>)}
    <small style={{ marginLeft: 6 }}>{value.toFixed(1)}</small>
  </span>
);
const vendorMsg = (v, company) => {
  const lines = (v.open_delayed || []).map(s => `• ${s.job_number} – ${s.item} (${s.process || "job work"}), due ${fmtDate(s.expected_return)}, qty ${s.quantity_sent || 0}`);
  return `Namaste ${v.contact_person || v.name},\n\nKindly share the status update for the following pending material:\n${lines.join("\n") || "• Your pending job work"}\n\nPlease confirm the dispatch date.\n\nRegards,\n${company?.company_name || "Aalidhra Cashew"}`;
};
const waLink = (v, company) => {
  let d = String(v.whatsapp || v.phone || "").replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(vendorMsg(v, company))}`;
};
const mailLink = (v, company) => `mailto:${v.email || ""}?subject=${encodeURIComponent("Status update required – pending job work")}&body=${encodeURIComponent(vendorMsg(v, company))}`;

function VendorsPage({ user, company }) {
  const [vendors, setVendors] = useState(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("All");
  const [form, setForm] = useState(null);
  const [sel, setSel] = useState(null);
  const [logs, setLogs] = useState([]);
  const [log, setLog] = useState({ log_type: "Call", note: "", delay_reason: "", next_followup_at: "", job_work_id: "" });
  const load = useCallback(() => api.listVendors().then(setVendors).catch(() => setVendors([])), []);
  useEffect(() => { load(); }, [load]);
  const openVendor = async (v) => { setSel(v); setLogs(v.id ? await api.vendorLogs(v.id).catch(() => []) : []); };
  const ensureId = async (v) => v.id || (await api.saveVendor({ ...VENDOR_BLANK, name: v.name })).id;
  const save = async () => {
    if (!form.name?.trim()) { toast.error("Vendor name required"); return; }
    try { await api.saveVendor(form); toast.success("Vendor saved"); setForm(null); await load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  const remove = async (v) => {
    if (!window.confirm(`Delete ${v.name}? Follow-up log will also be deleted.`)) return;
    try { await api.deleteVendor(v.id); toast.success("Deleted"); setSel(null); await load(); } catch { toast.error("Delete failed"); }
  };
  const addLog = async () => {
    if (!log.note.trim()) { toast.error("Write what was discussed"); return; }
    try {
      const id = await ensureId(sel);
      await api.addVendorLog({ ...log, vendor_id: id, job_work_id: log.job_work_id || null, next_followup_at: log.next_followup_at || null });
      toast.success("Log added");
      setLog({ log_type: "Call", note: "", delay_reason: "", next_followup_at: "", job_work_id: "" });
      const fresh = { ...sel, id, registered: true };
      setSel(fresh); setLogs(await api.vendorLogs(id)); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };
  if (!vendors) return <div className="page-content"><Loader /></div>;
  const shown = vendors.filter(v => (type === "All" || v.vendor_type === type) && (!q || `${v.name} ${v.city || ""} ${v.services || ""}`.toLowerCase().includes(q.toLowerCase())));
  const jobOptions = sel ? [...new Map((sel.stages || []).map(s => [s.job_id, s])).values()] : [];
  return (
    <div className="page-content" data-testid="page-vendors">
      <div className="page-heading">
        <div><p className="eyebrow">SUPPLY PARTNERS</p><h1>Vendors</h1>
          <p className="subheading">Auto rating from on-time delivery and rejection · follow-up log · status reminders.</p></div>
        <button className="primary-btn" onClick={() => setForm({ ...VENDOR_BLANK })} data-testid="vendor-add"><Plus size={17} /> Add vendor</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input placeholder="Search vendor, city, service..." value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 320 }} />
        <select value={type} onChange={e => setType(e.target.value)} style={{ maxWidth: 180 }}>
          <option>All</option><option>Job Work</option><option>Other</option>
        </select>
      </div>
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead><tr><th>Vendor</th><th>Type</th><th>Rating</th><th>On time</th><th>Rejection</th><th>Pending late</th><th>Contact</th><th></th></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={8}><Empty msg="No vendors yet" /></td></tr>}
              {shown.map((v, i) => (
                <tr key={v.name} data-testid={`vendor-row-${i}`} style={{ cursor: "pointer" }} onClick={() => openVendor(v)}>
                  <td><strong>{v.name}</strong>{!v.registered && <> <Badge tone="gray">From job work</Badge></>}<br /><span className="table-sub">{v.city || v.services || ""}</span></td>
                  <td>{v.vendor_type}</td>
                  <td><Stars value={v.rating} /></td>
                  <td>{v.on_time_pct == null ? "—" : `${Math.round(v.on_time_pct)}% (${v.on_time}/${v.completed + v.open_delayed.length})`}</td>
                  <td>{v.received_qty + v.rejected_qty > 0 ? `${v.rejection_pct.toFixed(1)}% (${v.rejected_qty})` : "—"}</td>
                  <td>{v.open_delayed.length ? <Badge tone="red">{v.open_delayed.length} late</Badge> : <Badge tone="green">OK</Badge>}</td>
                  <td>{v.phone || v.whatsapp || "—"}</td>
                  <td className="row-actions" onClick={e => e.stopPropagation()}>
                    {(v.whatsapp || v.phone) && <a className="icon-btn" href={waLink(v, company)} target="_blank" rel="noreferrer" title="WhatsApp status request"><MessageCircle size={15} /></a>}
                    {v.email && <a className="icon-btn" href={mailLink(v, company)} title="Email status request"><FileText size={15} /></a>}
                    <button className="icon-btn" onClick={() => setForm(v.registered ? { ...VENDOR_BLANK, ...v } : { ...VENDOR_BLANK, name: v.name })} title="Edit"><Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="muted-cell" style={{ marginTop: 10, fontSize: 12 }}>Rating = 50% on-time delivery + 50% low rejection (from completed job-work stages), out of 5 stars.</p>

      <Modal show={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit vendor" : "Add vendor"} wide>
        {form && <div className="form-grid">
          <div className="form-row-2">
            <div><label className="field-label">Vendor name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="field-label">Type</label><select value={form.vendor_type} onChange={e => setForm({ ...form, vendor_type: e.target.value })}><option>Job Work</option><option>Other</option></select></div>
          </div>
          <div className="form-row-3">
            <div><label className="field-label">Contact person</label><input value={form.contact_person || ""} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div><label className="field-label">Phone</label><input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="field-label">WhatsApp</label><input value={form.whatsapp || ""} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
          </div>
          <div className="form-row-2">
            <div><label className="field-label">Email</label><input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="field-label">City</label><input value={form.city || ""} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <label className="field-label">Services / processes</label><input value={form.services || ""} onChange={e => setForm({ ...form, services: e.target.value })} placeholder="Hardening, Plating..." />
          <label className="field-label">Address</label><textarea value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} />
          <label className="field-label">Notes</label><textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <button className="primary-btn full-btn" onClick={save}><Check size={17} /> Save</button>
        </div>}
      </Modal>

      <Modal show={!!sel} onClose={() => setSel(null)} title={sel?.name || ""} eyebrow="VENDOR PERFORMANCE & FOLLOW-UP" wide>
        {sel && <div className="form-grid">
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <Stars value={sel.rating} />
            <span>Jobs: <strong>{sel.total_jobs}</strong></span>
            <span>On time: <strong>{sel.on_time}</strong></span>
            <span>Delayed: <strong>{sel.delayed}</strong></span>
            <span>Rejected: <strong>{sel.rejected_qty}</strong> / {sel.received_qty + sel.rejected_qty}</span>
            {(sel.whatsapp || sel.phone) && <a className="ghost-btn" href={waLink(sel, company)} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
            {sel.email && <a className="ghost-btn" href={mailLink(sel, company)}><FileText size={15} /> Email</a>}
            {sel.registered && user.role === "Admin" && <button className="ghost-btn" onClick={() => remove(sel)}><Trash2 size={15} /> Delete</button>}
          </div>
          {sel.open_delayed.length > 0 && <div className="stage-stock-notice"><Clock3 size={13} /> Late: {sel.open_delayed.map(s => `${s.job_number} (due ${fmtDate(s.expected_return)})`).join(", ")}</div>}

          <h4 style={{ margin: "8px 0 0" }}>Add follow-up log</h4>
          <div className="form-row-3">
            <div><label className="field-label">Type</label><select value={log.log_type} onChange={e => setLog({ ...log, log_type: e.target.value })}>
              <option>Call</option><option>WhatsApp</option><option>Email</option><option>Visit</option><option>Delay reason</option><option>Quality issue</option><option>Note</option></select></div>
            <div><label className="field-label">Job work</label><select value={log.job_work_id} onChange={e => setLog({ ...log, job_work_id: e.target.value })}>
              <option value="">— General —</option>{jobOptions.map(s => <option key={s.job_id} value={s.job_id}>{s.job_number} · {s.item}</option>)}</select></div>
            <div><label className="field-label">Next follow-up</label><input type="date" value={log.next_followup_at} onChange={e => setLog({ ...log, next_followup_at: e.target.value })} /></div>
          </div>
          <label className="field-label">What was discussed *</label>
          <textarea value={log.note} onChange={e => setLog({ ...log, note: e.target.value })} />
          <label className="field-label">Delay reason (if any)</label>
          <input value={log.delay_reason} onChange={e => setLog({ ...log, delay_reason: e.target.value })} placeholder="e.g. power cut, machine breakdown, labour shortage" />
          <button className="primary-btn" onClick={addLog}><Plus size={16} /> Save log</button>

          <h4 style={{ margin: "12px 0 0" }}>History</h4>
          {logs.length === 0 ? <span className="muted-cell">No logs yet</span> : logs.map(l => (
            <div key={l.id} className="panel" style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span><Badge tone={l.log_type === "Delay reason" ? "red" : l.log_type === "Quality issue" ? "orange" : "blue"}>{l.log_type}</Badge> {l.jw && <small className="mono">{l.jw.number}</small>}</span>
                <small className="muted-cell">{fmtDateTime(l.created_at)}</small>
              </div>
              <p style={{ margin: "6px 0" }}>{l.note}</p>
              {l.delay_reason && <small><strong>Delay reason:</strong> {l.delay_reason}</small>}
              {l.next_followup_at && <small style={{ display: "block" }}><strong>Next follow-up:</strong> {fmtDate(l.next_followup_at)}</small>}
            </div>
          ))}
        </div>}
      </Modal>
    </div>
  );
}

function ProductsPage({ user, products, reload }) {
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [p, setP] = useState({ name: "", model_code: "", description: "", unit: "Unit", default_price: 0, active: true });
  const save = async () => {
    if (!p.name) { toast.error("Name required"); return; }
    try {
      if (edit) await api.updateProduct(edit.id, p);
      else await api.createProduct(p);
      toast.success("Saved");
      setShow(false); setEdit(null); setP({ name: "", model_code: "", description: "", unit: "Unit", default_price: 0, active: true });
      await reload();
    } catch { toast.error("Save failed"); }
  };
  const del = async (prod) => {
    if (!window.confirm(`Delete ${prod.name}?`)) return;
    try { await api.deleteProduct(prod.id); toast.success("Deleted"); await reload(); } catch { toast.error("Delete failed"); }
  };
  return (
    <div className="page-content" data-testid="page-products">
      <div className="page-heading">
        <div><p className="eyebrow">CATALOG CONTROL</p><h1>Product master</h1>
          <p className="subheading">One source of truth for every machine you build.</p></div>
        <button className="primary-btn" onClick={() => { setEdit(null); setShow(true); }} data-testid="products-create-button">
          <Plus size={17} /> Add product</button>
      </div>
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead><tr><th>Name / model</th><th>Description</th><th>Unit</th><th>Default price</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {products.map((prod, i) => (
                <tr key={prod.id} data-testid={`products-row-${i}`}>
                  <td><strong>{prod.name}</strong><br /><span className="table-sub mono">{prod.model_code}</span></td>
                  <td>{prod.description}</td>
                  <td>{prod.unit}</td>
                  <td><strong>{fmtMoney(prod.default_price)}</strong></td>
                  <td><Badge tone={prod.active ? "green" : "gray"}>{prod.active ? "Active" : "Inactive"}</Badge></td>
                  <td className="row-actions">
                    <button className="icon-btn" onClick={() => { setEdit(prod); setP(prod); setShow(true); }} data-testid={`prod-edit-${i}`}><Pencil size={15} /></button>
                    {user.role === "Admin" && <button className="icon-btn danger" onClick={() => del(prod)} data-testid={`prod-delete-${i}`}><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Modal show={show} onClose={() => { setShow(false); setEdit(null); }} title={edit ? "Edit product" : "Add product"} wide>
        <div className="form-grid">
          <div className="form-row-2">
            <div><label className="field-label">Name *</label>
              <input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} data-testid="product-name" /></div>
            <div><label className="field-label">Model code</label>
              <input value={p.model_code} onChange={e => setP({ ...p, model_code: e.target.value })} data-testid="product-model" /></div>
          </div>
          <label className="field-label">Description</label>
          <textarea value={p.description} onChange={e => setP({ ...p, description: e.target.value })} data-testid="product-description" />
          <div className="form-row-3">
            <div><label className="field-label">Unit</label>
              <input value={p.unit} onChange={e => setP({ ...p, unit: e.target.value })} data-testid="product-unit" /></div>
            <div><label className="field-label">Default price (₹)</label>
              <input type="number" value={p.default_price} onChange={e => setP({ ...p, default_price: parseFloat(e.target.value) || 0 })} data-testid="product-price" /></div>
            <div><label className="toggle-row"><input type="checkbox" checked={p.active}
              onChange={e => setP({ ...p, active: e.target.checked })} data-testid="product-active" /> Active</label></div>
          </div>
          <button className="primary-btn full-btn" onClick={save} data-testid="save-product-button"><Check size={17} /> Save</button>
        </div>
      </Modal>
    </div>
  );
}

/* ========================= Company Settings ========================= */
function SettingsPage({ user, company, reload }) {
  const [f, setF] = useState(company);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setF(company); }, [company]);
  const uploadLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setF(s => ({ ...s, logo_data: reader.result }));
    reader.readAsDataURL(file);
  };
  const save = async () => {
    setBusy(true);
    try { await api.updateCompany(f); toast.success("Company settings saved"); await reload(); }
    catch { toast.error("Save failed"); } finally { setBusy(false); }
  };
  return (
    <div className="page-content" data-testid="page-settings">
      <div className="page-heading">
        <div><p className="eyebrow">WORKSPACE PROFILE</p><h1>Company settings</h1>
          <p className="subheading">Your profile and terms used in every quotation PDF.</p></div>
        <button className="primary-btn" onClick={save} disabled={busy} data-testid="save-company-button">
          <Save size={17} /> {busy ? "Saving..." : "Save changes"}</button>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <div className="panel-head"><div><p className="eyebrow">BRAND</p><h3>Company profile</h3></div></div>
          <div className="logo-upload">
            {f.logo_data ? <img src={f.logo_data} alt="logo" className="logo-preview" /> :
              <div className="logo-placeholder"><ImageIcon size={28} /><span>No logo</span></div>}
            <label className="ghost-btn upload-btn" data-testid="upload-logo">
              <UploadCloud size={16} /> Upload logo
              <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: "none" }} />
            </label>
            {f.logo_data && <button className="ghost-btn" onClick={() => setF({ ...f, logo_data: null })} data-testid="remove-logo">Remove</button>}
          </div>
          <div className="form-row-2">
            <div><label className="field-label">Company name</label>
              <input value={f.company_name || ""} onChange={e => setF({ ...f, company_name: e.target.value })} data-testid="co-name" /></div>
            <div><label className="field-label">Tagline</label>
              <input value={f.tagline || ""} onChange={e => setF({ ...f, tagline: e.target.value })} data-testid="co-tagline" /></div>
          </div>
          <label className="field-label">Address</label>
          <textarea value={f.address || ""} onChange={e => setF({ ...f, address: e.target.value })} data-testid="co-address" />
          <div className="form-row-2">
            <div><label className="field-label">Phone</label>
              <input value={f.phone || ""} onChange={e => setF({ ...f, phone: e.target.value })} data-testid="co-phone" /></div>
            <div><label className="field-label">Email</label>
              <input value={f.email || ""} onChange={e => setF({ ...f, email: e.target.value })} data-testid="co-email" /></div>
          </div>
          <div className="form-row-2">
            <div><label className="field-label">GSTIN</label>
              <input value={f.gstin || ""} onChange={e => setF({ ...f, gstin: e.target.value })} data-testid="co-gstin" /></div>
            <div><label className="field-label">Website</label>
              <input value={f.website || ""} onChange={e => setF({ ...f, website: e.target.value })} data-testid="co-website" /></div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><p className="eyebrow">LEGAL</p><h3>Terms &amp; Conditions</h3></div>
            <span className="muted-cell">Shown on last page of quotation PDF</span></div>
          <RichText value={f.terms_html || ""} onChange={v => setF({ ...f, terms_html: v })} />
          <div className="preview-section">
            <small>LIVE PREVIEW</small>
            <div className="terms-preview" dangerouslySetInnerHTML={{ __html: f.terms_html || "" }} />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ========================= Reports (simple) ========================= */
function ReportsPage({ orders, payments, clients }) {
  const totalValue = orders.reduce((a, o) => a + o.items.reduce((b, it) => b + it.quantity * it.unit_price * (1 + it.gst_percent / 100), 0), 0);
  const received = payments.reduce((a, p) => a + p.amount, 0);
  return (
    <div className="page-content" data-testid="page-reports">
      <div className="page-heading">
        <div><p className="eyebrow">INSIGHTS</p><h1>Reports</h1>
          <p className="subheading">A quick pulse of the business.</p></div>
      </div>
      <div className="metric-grid">
        <Metric label="Total order value" value={fmtMoney(totalValue)} icon={ClipboardList} tone="orange" />
        <Metric label="Total collected" value={fmtMoney(received)} icon={WalletCards} tone="green" />
        <Metric label="Outstanding" value={fmtMoney(Math.max(totalValue - received, 0))} icon={Receipt} tone="purple" />
        <Metric label="Active clients" value={clients.length} icon={Users} tone="blue" />
      </div>
    </div>
  );
}

/* ========================= Main app shell ========================= */
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aa-user") || "null"); } catch { return null; }
  });
  useEffect(() => {
    api.me().then((u) => { setUser(u); localStorage.setItem("aa-user", JSON.stringify(u)); })
      .catch(() => { localStorage.removeItem("aa-user"); setUser(null); });
  }, []);
  const [page, setPage] = useState("dashboard");
  const [pageArgs, setPageArgs] = useState({});
  const [selectedClient, setSelectedClient] = useState(null);
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Data states
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [products, setProducts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [invTxns, setInvTxns] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [stats, setStats] = useState(null);
  const [company, setCompany] = useState({ company_name: "Aalidhra Cashew Export", terms_html: "" });
  const [loaded, setLoaded] = useState(false);

  const dealers = users.filter(u => u.role === "Dealer");

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const [c, o, q, pr, py, d, inv, invTx, jb, us, fu, co, st] = await Promise.all([
        api.listClients().catch(() => []),
        api.listOrders().catch(() => []),
        api.listQuotations().catch(() => []),
        api.listProducts().catch(() => []),
        api.listPayments().catch(() => []),
        api.listDispatches().catch(() => []),
        api.listInventory().catch(() => []),
        api.listInventoryTxns().catch(() => []),
        api.listJobwork().catch(() => []),
        api.listUsers().catch(() => []),
        api.allFollowups().catch(() => []),
        api.getCompany().catch(() => null),
        api.dashboard().catch(() => null),
      ]);
      setClients(c); setOrders(o); setQuotations(q); setProducts(pr); setPayments(py);
      setDispatches(d); setInventory(inv); setInvTxns(invTx); setJobs(jb); setUsers(us); setFollowups(fu);
      if (co) setCompany(co); if (st) setStats(st);
      setLoaded(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load workspace");
    }
  }, [user]);

  useEffect(() => { if (user) reload(); }, [user, reload]);

  const nav = (to, args = {}) => {
    setSelectedClient(null);
    setPage(to);
    setPageArgs(args);
    setMobileOpen(false);
  };

  if (!user) {
    return <><LoginPage onLogin={(u) => { setUser(u); setPage("dashboard"); }} /><Toaster position="top-right" /></>;
  }

  const navAllowed = NAV.map(g => ({ ...g, items: g.items.filter(x =>
    can(user, x.id) || (x.id === "team" && user.role === "Admin")
    || (x.id === "products" && user.role === "Admin")
    || (x.id === "settings" && user.role === "Admin")
    || (x.id === "reports" && (user.role === "Admin" || user.role === "Accountant"))
    || (x.id === "inventory" && (user.role === "Admin" || user.role === "Production"))
    || (x.id === "jobwork" && (user.role === "Admin" || user.role === "Production"))
    || (x.id === "vendors" && (user.role === "Admin" || user.role === "Production"))
  ) })).filter(g => g.items.length);

  const pageTitle = page === "dashboard" ? "Overview" : NAV.flatMap(g => g.items).find(x => x.id === page)?.label || "Workspace";

  const render = () => {
    if (!loaded) return <div className="page-content"><Loader /></div>;
    if (selectedClient) return <ClientDetail client={selectedClient}
      onBack={() => setSelectedClient(null)} setPage={nav} reload={reload} />;
    switch (page) {
      case "dashboard": return <Dashboard user={user} setPage={nav} orders={orders} clients={clients} followups={followups} stats={stats} inventory={inventory} jobs={jobs} />;
      case "clients": return <ClientsPage user={user} clients={clients} dealers={dealers} reload={reload} openClient={setSelectedClient} />;
      case "followups": return <FollowupsPage followups={followups} />;
      case "quotations": return <QuotationsPage user={user} quotations={quotations} clients={clients} products={products} company={company} reload={reload} />;
      case "orders": return <OrdersPage user={user} orders={orders} clients={clients} products={products} reload={reload} setPage={nav} />;
      case "production": return <ProductionPage user={user} orders={orders} reload={reload} setPage={nav} initialOrderId={pageArgs.order_id} />;
      case "dispatch": return <DispatchPage user={user} orders={orders} dispatches={dispatches} reload={reload} />;
      case "payments": return <PaymentsPage user={user} payments={payments} orders={orders} reload={reload} />;
      case "inventory": return <InventoryPage user={user} items={inventory} txns={invTxns} reload={reload} />;
      case "jobwork": return <JobWorkPage user={user} jobs={jobs} inventory={inventory} reload={reload} />;
      case "vendors": return <VendorsPage user={user} company={company} />;
      case "team": return <TeamPage user={user} users={users} reload={reload} />;
      case "products": return <ProductsPage user={user} products={products} reload={reload} />;
      case "settings": return <SettingsPage user={user} company={company} reload={reload} />;
      case "reports": return <ReportsPage orders={orders} payments={payments} clients={clients} />;
      default: return <Empty msg="Page under construction" />;
    }
  };

  const logout = () => {
    api.logout().finally(() => setUser(null));
  };

  return (
    <div className={`app-shell ${dark ? "dark-mode" : ""} ${mobileOpen ? "sidebar-open" : ""}`}>
      <aside className="sidebar" data-testid="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark"><Factory size={18} /></span>
          <span>{BRAND.name}<strong>{BRAND.suffix}</strong></span>
          <span className="beta">ERP</span>
        </div>
        <div className="workspace-switch">
          <div className="workspace-avatar">{(company.company_name || "A").split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase()}</div>
          <div><strong>{company.company_name || "Aalidhra Cashew Export"}</strong><span>Operations workspace</span></div>
        </div>
        <nav>
          {navAllowed.map(g => (
            <div className="nav-group" key={g.label}>
              <span className="nav-label">{g.label}</span>
              {g.items.map(item => {
                const I = item.icon;
                return (
                  <button key={item.id} className={page === item.id ? "active" : ""}
                    onClick={() => nav(item.id)} data-testid={`nav-${item.id}`}>
                    <I size={17} /><span>{item.label}</span>
                    {item.id === "followups" && followups.length > 0 && <b>{followups.length}</b>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-box"><Zap size={15} /><div><strong>Need a hand?</strong><span>View workspace guide</span></div></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-button"><Menu size={19} /></button>
            <span className="breadcrumb">Workspace <ChevronDown size={13} /> <strong>{pageTitle}</strong></span>
          </div>
          <div className="topbar-actions">
            <div className="top-search"><Search size={16} />
              <input placeholder="Search anything..." data-testid="global-search-input" />
            </div>
            <button className="top-icon" onClick={() => setDark(!dark)} data-testid="theme-toggle-button">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="top-icon notification" data-testid="notifications-button">
              <Bell size={18} />{stats?.overdue_followups > 0 && <i />}
            </button>
            <div className="user-menu" data-testid="user-menu">
              <Avatar name={user.name} color={ROLE_META[user.role]?.color} />
              <div><strong>{user.name}</strong><span>{user.role}</span></div>
              <ChevronDown size={14} />
            </div>
            <button className="logout-btn" onClick={logout} data-testid="logout-button"><LogOut size={16} /></button>
          </div>
        </header>
        <div className="role-banner">
          <span><ShieldCheck size={14} /> Viewing as <strong>{user.role}</strong></span>
          <span>{hidesFinance(user) ? "Financial details hidden for your role" : user.role === "Dealer" ? "You see only your own clients & orders" : "All workspace data visible"}</span>
          <button onClick={logout} data-testid="switch-role-button">Switch role <ArrowUpRight size={13} /></button>
        </div>
        {render()}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
