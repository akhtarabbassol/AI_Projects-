import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, role, companyName } = useAuth();
  const [temperature,setTemperature]=useState(0.3);
  const [relevance,setRelevance]=useState(0.75);
  const [citations,setCitations]=useState(true);

  return <section className="content-view active">
    <div className="overview-header"><h1>System Settings</h1><p>Configure your EKIS instance and AI parameters</p></div>
    <div className="settings-grid">
      <div className="settings-card"><h3>Account Information</h3><div className="settings-form">
        <div className="form-group"><label>Name</label><input value={user?.name||user?.full_name||""} readOnly placeholder="Returned by backend after login"/></div>
        <div className="form-group"><label>Email</label><input value={user?.email||""} readOnly placeholder="Returned by backend after login"/></div>
        <div className="form-group"><label>Company</label><input value={companyName} readOnly/></div>
        <div className="form-group"><label>Role</label><input value={role.replace(/_/g, " ")} readOnly/></div>
        <p className="small muted">Only settings with a documented backend API are connected. No fake save operation is added.</p>
      </div></div>
      <div className="settings-card"><h3>AI Temperature & RAG Tuning</h3><div className="settings-form">
        <div className="form-group"><label>Creativity (Temperature): {temperature}</label><input type="range" min="0" max="1" step="0.1" value={temperature} onChange={e=>setTemperature(e.target.value)}/></div>
        <div className="form-group"><label>Min Relevance Score</label><input type="number" min="0" max="1" step="0.05" value={relevance} onChange={e=>setRelevance(e.target.value)}/></div>
        <div className="toggle-group"><span>Enable Citation Sources</span><input type="checkbox" checked={citations} onChange={e=>setCitations(e.target.checked)}/></div>
        <div className="small muted">These controls are UI-only until matching backend settings endpoints are provided.</div>
      </div></div>
      <div className="settings-card danger"><h3>Danger Zone</h3><p>Permanent knowledge-base actions require a backend endpoint before they can be enabled.</p><button className="btn-ghost-sm danger-outline" disabled>Purge All Embeddings</button></div>
    </div>
  </section>;
}