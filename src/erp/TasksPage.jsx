import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Check, Pencil, Trash2, Star, ListChecks } from "lucide-react";
import { api, fmtDate, fmtDateTime } from "./api";

const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const TONE = { Assigned: "gray", Accepted: "blue", "In Progress": "orange", Finished: "green", Low: "gray", Normal: "blue", High: "orange", Urgent: "red" };

const Pill = ({ children }) => <span className={`badge badge-${TONE[children] || "neutral"}`}>{children}</span>;
const Stars = ({ v }) => (
  <span className="task-stars" title={`${v || 0}/5`}>
    {[1, 2, 3, 4, 5].map(n => <Star key={n} size={14} fill={n <= (v || 0) ? "currentColor" : "none"} />)}
  </span>
);
const Box = ({ title, onClose, children }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-head"><div><p className="eyebrow">TASK</p><h3>{title}</h3></div>
        <button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
      {children}
    </div>
  </div>
);

export const durationText = (from, to) => {
  if (!from || !to) return "—";
  const ms = new Date(to) - new Date(from);
  const h = Math.max(0, Math.round(ms / 3600000));
  if (h < 24) return `${h} hr`;
  const d = Math.floor(h / 24), r = h % 24;
  return r ? `${d} day ${r} hr` : `${d} day`;
};
const dueDate = (t) => t.due_at ? new Date(t.due_at.length <= 10 ? t.due_at + "T23:59:59" : t.due_at) : null;
export const isLate = (t) => { const d = dueDate(t); return !!d && (t.finished_at ? new Date(t.finished_at) > d : new Date() > d); };
const lastProgress = (t) => (t.updates || []).length ? t.updates[t.updates.length - 1].progress || 0 : 0;

