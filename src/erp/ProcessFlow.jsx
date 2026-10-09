// Step-by-step shop-floor process flow: each batch moves one step at a time; next step is chosen only when work is ready.
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, ArrowRight, Check, FileText, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { api, fmtDate } from "./api";

export const STEPS = ["CUTTING", "LASER CUTTING", "MACHINING", "BENDING", "HARDENING", "NITRIDING", "BLACKODISING"];
export const NEXT = {
  CUTTING: ["MACHINING", "LASER CUTTING", "SPARE IN", "FACTORY IN"],
  "LASER CUTTING": ["BENDING", "SPARE IN", "FACTORY IN"],
  MACHINING: ["HARDENING", "NITRIDING", "BLACKODISING", "SPARE IN", "FACTORY IN"],
  BENDING: ["SPARE IN", "FACTORY IN"],
  HARDENING: ["NITRIDING", "BLACKODISING", "SPARE IN", "FACTORY IN"],
  NITRIDING: ["BLACKODISING", "SPARE IN", "FACTORY IN"],
  BLACKODISING: ["SPARE IN", "FACTORY IN"],
};
const MACHINES = ["CNC", "VMC", "LATHE"];
const MM_PER_FT = 304.8;
const isRawConv = (it) => !!it && it.category === "Raw Material" && Number(it.kg_per_meter) > 0;
const toKg = (q, unit, kpm) => unit === "MM" ? (q / 1000) * kpm : unit === "FT" ? (q * MM_PER_FT / 1000) * kpm : q;
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v) => Number(v) || 0;
const run = async (q) => { const { data, error } = await q; if (error) throw new Error(error.message); return data; };
const errMsg = (e) => e?.response?.data?.detail || e?.message || "Something went wrong";

// Rough sheet estimate: how many parts fit on one sheet (grid, both orientations).
export const sheetsNeeded = (pl, pw, sl, sw, nos) => {
  pl = num(pl); pw = num(pw); sl = num(sl); sw = num(sw); nos = num(nos);
  if (!pl || !pw || !sl || !sw || !nos) return null;
  const per = Math.max(Math.floor(sl / pl) * Math.floor(sw / pw), Math.floor(sl / pw) * Math.floor(sw / pl));
  return per ? { per, sheets: Math.ceil(nos / per) } : { per: 0, sheets: null };
};

const BLANK = { part_name: "", step: "CUTTING", raw_item_id: "", spare_item_id: "", nos: "", size_mm: "", cut_l: "", cut_w: "", cut_h: "", sheet_mm: "", sheet_nos: "",
  issue_qty: "", issue_unit: "KG", vendor: "", notes: "", drawing_data: "", drawing_name: "", pl: "", pw: "", sl: "2500", sw: "1250" };

