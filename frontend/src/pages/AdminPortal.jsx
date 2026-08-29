import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, LogOut, Loader2, X, Check, ExternalLink, TriangleAlert, CheckCircle2, Timer, XCircle, UserCheck, MapPin, Building2, HardHat, Clock } from "lucide-react";
import { toast } from "sonner";
import { fetchAdminIssues, fetchAdminMetrics, adminUpdateStatus, adminUpdateCategory, adminAssign, fetchContractors, fetchAdminRequests, approveAdmin, rejectAdmin, adminProfile, buildPhotoUrl } from "@/lib/api";
import { CATEGORIES, STATUS, TIMELINE_STEPS, categoryOf } from "@/lib/constants";
import { timeAgo } from "@/lib/geo";
import { useAdminAuth } from "@/context/AdminAuthContext";

const STATUS_FILTERS = ["all", "open", "in_progress", "resolved", "rejected"];

export default function AdminPortal() {
  const navigate = useNavigate();
  const { admin, loading, refresh, logout } = useAdminAuth();

  useEffect(() => { if (!loading && !admin) navigate("/admin-login"); }, [loading, admin, navigate]);

  if (loading || !admin) {
    return <div className="flex h-[100dvh] items-center justify-center bg-[#0f1417]"><Loader2 className="h-6 w-6 animate-spin text-[#5fd0c5]" /></div>;
  }

  const onLogout = async () => { await logout(); navigate("/admin-login"); };

  if (!admin.profile_complete) return <Shell admin={admin} onLogout={onLogout}><ProfileForm onDone={refresh} /></Shell>;
  if (admin.status !== "approved") return <Shell admin={admin} onLogout={onLogout}><PendingScreen admin={admin} /></Shell>;
  return <Dashboard admin={admin} onLogout={onLogout} />;
}

function Shell({ admin, onLogout, children }) {
  return (
    <div className="min-h-[100dvh] bg-[#0f1417] text-[#e7eef0]">
      <Header admin={admin} onLogout={onLogout} jText="" />
      <div className="mx-auto max-w-2xl px-6 py-10">{children}</div>
    </div>
  );
}