export default function TasksPage({ user, users, tasks, reload }) {
  const isAdmin = user.role === "Admin";
  const [tab, setTab] = useState("mine");
  const [form, setForm] = useState(null);
  const [upd, setUpd] = useState(null);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(false);
  const nameOf = (id) => users.find(u => u.id === id)?.name || "—";
  const team = users.filter(u => u.active !== false);

  const mine = tasks.filter(t => t.assigned_to === user.id && t.status !== "Finished");
  const given = tasks.filter(t => t.assigned_by === user.id && t.status !== "Finished");
  const all = tasks.filter(t => t.status !== "Finished");
  const history = tasks.filter(t => t.status === "Finished").sort((a, b) => (b.finished_at || "").localeCompare(a.finished_at || ""));
  const rows = tab === "mine" ? mine : tab === "given" ? given : tab === "all" ? all : tab === "history" ? history : [];

  const ratings = useMemo(() => {
    const m = {};
    tasks.filter(t => t.status === "Finished" && t.rating).forEach(t => {
      m[t.assigned_to] = m[t.assigned_to] || { sum: 0, n: 0, late: 0 };
      m[t.assigned_to].sum += t.rating; m[t.assigned_to].n++; if (isLate(t)) m[t.assigned_to].late++;
    });
    return Object.entries(m).map(([id, r]) => ({ id, name: nameOf(id), avg: r.sum / r.n, n: r.n, late: r.late })).sort((a, b) => b.avg - a.avg);
  }, [tasks, users]);

  const act = async (fn, msg) => {
    setBusy(true);
    try { await fn(); toast.success(msg); await reload(); return true; }
    catch (e) { toast.error(e.message || "Something went wrong"); return false; }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!form.title?.trim() || !form.assigned_to) return toast.error("Task title and team member are required");
    const ok = await act(() => form.id ? api.editTask(form.id, form) : api.createTask(form), form.id ? "Task updated" : "Task assigned");
    if (ok) setForm(null);
  };
  const saveUpdate = async () => {
    if (!upd.note?.trim()) return toast.error("Write a work update");
    const ok = await act(() => upd.finish ? api.finishTask(upd.task, upd.note) : api.addTaskUpdate(upd.task, upd.note, upd.progress), upd.finish ? "Task finished" : "Update saved");
    if (ok) setUpd(null);
  };

  return (
    <div className="page-content" data-testid="page-tasks">
      <div className="page-heading">
        <div><p className="eyebrow">TEAM WORK</p><h1>Tasks</h1>
          <p className="subheading">Assign work to the team, track progress and finish time.</p></div>
        <div className="heading-actions">
          <button className="primary-btn" onClick={() => setForm({ title: "", description: "", priority: "Normal", assigned_to: "", due_at: "" })} data-testid="task-new-button"><Plus size={17} /> Assign task</button>
        </div>
      </div>

      <div className="follow-summary">
        <div className="summary-box orange"><span>My tasks</span><strong>{String(mine.length).padStart(2, "0")}</strong><small>open</small></div>
        <div className="summary-box blue"><span>Waiting to accept</span><strong>{String(mine.filter(t => t.status === "Assigned").length).padStart(2, "0")}</strong><small>assigned to me</small></div>
        <div className="summary-box red"><span>Late</span><strong>{String((isAdmin ? all : [...mine, ...given]).filter(isLate).length).padStart(2, "0")}</strong><small>past due date</small></div>
        <div className="summary-box green"><span>Finished</span><strong>{String(history.length).padStart(2, "0")}</strong><small>in history</small></div>
      </div>

      <div className="tabs">
        <button className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")} data-testid="task-tab-mine">My tasks <span>{mine.length}</span></button>
        <button className={tab === "given" ? "active" : ""} onClick={() => setTab("given")} data-testid="task-tab-given">Assigned by me <span>{given.length}</span></button>
        {isAdmin && <button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>All open <span>{all.length}</span></button>}
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")} data-testid="task-tab-history">Finished history <span>{history.length}</span></button>
        <button className={tab === "rating" ? "active" : ""} onClick={() => setTab("rating")} data-testid="task-tab-rating">Team rating</button>
      </div>

      <section className="panel">
        {tab === "rating" ? (
          <div className="table-scroll"><table>
            <thead><tr><th>Team member</th><th>Rating</th><th>Finished tasks</th><th>Finished late</th></tr></thead>
            <tbody>
              {ratings.length === 0 && <tr><td colSpan="4"><div className="empty-state"><ListChecks size={28} /><p>No finished tasks yet</p></div></td></tr>}
              {ratings.map(r => <tr key={r.id}><td><strong>{r.name}</strong></td><td><Stars v={Math.round(r.avg)} /> {r.avg.toFixed(1)}</td><td>{r.n}</td><td>{r.late}</td></tr>)}
            </tbody>
          </table>
          <p className="task-note">Rating is given automatically when a task finishes: on time = 5★, up to 1 day late = 4★, up to 3 days = 3★, up to 7 days = 2★, later = 1★. The person who assigned it can change the rating.</p></div>
        ) : (
          <div className="table-scroll"><table>
            <thead><tr><th>Task</th><th>Assigned to</th><th>Assigned by</th><th>Priority</th><th>Due</th><th>{tab === "history" ? "Time taken" : "Progress"}</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan="8"><div className="empty-state"><ListChecks size={28} /><p>No tasks here</p></div></td></tr>}
              {rows.map((t, i) => {
                const toMe = t.assigned_to === user.id, byMe = t.assigned_by === user.id;
                return (
                  <tr key={t.id} data-testid={`task-row-${i}`}>
                    <td><button className="task-link" onClick={() => setView(t)}><strong>{t.title}</strong></button><small className="task-sub">{t.number}</small></td>
                    <td>{nameOf(t.assigned_to)}</td>
                    <td>{nameOf(t.assigned_by)}</td>
                    <td><Pill>{t.priority}</Pill></td>
                    <td className={isLate(t) ? "task-late" : ""}>{t.due_at ? fmtDate(t.due_at) : "—"}{isLate(t) && <small className="task-sub">Late</small>}</td>
                    <td>{tab === "history"
                      ? <>{durationText(t.created_at, t.finished_at)}<small className="task-sub">from assign · {durationText(t.accepted_at, t.finished_at)} after accept</small></>
                      : <div className="task-progress"><i style={{ width: `${lastProgress(t)}%` }} /><span>{lastProgress(t)}%</span></div>}</td>
                    <td>{tab === "history" ? <Stars v={t.rating} /> : <Pill>{t.status}</Pill>}</td>
                    <td className="task-actions">
                      {toMe && t.status === "Assigned" && <button className="primary-btn small" disabled={busy} onClick={() => act(() => api.acceptTask(t), "Task accepted")} data-testid={`task-accept-${i}`}><Check size={15} /> Accept</button>}
                      {toMe && (t.status === "Accepted" || t.status === "In Progress") && <>
                        <button className="ghost-btn small" onClick={() => setUpd({ task: t, note: "", progress: lastProgress(t), finish: false })} data-testid={`task-update-${i}`}>Update</button>
                        <button className="primary-btn small" onClick={() => setUpd({ task: t, note: "", progress: 100, finish: true })} data-testid={`task-finish-${i}`}><Check size={15} /> Finish</button>
                      </>}
                      {(byMe || isAdmin) && t.status !== "Finished" && <button className="icon-btn" title="Edit" onClick={() => setForm({ ...t, due_at: t.due_at || "" })}><Pencil size={15} /></button>}
                      {(byMe || isAdmin) && <button className="icon-btn" title="Delete" onClick={() => window.confirm("Delete this task?") && act(() => api.deleteTask(t.id), "Task deleted")}><Trash2 size={15} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </section>

      {form && <Box title={form.id ? `Edit ${form.number}` : "Assign a task"} onClose={() => setForm(null)}>
        <div className="form-grid">
          <div><label className="field-label">Task title *</label><input autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} data-testid="task-form-title" /></div>
          <div><label className="field-label">Details</label><textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} data-testid="task-form-description" /></div>
          <div className="form-row-3">
            <div><label className="field-label">Team member *</label>
              <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} data-testid="task-form-assignee">
                <option value="">Select…</option>{team.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select></div>
            <div><label className="field-label">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label className="field-label">Due date</label><input type="date" value={(form.due_at || "").slice(0, 10)} onChange={e => setForm({ ...form, due_at: e.target.value })} data-testid="task-form-due" /></div>
          </div>
          <div className="heading-actions"><button className="ghost-btn" onClick={() => setForm(null)}>Cancel</button>
            <button className="primary-btn" disabled={busy} onClick={save} data-testid="task-form-save">{form.id ? "Save" : "Assign task"}</button></div>
        </div>
      </Box>}

      {upd && <Box title={upd.finish ? `Finish · ${upd.task.title}` : `Work update · ${upd.task.title}`} onClose={() => setUpd(null)}>
        <div className="form-grid">
          <div><label className="field-label">{upd.finish ? "Final note *" : "What work was done? *"}</label>
            <textarea autoFocus value={upd.note} onChange={e => setUpd({ ...upd, note: e.target.value })} data-testid="task-update-note" /></div>
          {!upd.finish && <div><label className="field-label">Progress: {upd.progress}%</label>
            <input type="range" min="0" max="99" step="5" value={upd.progress} onChange={e => setUpd({ ...upd, progress: e.target.value })} /></div>}
          <div className="heading-actions"><button className="ghost-btn" onClick={() => setUpd(null)}>Cancel</button>
            <button className="primary-btn" disabled={busy} onClick={saveUpdate} data-testid="task-update-save">{upd.finish ? "Mark finished" : "Save update"}</button></div>
        </div>
      </Box>}

      {view && <Box title={`${view.number} · ${view.title}`} onClose={() => setView(null)}>
        <div className="form-grid">
          {view.description && <p>{view.description}</p>}
          <div className="task-meta">
            <span>To: <strong>{nameOf(view.assigned_to)}</strong></span><span>By: <strong>{nameOf(view.assigned_by)}</strong></span>
            <span>Assigned: <strong>{fmtDateTime(view.created_at)}</strong></span>
            {view.accepted_at && <span>Accepted: <strong>{fmtDateTime(view.accepted_at)}</strong></span>}
            {view.finished_at && <span>Finished: <strong>{fmtDateTime(view.finished_at)}</strong></span>}
            {view.finished_at && <span>Time taken: <strong>{durationText(view.created_at, view.finished_at)}</strong></span>}
          </div>
          {view.status === "Finished" && (view.assigned_by === user.id || isAdmin) && (
            <div><label className="field-label">Rating</label>
              <select value={view.rating || 5} onChange={async e => { const r = Number(e.target.value); if (await act(() => api.editTask(view.id, { rating: r }), "Rating saved")) setView({ ...view, rating: r }); }} data-testid="task-rating-select">
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
              </select></div>
          )}
          <label className="field-label">Work updates</label>
          {(view.updates || []).length === 0 && <p className="task-sub">No updates yet</p>}
          <div className="task-log">
            {(view.updates || []).slice().reverse().map((u, i) => (
              <div key={i}><time>{fmtDateTime(u.at)} · {u.by_name} · {u.progress}%</time><p>{u.note}</p></div>
            ))}
          </div>
        </div>
      </Box>}
    </div>
  );
}
