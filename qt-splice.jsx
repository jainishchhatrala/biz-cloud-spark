/* ========================= Quotations ========================= */
const BLANK_QITEM = { name: "", description: "", quantity: 1, unit_price: 0, gst_percent: 18 };

function qtTotals(items = [], discount = 0) {
  const sub = items.reduce((a, it) => a + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const gstFull = items.reduce((a, it) => a + Number(it.quantity || 0) * Number(it.unit_price || 0) * Number(it.gst_percent || 0) / 100, 0);
  const disc = Math.min(Number(discount || 0), sub);
  const ratio = sub ? (sub - disc) / sub : 1;
  const gst = gstFull * ratio;
  return { sub, disc, taxable: sub - disc, gst, total: sub - disc + gst };
}

function QuoteItemsEditor({ items, setItems, products }) {
  const setItem = (i, k, v) => setItems(items.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const applyProduct = (i, pid) => {
    const p = products.find(x => x.id === pid);
    if (p) setItems(items.map((it, idx) => idx === i ? { ...it, name: p.name, description: p.description, unit_price: p.default_price } : it));
  };
  return (
    <div className="qt-items">
      {items.map((it, i) => (
        <div className="qt-item" key={i} data-testid={`quotation-item-${i}`}>
          <div className="qt-item-head">
            <strong>Item {i + 1}</strong>
            {products.length > 0 && (
              <select onChange={e => applyProduct(i, e.target.value)} value="" data-testid={`qt-item-product-${i}`}>
                <option value="">— Use product master —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {items.length > 1 && <button type="button" className="icon-btn danger"
              onClick={() => setItems(items.filter((_, idx) => idx !== i))} data-testid={`qt-item-remove-${i}`}><Trash2 size={14} /></button>}
          </div>
          <div className="form-row-2">
            <div><label className="field-label">Name *</label>
              <input value={it.name} onChange={e => setItem(i, "name", e.target.value)} data-testid={`qt-item-name-${i}`} /></div>
            <div><label className="field-label">Description / specification</label>
              <input value={it.description || ""} onChange={e => setItem(i, "description", e.target.value)} data-testid={`qt-item-desc-${i}`} /></div>
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
            Amount: <strong className="orange-text">{fmtMoney(it.quantity * it.unit_price)}</strong>
          </div>
        </div>
      ))}
      <button type="button" className="ghost-btn" onClick={() => setItems([...items, { ...BLANK_QITEM }])} data-testid="qt-add-item">
        <Plus size={14} /> Add another item</button>
    </div>
  );
}

function QtTotalsBox({ items, discount }) {
  const t = qtTotals(items, discount);
  return (
    <div className="qt-totals">
      <div><span>Total</span><strong>{fmtMoney(t.sub)}</strong></div>
      {t.disc > 0 && <div><span>Discount</span><strong>− {fmtMoney(t.disc)}</strong></div>}
      <div><span>GST total</span><strong>{fmtMoney(t.gst)}</strong></div>
      <div className="qt-grand"><span>Grand total</span><strong>{fmtMoney(t.total)}</strong></div>
    </div>
  );
}

function QuotationForm({ initial, clients, products, templates = [], defaultClientId, onSave, onClose }) {
  const [f, setF] = useState({
    client_id: initial?.client_id || defaultClientId || (clients[0]?.id || ""),
    valid_until: initial?.valid_until || "",
    status: initial?.status || "Draft",
    items: initial?.items?.length ? initial.items : [{ ...BLANK_QITEM }],
    discount: initial?.discount || 0,
    notes: initial?.notes || "",
    template_id: initial?.template_id || null,
    template_name: initial?.template_name || "",
    change_notes: initial?.change_notes || "",
    shared_at: initial?.shared_at || "",
  });
  const linkedOrder = initial?.synced_order_number;
  const [busy, setBusy] = useState(false);
  const applyTemplate = (tid) => {
    const t = templates.find(x => x.id === tid);
    if (!t) return;
    setF(s => ({ ...s, template_id: t.id, template_name: t.name, items: (t.items || []).map(it => ({ ...BLANK_QITEM, ...it })), discount: t.discount || 0, notes: s.notes || t.notes || "" }));
    toast.success(`Loaded "${t.name}"`);
  };
  const save = async () => {
    if (!f.client_id) { toast.error("Client required"); return; }
    if (f.items.some(i => !i.name)) { toast.error("All items need a name"); return; }
    setBusy(true);
    try { await onSave({ ...f, template_id: f.template_id || null, shared_at: f.shared_at || null }); onClose(); } catch {} finally { setBusy(false); }
  };
  return (
    <div className="form-grid">
      {linkedOrder && (
        <div className="sync-notice" data-testid="quotation-sync-notice">
          <ArrowUpRight size={14} />
          <span>This quotation is linked to order <strong>{linkedOrder}</strong>. Saving changes will update the order items (production stages are preserved for unchanged items).</span>
        </div>
      )}
      {templates.length > 0 && (
        <div><label className="field-label">Start from default quotation</label>
          <select value={f.template_id || ""} onChange={e => applyTemplate(e.target.value)} data-testid="quotation-template-select">
            <option value="">— Select default quotation (e.g. 1 Ton Project) —</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></div>
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
      <div className="form-row-2">
        <div><label className="field-label">Status</label>
          <select value={f.status} onChange={e => setF({ ...f, status: e.target.value, shared_at: e.target.value === "Sent" && !f.shared_at ? new Date().toISOString() : f.shared_at })} data-testid="quotation-status">
            {["Draft", "Sent", "Revised", "Accepted", "Rejected", "Converted"].map(s => <option key={s}>{s}</option>)}
          </select></div>
        <div><label className="field-label">Shared with client on</label>
          <input type="date" value={f.shared_at ? f.shared_at.slice(0, 10) : ""}
            onChange={e => setF({ ...f, shared_at: e.target.value ? new Date(e.target.value).toISOString() : "" })} data-testid="quotation-shared-at" /></div>
      </div>
      <label className="field-label">Items</label>
      <QuoteItemsEditor items={f.items} setItems={(items) => setF(s => ({ ...s, items }))} products={products} />
      <div><label className="field-label">Discount (₹)</label>
        <input type="number" min="0" value={f.discount} onChange={e => setF({ ...f, discount: parseFloat(e.target.value) || 0 })} data-testid="quotation-discount" /></div>
      <QtTotalsBox items={f.items} discount={f.discount} />
      <label className="field-label">Changes requested by client</label>
      <textarea value={f.change_notes} onChange={e => setF({ ...f, change_notes: e.target.value })}
        placeholder="e.g. Wants 4 cooling bins instead of 3, asked for extra discount" data-testid="quotation-change-notes" />
      <label className="field-label">Notes</label>
      <textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} data-testid="quotation-notes" />
      <button className="primary-btn full-btn" onClick={save} disabled={busy} data-testid="save-quotation-button">
        <Check size={17} /> {busy ? "Saving..." : "Save quotation"}
      </button>
    </div>
  );
}

function TemplateForm({ initial, products, onSave, onClose }) {
  const [f, setF] = useState({
    name: initial?.name || "", description: initial?.description || "",
    items: initial?.items?.length ? initial.items : [{ ...BLANK_QITEM }],
    discount: initial?.discount || 0, notes: initial?.notes || "",
  });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.name.trim()) { toast.error("Name required (e.g. 1 Ton Project)"); return; }
    if (f.items.some(i => !i.name)) { toast.error("All items need a name"); return; }
    setBusy(true);
    try { await onSave(f); onClose(); } catch {} finally { setBusy(false); }
  };
  return (
    <div className="form-grid">
      <div className="form-row-2">
        <div><label className="field-label">Default quotation name *</label>
          <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. 1 Ton Project" data-testid="template-name" /></div>
        <div><label className="field-label">Short description</label>
          <input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} data-testid="template-description" /></div>
      </div>
      <label className="field-label">Items</label>
      <QuoteItemsEditor items={f.items} setItems={(items) => setF(s => ({ ...s, items }))} products={products} />
      <div><label className="field-label">Default discount (₹)</label>
        <input type="number" min="0" value={f.discount} onChange={e => setF({ ...f, discount: parseFloat(e.target.value) || 0 })} data-testid="template-discount" /></div>
      <QtTotalsBox items={f.items} discount={f.discount} />
      <label className="field-label">Default notes</label>
      <textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} data-testid="template-notes" />
      <button className="primary-btn full-btn" onClick={save} disabled={busy} data-testid="save-template-button">
        <Check size={17} /> {busy ? "Saving..." : "Save default quotation"}
      </button>
    </div>
  );
}

function printQuotation(q, company) {
  const t = qtTotals(q.items, q.discount);
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
      @media print {.no-print{display:none;}}
    </style></head><body>
    <div class="page cover">
      <div class="brand-row">${logoImg}
        <div><h2 class="co-name">${company.company_name || "Company"}</h2>
          <p class="co-sub">${company.tagline || ""}</p></div></div>
      <div class="cover-hero">
        <p class="eyebrow">QUOTATION ${q.number}${q.template_name ? " · " + q.template_name : ""}</p>
        <h1>For ${q.client_name || ""}</h1>
        <div class="meta">
          <div><small>Issued</small><strong>${fmtDate(q.order_date)}</strong></div>
          <div><small>Valid until</small><strong>${fmtDate(q.valid_until)}</strong></div>
          <div><small>Status</small><strong>${q.status}</strong></div>
          <div><small>Grand total</small><strong>${fmtMoney(t.total)}</strong></div>
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
      <table><thead><tr><th>#</th><th>Item</th><th>Description</th><th>Rate</th><th>Qty</th><th>Amount</th></tr></thead>
      <tbody>${q.items.map((it, i) => `<tr><td>${i + 1}</td><td><strong>${it.name}</strong></td><td>${it.description || ""}</td>
        <td>${fmtMoney(it.unit_price)}</td><td>${it.quantity}</td>
        <td><strong>${fmtMoney(it.quantity * it.unit_price)}</strong></td></tr>`).join("")}</tbody></table>
      <div class="totals">
        <div><span>Total</span><strong>${fmtMoney(t.sub)}</strong></div>
        ${t.disc > 0 ? `<div><span>Discount</span><strong>− ${fmtMoney(t.disc)}</strong></div><div><span>Net total</span><strong>${fmtMoney(t.taxable)}</strong></div>` : ""}
        <div><span>GST</span><strong>${fmtMoney(t.gst)}</strong></div>
        <div class="grand"><span>Grand total</span><strong>${fmtMoney(t.total)}</strong></div>
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

function TemplatesPanel({ user, templates, products, reloadTemplates }) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const canEdit = ["Admin", "Sales"].includes(user.role);
  const save = async (data) => {
    try {
      if (editing) await api.updateQuotationTemplate(editing.id, data);
      else await api.createQuotationTemplate(data);
      toast.success(editing ? "Default quotation updated" : "Default quotation saved");
      await reloadTemplates(); setEditing(null);
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); throw e; }
  };
  const del = async (t) => {
    if (!window.confirm(`Delete default quotation "${t.name}"?`)) return;
    try { await api.deleteQuotationTemplate(t.id); toast.success("Deleted"); await reloadTemplates(); }
    catch { toast.error("Delete failed"); }
  };
  return (
    <section className="panel table-panel">
      <div className="table-toolbar" style={{ justifyContent: "space-between" }}>
        <span className="muted-cell">Saved formats like "1 Ton Project" or "5 Ton Project" — pick one when creating a client quotation.</span>
        {canEdit && <button className="primary-btn" onClick={() => { setEditing(null); setShow(true); }} data-testid="template-create-button">
          <Plus size={17} /> New default quotation</button>}
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Name</th><th>Items</th><th>Discount</th><th>Grand total</th><th>Updated</th><th></th></tr></thead>
          <tbody>
            {templates.length === 0 && <tr><td colSpan="6"><Empty msg="No default quotations yet" /></td></tr>}
            {templates.map((t, i) => (
              <tr key={t.id} data-testid={`template-row-${i}`}>
                <td><strong>{t.name}</strong>{t.description && <div className="muted-cell">{t.description}</div>}</td>
                <td>{(t.items || []).length}</td>
                <td>{fmtMoney(t.discount)}</td>
                <td><strong>{fmtMoney(qtTotals(t.items, t.discount).total)}</strong></td>
                <td>{fmtDate(t.updated_at)}</td>
                <td className="row-actions">
                  {canEdit && <button className="icon-btn" onClick={() => { setEditing(t); setShow(true); }} data-testid={`template-edit-${i}`}><Pencil size={15} /></button>}
                  {canEdit && <button className="icon-btn danger" onClick={() => del(t)} data-testid={`template-delete-${i}`}><Trash2 size={15} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal show={show} onClose={() => { setShow(false); setEditing(null); }}
        title={editing ? `Edit ${editing.name}` : "New default quotation"} wide
        eyebrow="DEFAULT QUOTATION">
        <TemplateForm key={editing?.id || "new"} initial={editing} products={products}
          onSave={save} onClose={() => { setShow(false); setEditing(null); }} />
      </Modal>
    </section>
  );
}

function QuotationsPage({ user, quotations, clients, products, company, reload, initialClientId }) {
  const [show, setShow] = useState(!!initialClientId);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("list");
  const [templates, setTemplates] = useState([]);
  const reloadTemplates = async () => { try { setTemplates(await api.listQuotationTemplates()); } catch { setTemplates([]); } };
  useEffect(() => { reloadTemplates(); }, []);
  const filtered = quotations.filter(q => (q.number + " " + (q.client_name || "") + " " + (q.template_name || "")).toLowerCase().includes(query.toLowerCase()));
  const save = async (data) => {
    try {
      if (editing) await api.updateQuotation(editing.id, data);
      else await api.createQuotation(data);
      toast.success(editing ? "Updated" : "Quotation created");
      await reload(); setEditing(null);
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); throw e; }
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
      <div className="tabs">
        <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")} data-testid="quotations-list-tab">
          Client quotations <span>{quotations.length}</span></button>
        <button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")} data-testid="quotations-templates-tab">
          Default quotations <span>{templates.length}</span></button>
      </div>
      {tab === "templates" ? (
        <TemplatesPanel user={user} templates={templates} products={products} reloadTemplates={reloadTemplates} />
      ) : (
      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-wrap"><Search size={17} />
            <input placeholder="Search quotations..." value={query}
              onChange={e => setQuery(e.target.value)} data-testid="quotations-search-input" /></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Quotation</th><th>Client</th><th>Default used</th><th>Items</th><th>Created</th><th>Shared</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan="9"><Empty msg="No quotations yet" /></td></tr>}
              {filtered.map((q, i) => {
                const total = qtTotals(q.items, q.discount).total;
                return (
                  <tr key={q.id} data-testid={`quotations-row-${i}`}>
                    <td><strong className="mono">{q.number}</strong>
                      {q.synced_order_number && <span className="attention-chip synced" data-testid={`qt-synced-${i}`} title={`Linked to ${q.synced_order_number}`}>→ {q.synced_order_number}</span>}
                    </td>
                    <td><strong>{q.client_name}</strong>
                      {q.change_notes && <div className="muted-cell" title={q.change_notes}>Changes: {q.change_notes.length > 50 ? q.change_notes.slice(0, 50) + "…" : q.change_notes}</div>}</td>
                    <td>{q.template_name || "—"}</td>
                    <td>{q.items.length} item{q.items.length !== 1 ? "s" : ""}</td>
                    <td>{fmtDate(q.order_date)}</td>
                    <td>{q.shared_at ? fmtDate(q.shared_at) : "—"}</td>
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
      )}
      <Modal show={show} onClose={() => { setShow(false); setEditing(null); }}
        title={editing ? `Edit ${editing.number}` : "New quotation"} wide
        eyebrow={editing ? "EDIT QUOTATION" : "CREATE QUOTATION"}>
        <QuotationForm key={editing?.id || "new"} initial={editing} clients={clients} products={products} templates={templates}
          defaultClientId={initialClientId}
          onSave={save} onClose={() => { setShow(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}