function Header({ admin, onLogout, jText }) {
  const isSuper = admin?.role === "super_admin";
  return (
    <div className="border-b border-[#243036] bg-[#151c21]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f7a72]"><ShieldCheck className="h-5 w-5 text-white" /></span>
          <div>
            <p className="font-heading text-lg font-extrabold">Fix My Area — Admin</p>
            {jText ? <p className="flex items-center gap-1 text-xs text-[#8aa0a8]"><MapPin className="h-3 w-3" /> {jText}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[#8aa0a8] sm:block">{admin.name} {isSuper && <span className="ml-1 rounded bg-[#1f7a72]/30 px-1.5 py-0.5 text-[10px] font-bold text-[#5fd0c5]">SUPER</span>}</span>
          <button data-testid="admin-logout-btn" onClick={onLogout} className="flex items-center gap-2 rounded-xl border border-[#2b3940] px-4 py-2 text-sm font-semibold"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </div>
    </div>
  );
}

function ProfileForm({ onDone }) {
  const [type, setType] = useState("");
  const [f, setF] = useState({ phone: "", department: "", employee_id: "", state: "", district: "", ward: "", company_name: "", contract_license_id: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const valid = type === "government_official"
    ? (f.department && f.employee_id)
    : type === "private_contractor" ? (f.company_name && f.contract_license_id) : false;

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      await adminProfile({ admin_type: type, ...f });
      toast.success("Profile submitted for approval");
      await onDone();
    } catch (e) { setErr(e.response?.data?.detail || "Could not submit profile"); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-[#243036] bg-[#151c21] p-8">
      <h1 className="font-heading text-xl font-extrabold">Complete your admin profile</h1>
      <p className="mt-1 text-sm text-[#8aa0a8]">Tell us who you are. A super-admin will approve your access.</p>

      <label className="mt-6 block text-xs font-bold uppercase tracking-wider text-[#8aa0a8]">I am a</label>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <button data-testid="role-government" onClick={() => setType("government_official")} className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-colors ${type === "government_official" ? "border-[#1f7a72] bg-[#1f7a72]/15 text-[#5fd0c5]" : "border-[#2b3940] text-[#c5d2d6]"}`}>
          <Building2 className="h-4 w-4" /> Government Official
        </button>
        <button data-testid="role-contractor" onClick={() => setType("private_contractor")} className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold transition-colors ${type === "private_contractor" ? "border-[#1f7a72] bg-[#1f7a72]/15 text-[#5fd0c5]" : "border-[#2b3940] text-[#c5d2d6]"}`}>
          <HardHat className="h-4 w-4" /> Private Contractor
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <F label="Phone number" testid="prof-phone" value={f.phone} onChange={upd("phone")} placeholder="+91…" />
        {type === "government_official" && (<>
          <F label="Department" testid="prof-department" value={f.department} onChange={upd("department")} placeholder="e.g. Public Works" />
          <F label="Employee ID" testid="prof-employee-id" value={f.employee_id} onChange={upd("employee_id")} />
          <F label="State (jurisdiction)" testid="prof-state" value={f.state} onChange={upd("state")} placeholder="e.g. Haryana" />
          <F label="District" testid="prof-district" value={f.district} onChange={upd("district")} placeholder="e.g. Gurugram" />
          <F label="Ward (optional)" testid="prof-ward" value={f.ward} onChange={upd("ward")} />
        </>)}
        {type === "private_contractor" && (<>
          <F label="Company name" testid="prof-company" value={f.company_name} onChange={upd("company_name")} />
          <F label="Contract / License ID" testid="prof-contract-id" value={f.contract_license_id} onChange={upd("contract_license_id")} />
        </>)}
      </div>

      {err && <p data-testid="admin-profile-error" className="mt-3 text-sm text-red-400">{err}</p>}
      <button data-testid="admin-profile-submit" onClick={submit} disabled={busy || !valid} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f7a72] py-3.5 text-sm font-semibold disabled:opacity-40">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Submit for approval
      </button>
    </div>
  );
}

function PendingScreen({ admin }) {
  const rejected = admin.status === "rejected";
  return (
    <div data-testid="admin-pending-screen" className="rounded-2xl border border-[#243036] bg-[#151c21] p-8 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0f1417]">
        {rejected ? <XCircle className="h-9 w-9 text-[#C0554E]" /> : <Clock className="h-9 w-9 text-[#E0913A]" />}
      </span>
      <h1 className="mt-4 font-heading text-xl font-extrabold">{rejected ? "Access request rejected" : "Awaiting approval"}</h1>
      <p className="mt-2 text-sm text-[#8aa0a8]">
        {rejected
          ? "A super-admin rejected your request. Contact your administrator if you think this is a mistake."
          : "Your profile has been submitted. A super-admin will review and approve your access shortly."}
      </p>
    </div>
  );
}

function Dashboard({ admin, onLogout }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const isSuper = admin.role === "super_admin";
  const isContractor = admin.admin_type === "private_contractor";
  const { data: metrics } = useQuery({ queryKey: ["admin-metrics"], queryFn: fetchAdminMetrics, enabled: !!admin, refetchInterval: 15000 });
  const { data: issues = [], refetch } = useQuery({ queryKey: ["admin-issues"], queryFn: () => fetchAdminIssues({}), enabled: !!admin, refetchInterval: 15000 });
  const { data: requests = [], refetch: refetchReq } = useQuery({ queryKey: ["admin-requests"], queryFn: fetchAdminRequests, enabled: !!admin && isSuper, refetchInterval: 20000 });

  const filtered = useMemo(() => issues.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (catFilter !== "all" && i.category !== catFilter) return false;
    return true;
  }), [issues, statusFilter, catFilter]);

  const j = admin.jurisdiction || {};
  const jText = isSuper ? "All jurisdictions" : isContractor ? `${admin.company_name || "Contractor"} · assigned to me` : [j.state, j.district, j.ward].filter(Boolean).join(" · ") || "Unassigned";

  const cards = [
    { label: "Total", value: metrics?.total ?? 0, icon: ShieldCheck, color: "#5fd0c5" },
    { label: "Pending", value: metrics?.open ?? 0, icon: TriangleAlert, color: "#E0913A" },
    { label: "In progress", value: metrics?.in_progress ?? 0, icon: Timer, color: "#5E8DBE" },
    { label: "Resolved", value: metrics?.resolved ?? 0, icon: CheckCircle2, color: "#4E9E74" },
    { label: "Rejected", value: metrics?.rejected ?? 0, icon: XCircle, color: "#C0554E" },
  ];

  const doApprove = async (id) => { await approveAdmin(id); toast.success("Admin approved"); refetchReq(); };
  const doReject = async (id) => { await rejectAdmin(id); toast("Request rejected"); refetchReq(); };

  return (
    <div className="min-h-[100dvh] bg-[#0f1417] text-[#e7eef0]">
      <Header admin={admin} onLogout={onLogout} jText={jText} />

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {cards.map((m) => { const Icon = m.icon; return (
            <div key={m.label} data-testid={`metric-${m.label}`} className="rounded-xl border border-[#243036] bg-[#151c21] p-4">
              <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-[#8aa0a8]">{m.label}</p><Icon className="h-4 w-4" style={{ color: m.color }} /></div>
              <p className="mt-2 font-heading text-4xl font-extrabold" style={{ color: m.color }}>{m.value}</p>
            </div>
          ); })}
        </div>

        {isSuper && requests.length > 0 && (
          <div className="mt-6 rounded-xl border border-[#243036] bg-[#151c21] p-5">
            <h2 className="flex items-center gap-2 font-heading text-lg font-bold"><UserCheck className="h-5 w-5 text-[#5fd0c5]" /> Pending admin requests ({requests.length})</h2>
            <div className="mt-3 space-y-2">
              {requests.map((r) => (
                <div key={r.admin_id} data-testid={`admin-request-${r.admin_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#243036] bg-[#0f1417] p-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.name} · <span className="text-[#8aa0a8]">{r.email}</span></p>
                    <p className="text-xs text-[#8aa0a8]">
                      {r.admin_type === "private_contractor"
                        ? `Contractor — ${r.company_name || "—"} · License ${r.contract_license_id || "—"}`
                        : `Official — ${r.department || "—"} · ID ${r.employee_id || "—"} · ${(r.jurisdiction?.state || "") + (r.jurisdiction?.district ? " · " + r.jurisdiction.district : "")}`}
                      {r.phone ? ` · ${r.phone}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button data-testid={`approve-${r.admin_id}`} onClick={() => doApprove(r.admin_id)} className="rounded-lg bg-[#1f7a72] px-3 py-1.5 text-sm font-semibold">Approve</button>
                    <button data-testid={`reject-${r.admin_id}`} onClick={() => doReject(r.admin_id)} className="rounded-lg border border-[#2b3940] px-3 py-1.5 text-sm font-semibold text-[#d98b8b]">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <select data-testid="admin-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-[#2b3940] bg-[#151c21] px-4 py-2.5 text-sm font-semibold">
            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : STATUS[s]?.label}</option>)}
          </select>
          <select data-testid="admin-category-filter" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-xl border border-[#2b3940] bg-[#151c21] px-4 py-2.5 text-sm font-semibold">
            <option value="all">All categories</option>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <span className="text-sm text-[#8aa0a8]">{filtered.length} shown</span>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-[#243036] bg-[#151c21]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#243036] bg-[#101619] text-[#8aa0a8]">
              <tr><th className="p-3 font-semibold">Issue</th><th className="hidden p-3 font-semibold md:table-cell">Area</th><th className="hidden p-3 font-semibold lg:table-cell">Assigned</th><th className="hidden p-3 font-semibold md:table-cell">Category</th><th className="p-3 font-semibold">Status</th><th className="hidden p-3 font-semibold sm:table-cell">Reported</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {filtered.map((issue) => { const cat = categoryOf(issue.category); const st = STATUS[issue.status] || STATUS.open; return (
                <tr key={issue.id} data-testid={`admin-row-${issue.id}`} className="cursor-pointer border-b border-[#1c262b] hover:bg-[#101619]" onClick={() => setSelected(issue)}>
                  <td className="p-3"><div className="flex items-center gap-3"><img src={buildPhotoUrl(issue.photo_path)} alt="" className="h-10 w-10 rounded-lg object-cover" /><div className="min-w-0"><p className="flex items-center gap-1 font-mono text-[11px] text-[#8aa0a8]">#{issue.short_id}{issue.flagged_ai_generated && <span className="rounded bg-[#d08a3c]/20 px-1 text-[9px] font-bold text-[#d08a3c]">AI?</span>}</p><p className="max-w-[180px] truncate font-medium">{issue.description || issue.address_text}</p></div></div></td>
                  <td className="hidden p-3 text-[#8aa0a8] md:table-cell">{issue.district || issue.state || "—"}</td>
                  <td className="hidden p-3 text-[#8aa0a8] lg:table-cell">{issue.assigned_admin_name || issue.assigned_team || "—"}</td>
                  <td className="hidden p-3 md:table-cell"><span className="inline-flex items-center gap-1.5 text-xs font-semibold"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />{cat.label}</span></td>
                  <td className="p-3"><span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: st.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.color }} />{st.label}</span></td>
                  <td className="hidden p-3 text-[#8aa0a8] sm:table-cell">{timeAgo(issue.created_at)}</td>
                  <td className="p-3 text-right"><ExternalLink className="ml-auto h-4 w-4 text-[#556]" /></td>
                </tr>
              ); })}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-[#8aa0a8]">{isContractor ? "No issues are assigned to you yet." : "No issues match these filters."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <EditPanel admin={admin} issue={selected} onClose={() => setSelected(null)} onSaved={async () => { await refetch(); setSelected(null); }} />}
    </div>
  );
}

function F({ label, testid, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-[#8aa0a8]">{label}</label>
      <input data-testid={testid} type={type} value={value} onChange={onChange} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-[#2b3940] bg-[#0f1417] px-4 py-3 text-sm outline-none focus:border-[#1f7a72]" />
    </div>
  );
}

function EditPanel({ admin, issue, onClose, onSaved }) {
  const isContractor = admin.admin_type === "private_contractor";
  const canAssign = !isContractor; // officials + super
  const [status, setStatus] = useState(issue.status || "open");
  const [category, setCategory] = useState(issue.category);
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState(issue.assigned_admin_id || "");
  const [team, setTeam] = useState(issue.assigned_team || "");
  const [saving, setSaving] = useState(false);

  const { data: contractors = [] } = useQuery({ queryKey: ["contractors"], queryFn: fetchContractors, enabled: canAssign });

  const save = async () => {
    setSaving(true);
    try {
      if (canAssign && category !== issue.category) await adminUpdateCategory(issue.id, category);
      if (canAssign && (assignee !== (issue.assigned_admin_id || "") || team !== (issue.assigned_team || ""))) {
        await adminAssign(issue.id, assignee, team);
      }
      if (status !== issue.status || note.trim()) await adminUpdateStatus(issue.id, status, note.trim());
      toast.success("Issue updated"); await onSaved();
    } catch (e) { toast.error(e.response?.data?.detail || "Update failed"); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex justify-end bg-black/50" onClick={onClose}>
      <div className="cf-rise h-full w-full max-w-md overflow-y-auto bg-[#151c21] p-6 text-[#e7eef0]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-heading text-xl font-bold">Manage issue</h2><button data-testid="admin-panel-close" onClick={onClose} className="rounded-full p-1.5 hover:bg-white/5"><X className="h-5 w-5" /></button></div>
        <img src={buildPhotoUrl(issue.photo_path)} alt="" className="mt-4 h-44 w-full rounded-xl object-cover" />
        {issue.flagged_ai_generated && <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#d08a3c]/15 p-2 text-xs font-semibold text-[#d08a3c]"><TriangleAlert className="h-4 w-4" /> Flagged as possibly AI-generated</div>}
        <p className="mt-3 font-mono text-xs text-[#8aa0a8]">#{issue.short_id} · {issue.district || issue.state}</p>
        <p className="mt-1 text-sm">{issue.description || "No description"}</p>
        <p className="mt-2 text-xs text-[#8aa0a8]">{issue.address_text}</p>

        {canAssign && (
          <>
            <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-[#8aa0a8]">Category</label>
            <select data-testid="admin-category-select" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-[#2b3940] bg-[#0f1417] px-4 py-3 text-sm">{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>

            <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#8aa0a8]">Assign to contractor</label>
            <select data-testid="admin-assignee-select" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="mt-2 w-full rounded-xl border border-[#2b3940] bg-[#0f1417] px-4 py-3 text-sm">
              <option value="">Unassigned</option>
              {contractors.map((c) => <option key={c.admin_id} value={c.admin_id}>{c.company_name || c.name}</option>)}
            </select>

            <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#8aa0a8]">Team / department (optional)</label>
            <input data-testid="admin-team-input" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. Road maintenance crew" className="mt-2 w-full rounded-xl border border-[#2b3940] bg-[#0f1417] px-4 py-3 text-sm" />
          </>
        )}

        {isContractor && (issue.assigned_team || issue.assigned_admin_name) && (
          <div className="mt-4 rounded-lg border border-[#243036] bg-[#0f1417] p-3 text-xs text-[#8aa0a8]">Assigned to <span className="font-semibold text-[#c5d2d6]">{issue.assigned_admin_name || issue.assigned_team}</span></div>
        )}

        <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#8aa0a8]">Status</label>
        <select data-testid="admin-status-select" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full rounded-xl border border-[#2b3940] bg-[#0f1417] px-4 py-3 text-sm">
          <option value="open">Pending</option>
          {["in_progress", "resolved", "rejected"].map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
        </select>
        <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#8aa0a8]">Remarks</label>
        <textarea data-testid="admin-note-input" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add remarks for this update…" className="mt-2 w-full resize-none rounded-xl border border-[#2b3940] bg-[#0f1417] px-4 py-3 text-sm" />
        <button data-testid="admin-save-btn" onClick={save} disabled={saving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f7a72] py-4 text-sm font-semibold disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save changes</button>
      </div>
    </div>
  );
}
