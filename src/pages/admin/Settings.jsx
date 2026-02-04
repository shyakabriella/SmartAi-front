// src/pages/admin/Settings.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "password", label: "Password" },
  { key: "organization", label: "Organization" },
];

export default function Settings() {
  const [tab, setTab] = useState("profile");

  // Profile
  const [me, setMe] = useState(null);
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  // Organization
  const [org, setOrg] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [savingOrg, setSavingOrg] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const logoPreview = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    if (org?.logo_url) return org.logo_url;
    return "";
  }, [logoFile, org]);

  function clearAlerts() { setErr(""); setOk(""); }

  async function loadProfile() {
    try {
      const out = await api("/me");
      const data = out?.data ?? out;
      setMe(data);
      setPName(data?.name || "");
      setPPhone(data?.phone || "");
    } catch (e) {
      // not fatal — show soft message when profile tab is open
    }
  }

  async function loadOrg() {
    try {
      const out = await api("/settings");
      const data = out?.data ?? out;
      setOrg(data);
      setOrgName(data?.name || "");
    } catch (e) {
      // many backends don't have this yet — not fatal
    }
  }

  useEffect(() => {
    loadProfile();
    loadOrg();
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    clearAlerts();
    setSavingProfile(true);
    try {
      const out = await api("/me", { method: "PUT", body: { name: pName, phone: pPhone || null } });
      const data = out?.data ?? out;
      setMe(data);
      setOk("Profile updated.");
    } catch (e) {
      setErr(e.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    clearAlerts();
    if (newPass !== newPass2) { setErr("Password confirmation does not match."); return; }
    setSavingPass(true);
    try {
      await api("/me/password", { method: "PUT", body: { current_password: curPass, password: newPass, password_confirmation: newPass2 } });
      setOk("Password changed.");
      setCurPass(""); setNewPass(""); setNewPass2("");
    } catch (e) {
      setErr(e.message || "Failed to change password");
    } finally {
      setSavingPass(false);
    }
  }

  async function saveOrganization(e) {
    e.preventDefault();
    clearAlerts();
    setSavingOrg(true);
    try {
      const fd = new FormData();
      fd.append("name", orgName || "");
      if (logoFile) fd.append("logo", logoFile);
      const out = await api("/settings", { method: "PUT", body: fd });
      const data = out?.data ?? out;
      setOrg(data);
      setLogoFile(null);
      setOk("Organization settings saved.");
    } catch (e) {
      setErr(e.message || "Failed to save organization settings");
    } finally {
      setSavingOrg(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-500">Manage your profile, password, and organization branding.</p>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex gap-1 border-b border-slate-200 p-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { clearAlerts(); setTab(t.key); }}
              className={[
                "px-3 py-2 rounded-lg text-sm",
                tab === t.key ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-700"
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {(err || ok) && (
          <div className="px-4 pt-3">
            {err && <div className="rounded-lg border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">{err}</div>}
            {ok && <div className="rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{ok}</div>}
          </div>
        )}

        {/* Panels */}
        <div className="p-4">
          {tab === "profile" && (
            <form onSubmit={saveProfile} className="max-w-xl grid gap-3">
              <div>
                <label className="text-sm text-slate-600">Name</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2" value={pName} onChange={(e)=>setPName(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm text-slate-600">Phone</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2" value={pPhone} onChange={(e)=>setPPhone(e.target.value)} />
              </div>
              <div className="text-sm text-slate-500">
                <div><span className="text-slate-600">Email:</span> {me?.email || "-"}</div>
                <div><span className="text-slate-600">Primary role:</span> {me?.primary_role || "-"}</div>
              </div>
              <div className="flex gap-2 pt-2">
                <button disabled={savingProfile} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  {savingProfile ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          )}

          {tab === "password" && (
            <form onSubmit={savePassword} className="max-w-md grid gap-3">
              <div>
                <label className="text-sm text-slate-600">Current password</label>
                <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2" value={curPass} onChange={(e)=>setCurPass(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm text-slate-600">New password</label>
                <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2" value={newPass} onChange={(e)=>setNewPass(e.target.value)} required minLength={6} />
              </div>
              <div>
                <label className="text-sm text-slate-600">Confirm new password</label>
                <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2" value={newPass2} onChange={(e)=>setNewPass2(e.target.value)} required minLength={6} />
              </div>
              <div className="flex gap-2 pt-2">
                <button disabled={savingPass} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  {savingPass ? "Saving…" : "Change password"}
                </button>
              </div>
            </form>
          )}

          {tab === "organization" && (
            <form onSubmit={saveOrganization} className="max-w-xl grid gap-3">
              <div>
                <label className="text-sm text-slate-600">Organization name</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2" value={orgName} onChange={(e)=>setOrgName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-600">Logo</label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="h-16 w-16 rounded-lg bg-slate-100 overflow-hidden ring-1 ring-slate-200">
                    {logoPreview ? (
                      <img src={logoPreview} alt="logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-slate-400 text-xs">No logo</div>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={(e)=>setLogoFile(e.target.files?.[0] || null)} />
                </div>
                <p className="text-xs text-slate-500 mt-1">PNG/JPG/SVG. Recommended 256×256.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button disabled={savingOrg} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  {savingOrg ? "Saving…" : "Save settings"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