export default function ProcessFlow({ Modal, inventory, vendorList, reload }) {
  const [batches, setBatches] = useState([]);
  const [steps, setSteps] = useState([]);
  const [show, setShow] = useState(false);
  const [f, setF] = useState(BLANK);
  const [readyM, setReadyM] = useState(null);
  const [readyQty, setReadyQty] = useState("");
  const [fwd, setFwd] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editB, setEditB] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fout, setFout] = useState(null);

  const load = async () => {
    try {
      const [b, s] = await Promise.all([
        run(supabase.from("process_batches").select("*").order("created_at", { ascending: false }).limit(500)),
        run(supabase.from("process_steps").select("*").order("created_at", { ascending: true }).limit(2000)),
      ]);
      setBatches(b); setSteps(s);
    } catch (e) { toast.error(errMsg(e)); }
  };
  useEffect(() => { load(); }, []);

  const byId = (id) => inventory.find((x) => x.id === id);
  const batchOf = (id) => batches.find((b) => b.id === id);
  const vendorsFor = (step, machine) => {
    const keys = [step, machine].filter(Boolean).map((x) => x.toLowerCase().slice(0, 5));
    return vendorList.filter((v) => v.active !== false && keys.some((k) => `${v.services || ""} ${v.vendor_type || ""}`.toLowerCase().includes(k))).map((v) => v.name);
  };
  const raw = byId(f.raw_item_id);

  // auto-fill issue quantity from size × nos (cutting) or sheet nos (laser)
  const autoIssue = useMemo(() => {
    if (f.step === "CUTTING" && num(f.cut_l) && num(f.nos)) {
      const mm = num(f.cut_l) * num(f.nos);
      return isRawConv(raw) ? { qty: mm, unit: "MM" } : { qty: "", unit: raw?.unit || "" };
    }
    if (f.step === "LASER CUTTING" && num(f.sheet_nos)) return { qty: num(f.sheet_nos), unit: raw?.unit || "" };
    return null;
  }, [f.step, f.cut_l, f.nos, f.sheet_nos, raw]);
  const issueQty = f.issue_qty !== "" ? num(f.issue_qty) : num(autoIssue?.qty);
  const issueUnit = isRawConv(raw) ? (f.issue_qty !== "" ? f.issue_unit : autoIssue?.unit || f.issue_unit) : raw?.unit || "";
  const issueStock = isRawConv(raw) ? toKg(issueQty, issueUnit, num(raw.kg_per_meter)) : issueQty;
  const est = sheetsNeeded(f.pl, f.pw, f.sl, f.sw, f.nos);

  const onDrawing = (file) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Drawing must be under 3 MB");
    const r = new FileReader();
    r.onload = () => setF((s) => ({ ...s, drawing_data: r.result, drawing_name: file.name }));
    r.readAsDataURL(file);
  };

  const createBatch = async () => {
    if (!f.part_name.trim()) return toast.error("Part name required");
    if (!num(f.nos)) return toast.error("Nos required");
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const number = await run(supabase.rpc("next_doc_number", { _prefix: "PF" }));
      const batch = await run(supabase.from("process_batches").insert({
        number, part_name: f.part_name.trim(), raw_item_id: f.raw_item_id || null, spare_item_id: f.spare_item_id || null,
        total_nos: num(f.nos), drawing_data: f.drawing_data || null, drawing_name: f.drawing_name || null, notes: f.notes || null, created_by: auth.user?.id,
      }).select().single());
      if (raw && issueStock > 0) {
        await api.createInventoryTxn({ item_id: raw.id, txn_type: "OUT", quantity: r2(issueStock * 1000) / 1000, entry_unit: issueUnit, entry_qty: issueQty,
          reference_number: number, party: f.vendor, remarks: `Issued for ${f.step} – ${f.part_name}` });
      }
      await run(supabase.from("process_steps").insert({
        batch_id: batch.id, step: f.step, vendor: f.vendor || null, qty_sent: num(f.nos),
        size_mm: num(f.cut_l) || null, cut_l_mm: num(f.cut_l) || null, cut_w_mm: num(f.cut_w) || null, cut_h_mm: num(f.cut_h) || null,
        sheet_mm: num(f.sheet_mm) || null, sheet_nos: num(f.sheet_nos) || null, by_user: auth.user?.id,
      }));
      toast.success(`Batch ${number} started in ${f.step}`);
      setShow(false); setF(BLANK); await load(); reload?.();
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  };

  const openEdit = (b) => {
    const first = steps.find((s) => s.batch_id === b.id && !s.parent_step_id) || steps.find((s) => s.batch_id === b.id);
    setEditB({
      ...b, total_nos: String(num(b.total_nos)), raw_item_id: b.raw_item_id || "", spare_item_id: b.spare_item_id || "", notes: b.notes || "",
      step_id: first?.id || null, step: first?.step || "CUTTING", machine_type: first?.machine_type || "", vendor: first?.vendor || "",
      cut_l: first?.cut_l_mm ? String(first.cut_l_mm) : (first?.size_mm ? String(first.size_mm) : ""), cut_w: first?.cut_w_mm ? String(first.cut_w_mm) : "", cut_h: first?.cut_h_mm ? String(first.cut_h_mm) : "",
      size_mm: first?.size_mm ? String(first.size_mm) : "", sheet_mm: first?.sheet_mm ? String(first.sheet_mm) : "", sheet_nos: first?.sheet_nos ? String(first.sheet_nos) : "",
      new_drawing_data: "", new_drawing_name: "",
    });
  };

  const onEditDrawing = (file) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Drawing must be under 3 MB");
    const r = new FileReader();
    r.onload = () => setEditB((s) => ({ ...s, new_drawing_data: r.result, new_drawing_name: file.name }));
    r.readAsDataURL(file);
  };

  const saveBatchEdit = async () => {
    if (!editB) return;
    if (!editB.part_name.trim()) return toast.error("Part name required");
    if (!num(editB.total_nos)) return toast.error("Nos required");
    setBusy(true);
    try {
      await run(supabase.from("process_batches").update({
        part_name: editB.part_name.trim(), total_nos: num(editB.total_nos),
        raw_item_id: editB.raw_item_id || null, spare_item_id: editB.spare_item_id || null, notes: editB.notes || null,
        ...(editB.new_drawing_data ? { drawing_data: editB.new_drawing_data, drawing_name: editB.new_drawing_name } : {}),
      }).eq("id", editB.id));
      if (editB.step_id) {
        await run(supabase.from("process_steps").update({
          step: editB.step, machine_type: editB.step === "MACHINING" ? editB.machine_type || null : null,
          vendor: editB.vendor || null,
          size_mm: editB.step === "CUTTING" ? (num(editB.cut_l) || null) : (num(editB.size_mm) || null), cut_l_mm: num(editB.cut_l) || null, cut_w_mm: num(editB.cut_w) || null, cut_h_mm: num(editB.cut_h) || null,
          sheet_mm: num(editB.sheet_mm) || null, sheet_nos: num(editB.sheet_nos) || null,
        }).eq("id", editB.step_id));
      }
      toast.success(`Batch ${editB.number} updated`);
      setEditB(null); await load();
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  };

  const deleteBatch = async (b) => {
    if (!window.confirm(`Delete batch ${b.number} (${b.part_name})? All its steps will also be deleted.`)) return;
    setBusy(true);
    try {
      await run(supabase.from("process_steps").delete().eq("batch_id", b.id));
      await run(supabase.from("process_batches").delete().eq("id", b.id));
      toast.success(`Batch ${b.number} deleted`);
      setDetail(null); await load();
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  };

  const saveReady = async () => {
    const s = readyM; const add = num(readyQty);
    if (add <= 0) return toast.error("Enter ready nos");
    const total = num(s.qty_ready) + add;
    if (total > num(s.qty_sent)) return toast.error(`Only ${num(s.qty_sent) - num(s.qty_ready)} nos are in work`);
    try {
      await run(supabase.from("process_steps").update({ qty_ready: total }).eq("id", s.id));
      toast.success(`${add} nos ready in ${s.step}`); setReadyM(null); setReadyQty(""); load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const doForward = async () => {
    const s = fwd.step; const qty = num(fwd.qty); const avail = num(s.qty_ready) - num(s.qty_forwarded);
    if (!fwd.next) return toast.error("Choose next step");
    if (qty <= 0 || qty > avail) return toast.error(`You can send up to ${avail} nos`);
    if (fwd.next === "MACHINING" && !fwd.machine) return toast.error("Choose CNC / VMC / LATHE");
    const batch = batchOf(s.batch_id);
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const spare = fwd.next === "SPARE IN" || fwd.next === "FACTORY IN";
      if (spare) {
        if (!fwd.spare_item_id) throw new Error("Choose the item to stock in");
        await api.createInventoryTxn({ item_id: fwd.spare_item_id, txn_type: "IN", quantity: qty, reference_number: batch?.number,
          party: s.vendor, remarks: `${fwd.next} from ${s.step} – ${batch?.part_name || ""}` });
      }
      await run(supabase.from("process_steps").insert({
        batch_id: s.batch_id, parent_step_id: s.id, step: fwd.next, machine_type: fwd.next === "MACHINING" ? fwd.machine : null,
        vendor: fwd.vendor || null, qty_sent: qty, qty_ready: spare ? qty : 0, qty_forwarded: spare ? qty : 0,
        status: spare ? "Done" : "Open", finished_at: spare ? new Date().toISOString() : null, by_user: auth.user?.id,
      }));
      const fwdTotal = num(s.qty_forwarded) + qty;
      const done = fwdTotal >= num(s.qty_sent);
      await run(supabase.from("process_steps").update({ qty_forwarded: fwdTotal, status: done ? "Done" : "Open", finished_at: done ? new Date().toISOString() : null }).eq("id", s.id));
      if (spare && batch && !batch.spare_item_id) await run(supabase.from("process_batches").update({ spare_item_id: fwd.spare_item_id }).eq("id", batch.id));
      toast.success(spare ? `${qty} nos added to stock (${fwd.next})` : `${qty} nos sent to ${fwd.next}`);
      setFwd(null); await load(); if (spare) reload?.();
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  };

  const doFactoryOut = async () => {
    const qty = num(fout.qty);
    if (!fout.item_id) return toast.error("Choose the item");
    if (qty <= 0) return toast.error("Enter nos");
    setBusy(true);
    try {
      await api.createInventoryTxn({ item_id: fout.item_id, txn_type: "OUT", quantity: qty, party: fout.machine || null,
        remarks: `Factory out${fout.machine ? ` – used in machine: ${fout.machine}` : ""}${fout.notes ? ` – ${fout.notes}` : ""}` });
      toast.success(`${qty} nos taken out from factory`);
      setFout(null); reload?.();
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  };

  const open = steps.filter((s) => s.status === "Open");
  const spareDone = steps.filter((s) => s.step === "SPARE IN");
  const label = (s) => s.step === "MACHINING" && s.machine_type ? `MACHINING · ${s.machine_type}` : s.step;
  const fwdVendors = fwd ? vendorsFor(fwd.next, fwd.machine) : [];

  return (
    <div data-testid="process-flow">
      <div className="pf-toolbar">
        <p className="subheading">Each batch moves one step at a time — choose the next step only when work is ready.</p>
        <div style={{ display: "flex", gap: 8 }}><button className="ghost-btn" onClick={() => setFout({ item_id: "", qty: "", machine: "", notes: "" })} data-testid="pf-factory-out">Factory out</button>
        <button className="primary-btn" onClick={() => { setF(BLANK); setShow(true); }} data-testid="pf-new-batch"><Plus size={17} /> New batch</button></div>
      </div>

      <div className="pf-board" data-testid="pf-board">
        {STEPS.map((st) => {
          const cards = open.filter((s) => s.step === st);
          const inWork = cards.reduce((a, s) => a + num(s.qty_sent) - num(s.qty_ready), 0);
          const ready = cards.reduce((a, s) => a + num(s.qty_ready) - num(s.qty_forwarded), 0);
          return (
            <div className="pf-col" key={st} data-testid={`pf-col-${st}`}>
              <div className="pf-col-head"><strong>{st}</strong><span>{inWork} in work · {ready} ready</span></div>
              {cards.length === 0 && <p className="table-sub">—</p>}
              {cards.map((s) => {
                const b = batchOf(s.batch_id); const avail = num(s.qty_ready) - num(s.qty_forwarded);
                return (
                  <div className="pf-card" key={s.id} data-testid={`pf-card-${s.id}`}>
                    <button className="text-btn" onClick={() => setDetail(b)}>{b?.number}</button>
                    <div className="pf-part">{b?.part_name}</div>
                    {(s.machine_type || s.vendor) && <div className="table-sub">{[s.machine_type, s.vendor].filter(Boolean).join(" · ")}</div>}
                    {(s.cut_l_mm || s.cut_w_mm || s.cut_h_mm || s.size_mm) && <div className="table-sub">Size {[s.cut_l_mm || s.size_mm, s.cut_w_mm, s.cut_h_mm].filter(Boolean).join(" × ")} MM</div>}
                    {s.sheet_nos && <div className="table-sub">{s.sheet_nos} sheet · {s.sheet_mm || "?"} MM</div>}
                    <div className="pf-qty"><span>In work {num(s.qty_sent) - num(s.qty_ready)}</span><span className="green-text">Ready {avail}</span></div>
                    <div className="pf-actions">
                      {num(s.qty_ready) < num(s.qty_sent) && <button className="ghost-btn" onClick={() => { setReadyM(s); setReadyQty(String(num(s.qty_sent) - num(s.qty_ready))); }} data-testid="pf-ready-btn"><Check size={14} /> Ready</button>}
                      {avail > 0 && <button className="primary-btn" onClick={() => setFwd({ step: s, next: NEXT[s.step][0], qty: String(avail), machine: "", vendor: "", spare_item_id: b?.spare_item_id || "" })} data-testid="pf-forward-btn">Forward <ArrowRight size={14} /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <section className="panel table-panel">
        <div className="table-scroll"><table>
          <thead><tr><th>Batch</th><th>Part</th><th>Nos</th><th>Flow</th><th>Spare in</th><th>Started</th><th></th></tr></thead>
          <tbody>
            {batches.length === 0 && <tr><td colSpan="7"><p className="table-sub">No batches yet</p></td></tr>}
            {batches.map((b) => {
              const bs = steps.filter((s) => s.batch_id === b.id);
              const sp = bs.filter((s) => s.step === "SPARE IN").reduce((a, s) => a + num(s.qty_sent), 0);
              return (
                <tr key={b.id} onClick={() => setDetail(b)} style={{ cursor: "pointer" }} data-testid={`pf-batch-${b.number}`}>
                  <td><strong>{b.number}</strong></td><td>{b.part_name}</td><td>{num(b.total_nos)}</td>
                  <td className="table-sub">{[...new Set(bs.map(label))].join(" → ")}</td>
                  <td className={sp >= num(b.total_nos) ? "green-text" : ""}>{sp} / {num(b.total_nos)}</td>
                  <td>{fmtDate(b.created_at)}</td>
                  <td>
                    <button className="ghost-btn" data-testid={`pf-edit-${b.number}`} onClick={(e) => { e.stopPropagation(); openEdit(b); }}><Pencil size={14} /> Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </section>
      {spareDone.length > 0 && <p className="table-sub">Total spare in so far: {spareDone.reduce((a, s) => a + num(s.qty_sent), 0)} nos</p>}

      <Modal show={show} onClose={() => setShow(false)} title="Start new batch" eyebrow="PROCESS FLOW" wide>
        <div className="form-grid">
          <div className="form-row-2">
            <div><label className="field-label">Part name *</label><input value={f.part_name} onChange={(e) => setF({ ...f, part_name: e.target.value })} data-testid="pf-part" /></div>
            <div><label className="field-label">First step</label>
              <select value={f.step} onChange={(e) => setF({ ...f, step: e.target.value })} data-testid="pf-step">
                <option>CUTTING</option><option>LASER CUTTING</option></select></div>
          </div>
          <div className="form-row-2">
            <div><label className="field-label">Raw material (stock out)</label>
              <select value={f.raw_item_id} onChange={(e) => setF({ ...f, raw_item_id: e.target.value, issue_qty: "" })} data-testid="pf-raw">
                <option value="">— none —</option>
                {inventory.filter((i) => i.category === "Raw Material").map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name} ({r2(i.current_stock)} {i.unit})</option>)}
              </select></div>
            <div><label className="field-label">Nos (parts) *</label><input type="number" value={f.nos} onChange={(e) => setF({ ...f, nos: e.target.value })} data-testid="pf-nos" /></div>
          </div>
          {f.step === "CUTTING" ? (
            <div className="form-row-3">
              <div><label className="field-label">Length (MM)</label><input type="number" value={f.cut_l} onChange={(e) => setF({ ...f, cut_l: e.target.value })} data-testid="pf-cut-l" /></div>
              <div><label className="field-label">Width (MM)</label><input type="number" value={f.cut_w} onChange={(e) => setF({ ...f, cut_w: e.target.value })} data-testid="pf-cut-w" /></div>
              <div><label className="field-label">Height (MM)</label><input type="number" value={f.cut_h} onChange={(e) => setF({ ...f, cut_h: e.target.value })} data-testid="pf-cut-h" /></div>
            </div>
          ) : (
            <>
              <div className="form-row-2">
                <div><label className="field-label">Sheet thickness (MM)</label><input type="number" value={f.sheet_mm} onChange={(e) => setF({ ...f, sheet_mm: e.target.value })} data-testid="pf-sheet-mm" /></div>
                <div><label className="field-label">Sheets used (nos)</label><input type="number" value={f.sheet_nos} onChange={(e) => setF({ ...f, sheet_nos: e.target.value })} data-testid="pf-sheet-nos" /></div>
              </div>
              <div className="pf-est">
                <span className="field-label">Sheet estimate (optional)</span>
                <div className="form-row-3">
                  <input type="number" placeholder="Part L (MM)" value={f.pl} onChange={(e) => setF({ ...f, pl: e.target.value })} />
                  <input type="number" placeholder="Part W (MM)" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} />
                  <span />
                  <input type="number" placeholder="Sheet L (MM)" value={f.sl} onChange={(e) => setF({ ...f, sl: e.target.value })} />
                  <input type="number" placeholder="Sheet W (MM)" value={f.sw} onChange={(e) => setF({ ...f, sw: e.target.value })} />
                </div>
                {est && <p className="table-sub" data-testid="pf-est">{est.per ? <>~{est.per} parts per sheet → <strong>{est.sheets} sheets</strong> needed <button className="text-btn" onClick={() => setF({ ...f, sheet_nos: String(est.sheets) })}>use</button></> : "Part bigger than sheet"}</p>}
              </div>
            </>
          )}
          <div><label className="field-label">Drawing (photo / PDF)</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => onDrawing(e.target.files?.[0])} data-testid="pf-drawing" />
            {f.drawing_name && <span className="table-sub">{f.drawing_name}</span>}</div>
          {raw && (
            <div className="form-row-2">
              <div><label className="field-label">Stock out quantity</label>
                <input type="number" value={f.issue_qty !== "" ? f.issue_qty : autoIssue?.qty ?? ""} onChange={(e) => setF({ ...f, issue_qty: e.target.value, issue_unit: issueUnit || "KG" })} data-testid="pf-issue" /></div>
              <div><label className="field-label">Unit</label>
                {isRawConv(raw) ? <select value={issueUnit} onChange={(e) => setF({ ...f, issue_qty: String(issueQty), issue_unit: e.target.value })}><option>KG</option><option>FT</option><option>MM</option></select>
                  : <input value={raw.unit} disabled />}</div>
            </div>
          )}
          {raw && issueStock > 0 && <p className="table-sub" data-testid="pf-issue-preview">Stock out: <strong>{r2(issueStock)} {raw.unit}</strong> (in stock {r2(raw.current_stock)})</p>}
          <div className="form-row-2">
            <div><label className="field-label">Vendor / in-house</label><input list="pf-vendors-new" value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} />
              <datalist id="pf-vendors-new">{vendorsFor(f.step).concat(vendorList.map((v) => v.name)).filter((v, i, a) => a.indexOf(v) === i).map((v) => <option key={v} value={v} />)}</datalist></div>
            <div><label className="field-label">Final spare item (for spare in)</label>
              <select value={f.spare_item_id} onChange={(e) => setF({ ...f, spare_item_id: e.target.value })} data-testid="pf-spare">
                <option value="">— choose later —</option>
                {inventory.filter((i) => i.category !== "Raw Material").map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}
              </select></div>
          </div>
          <div><label className="field-label">Notes</label><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <button className="primary-btn full-btn" disabled={busy} onClick={createBatch} data-testid="pf-save"><Check size={17} /> Start batch</button>
        </div>
      </Modal>

      <Modal show={!!fout} onClose={() => setFout(null)} title="Factory out" eyebrow="PROCESS FLOW">
        {fout && <div className="form-grid">
          <div><label className="field-label">Item</label>
            <select value={fout.item_id} onChange={(e) => setFout({ ...fout, item_id: e.target.value })} data-testid="pf-fout-item">
              <option value="">— choose —</option>
              {inventory.filter((i) => i.category !== "Raw Material").map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name} ({num(i.current_stock)} in stock)</option>)}
            </select></div>
          <div><label className="field-label">Nos</label><input type="number" value={fout.qty} onChange={(e) => setFout({ ...fout, qty: e.target.value })} data-testid="pf-fout-qty" /></div>
          <div><label className="field-label">Used in which machine (record only)</label><input value={fout.machine} onChange={(e) => setFout({ ...fout, machine: e.target.value })} placeholder="e.g. SM 1200 Cashew Machine" data-testid="pf-fout-machine" /></div>
          <div><label className="field-label">Notes</label><input value={fout.notes} onChange={(e) => setFout({ ...fout, notes: e.target.value })} /></div>
          <button className="primary-btn full-btn" disabled={busy} onClick={doFactoryOut} data-testid="pf-fout-save">Save</button>
        </div>}
      </Modal>

      <Modal show={!!readyM} onClose={() => setReadyM(null)} title={`Ready in ${readyM?.step || ""}`} eyebrow="PROCESS FLOW">
        <div className="form-grid">
          <div><label className="field-label">How many nos are ready?</label><input type="number" value={readyQty} onChange={(e) => setReadyQty(e.target.value)} data-testid="pf-ready-qty" /></div>
          <button className="primary-btn full-btn" onClick={saveReady} data-testid="pf-ready-save"><Check size={17} /> Save</button>
        </div>
      </Modal>

      <Modal show={!!fwd} onClose={() => setFwd(null)} title={`From ${fwd ? label(fwd.step) : ""} — send forward`} eyebrow="PROCESS FLOW">
        {fwd && <div className="form-grid">
          <div><label className="field-label">Next step</label>
            <div className="pf-choices">{NEXT[fwd.step.step].map((n) => (
              <button key={n} className={fwd.next === n ? "primary-btn" : "ghost-btn"} onClick={() => setFwd({ ...fwd, next: n })} data-testid={`pf-next-${n}`}>{n}</button>))}</div></div>
          {fwd.next === "MACHINING" && <div><label className="field-label">Machine</label>
            <div className="pf-choices">{MACHINES.map((m) => (
              <button key={m} className={fwd.machine === m ? "primary-btn" : "ghost-btn"} onClick={() => setFwd({ ...fwd, machine: m })} data-testid={`pf-machine-${m}`}>{m}</button>))}</div></div>}
          <div><label className="field-label">Nos (max {num(fwd.step.qty_ready) - num(fwd.step.qty_forwarded)})</label>
            <input type="number" value={fwd.qty} onChange={(e) => setFwd({ ...fwd, qty: e.target.value })} data-testid="pf-fwd-qty" /></div>
          {(fwd.next === "SPARE IN" || fwd.next === "FACTORY IN") ? (
            <div><label className="field-label">{fwd.next === "FACTORY IN" ? "Factory item (stock in)" : "Spare item (stock in)"}</label>
              <select value={fwd.spare_item_id} onChange={(e) => setFwd({ ...fwd, spare_item_id: e.target.value })} data-testid="pf-fwd-spare">
                <option value="">— choose —</option>
                {inventory.filter((i) => i.category !== "Raw Material").map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}
              </select></div>
          ) : (
            <div><label className="field-label">Vendor / in-house</label>
              <input list="pf-vendors-fwd" value={fwd.vendor} onChange={(e) => setFwd({ ...fwd, vendor: e.target.value })} data-testid="pf-fwd-vendor" />
              <datalist id="pf-vendors-fwd">{fwdVendors.concat(vendorList.map((v) => v.name)).filter((v, i, a) => a.indexOf(v) === i).map((v) => <option key={v} value={v} />)}</datalist>
              {fwdVendors.length > 0 && <span className="table-sub">Suggested: {fwdVendors.join(", ")}</span>}</div>
          )}
          <button className="primary-btn full-btn" disabled={busy} onClick={doForward} data-testid="pf-fwd-save"><ArrowRight size={17} /> Send</button>
        </div>}
      </Modal>

      <Modal show={!!editB} onClose={() => setEditB(null)} title={editB ? `Edit batch ${editB.number}` : ""} eyebrow="PROCESS FLOW">
        {editB && <div className="form-grid">
          <div className="form-row-2">
            <div><label className="field-label">Part name *</label><input value={editB.part_name} onChange={(e) => setEditB({ ...editB, part_name: e.target.value })} data-testid="pf-edit-part" /></div>
            <div><label className="field-label">Nos (total) *</label><input type="number" value={editB.total_nos} onChange={(e) => setEditB({ ...editB, total_nos: e.target.value })} data-testid="pf-edit-nos" /></div>
          </div>
          <div className="form-row-2">
            <div><label className="field-label">Raw material</label>
              <select value={editB.raw_item_id} onChange={(e) => setEditB({ ...editB, raw_item_id: e.target.value })} data-testid="pf-edit-raw">
                <option value="">— none —</option>
                {inventory.filter((i) => i.category === "Raw Material").map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}
              </select></div>
            <div><label className="field-label">Final spare item</label>
              <select value={editB.spare_item_id} onChange={(e) => setEditB({ ...editB, spare_item_id: e.target.value })} data-testid="pf-edit-spare">
                <option value="">— choose later —</option>
                {inventory.filter((i) => i.category !== "Raw Material").map((i) => <option key={i.id} value={i.id}>{i.sku} · {i.name}</option>)}
              </select></div>
          </div>
          <div className="form-row-2">
            <div><label className="field-label">First step</label>
              <select value={editB.step} onChange={(e) => setEditB({ ...editB, step: e.target.value })} data-testid="pf-edit-step">
                <option>CUTTING</option><option>LASER CUTTING</option><option>MACHINING</option></select></div>
            {editB.step === "MACHINING" ? (
              <div><label className="field-label">Machine</label>
                <select value={editB.machine_type} onChange={(e) => setEditB({ ...editB, machine_type: e.target.value })} data-testid="pf-edit-machine">
                  <option value="">— choose —</option>{MACHINES.map((m) => <option key={m}>{m}</option>)}</select></div>
            ) : (
              <div><label className="field-label">Vendor / in-house</label>
                <input list="pf-vendors-edit" value={editB.vendor} onChange={(e) => setEditB({ ...editB, vendor: e.target.value })} data-testid="pf-edit-vendor" />
                <datalist id="pf-vendors-edit">{vendorsFor(editB.step, editB.machine_type).concat(vendorList.map((v) => v.name)).filter((v, i, a) => a.indexOf(v) === i).map((v) => <option key={v} value={v} />)}</datalist></div>
            )}
          </div>
          {editB.step === "MACHINING" && (
            <div><label className="field-label">Vendor / in-house</label>
              <input list="pf-vendors-edit" value={editB.vendor} onChange={(e) => setEditB({ ...editB, vendor: e.target.value })} data-testid="pf-edit-vendor2" /></div>
          )}
          {editB.step === "CUTTING" ? (
            <div className="form-row-3">
              <div><label className="field-label">Length (MM)</label><input type="number" value={editB.cut_l} onChange={(e) => setEditB({ ...editB, cut_l: e.target.value })} data-testid="pf-edit-cut-l" /></div>
              <div><label className="field-label">Width (MM)</label><input type="number" value={editB.cut_w} onChange={(e) => setEditB({ ...editB, cut_w: e.target.value })} data-testid="pf-edit-cut-w" /></div>
              <div><label className="field-label">Height (MM)</label><input type="number" value={editB.cut_h} onChange={(e) => setEditB({ ...editB, cut_h: e.target.value })} data-testid="pf-edit-cut-h" /></div>
            </div>
          ) : editB.step === "MACHINING" ? (
            <div><label className="field-label">Cut size per piece (MM)</label><input type="number" value={editB.size_mm} onChange={(e) => setEditB({ ...editB, size_mm: e.target.value })} data-testid="pf-edit-size" /></div>
          ) : (
            <div className="form-row-2">
              <div><label className="field-label">Sheet thickness (MM)</label><input type="number" value={editB.sheet_mm} onChange={(e) => setEditB({ ...editB, sheet_mm: e.target.value })} data-testid="pf-edit-sheet-mm" /></div>
              <div><label className="field-label">Sheets used (nos)</label><input type="number" value={editB.sheet_nos} onChange={(e) => setEditB({ ...editB, sheet_nos: e.target.value })} data-testid="pf-edit-sheet-nos" /></div>
            </div>
          )}
          <div><label className="field-label">Drawing (photo / PDF){editB.drawing_name ? ` — current: ${editB.drawing_name}` : ""}</label>
            <input type="file" accept="image/*,application/pdf" onChange={(e) => onEditDrawing(e.target.files?.[0])} data-testid="pf-edit-drawing" />
            {editB.new_drawing_name && <span className="table-sub">New: {editB.new_drawing_name}</span>}</div>
          <div><label className="field-label">Notes</label><input value={editB.notes} onChange={(e) => setEditB({ ...editB, notes: e.target.value })} data-testid="pf-edit-notes" /></div>
          <button className="primary-btn full-btn" disabled={busy} onClick={saveBatchEdit} data-testid="pf-edit-save"><Check size={17} /> Save changes</button>
        </div>}
      </Modal>

      <Modal show={!!detail} onClose={() => setDetail(null)} title={detail ? `${detail.number} · ${detail.part_name}` : ""} eyebrow="BATCH HISTORY" wide>
        {detail && <div className="form-grid">
          <div className="pf-actions">
            <button className="ghost-btn" onClick={() => openEdit(detail)} data-testid="pf-detail-edit"><Pencil size={14} /> Edit batch</button>
            <button className="ghost-btn" disabled={busy} onClick={() => deleteBatch(detail)} data-testid="pf-detail-delete"><Trash2 size={14} /> Delete batch</button>
          </div>
          <p className="table-sub">Total {num(detail.total_nos)} nos{detail.raw_item_id && byId(detail.raw_item_id) ? ` · Raw: ${byId(detail.raw_item_id).name}` : ""}{detail.notes ? ` · ${detail.notes}` : ""}</p>
          {detail.drawing_data && <a className="text-btn" href={detail.drawing_data} download={detail.drawing_name || "drawing"} target="_blank" rel="noreferrer"><FileText size={15} /> {detail.drawing_name || "Drawing"}</a>}
          <table><thead><tr><th>Step</th><th>Vendor</th><th>Sent</th><th>Ready</th><th>Forwarded</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{steps.filter((s) => s.batch_id === detail.id).map((s) => (
              <tr key={s.id}><td>{label(s)}</td><td>{s.vendor || "—"}</td><td>{num(s.qty_sent)}</td><td>{num(s.qty_ready)}</td><td>{num(s.qty_forwarded)}</td>
                <td>{s.status}</td><td>{fmtDate(s.started_at)}</td></tr>))}</tbody></table>
        </div>}
      </Modal>
    </div>
  );
}
