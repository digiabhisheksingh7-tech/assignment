import { useEffect } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { api } from "../api.js"
import { useJob } from "../App.jsx"
import Walkthrough from "./Walkthrough.jsx"

const pages = {
  "/": ["Overview", "Where the 1,000 pieces are"],
  "/quantities": ["Quantity bridge", "Each figure, and the document it came from"],
  "/sources": ["Source records", "Vendor, warehouse, inspection, and bill"],
  "/import": ["Vendor import", "Simulated dispatch update"],
  "/resolve": ["Resolve", "Record a decision without editing the figures"],
  "/history": ["History", "What has been recorded on this job"]
}

const links = [
  ["/", "Overview"],
  ["/quantities", "Quantities"],
  ["/sources", "Source records"],
  ["/import", "Vendor import"],
  ["/resolve", "Resolve"],
  ["/history", "History"]
]

export default function Shell() {
  const { pathname } = useLocation()
  const { job, setJob, error, loading } = useJob()
  const [title, lede] = pages[pathname] || ["Heat-treatment desk", ""]

  useEffect(() => {
    document.title = `${title} · Arjun Forge`
  }, [title])

  async function resetScenario() {
    const agreed = window.confirm(
      "Reset the prototype to the original scenario? Decisions you recorded will be cleared. The dispatch, receipt, inspection, and invoice figures stay at 800, 780, 740, and 40."
    )
    if (!agreed) return
    const data = await api.reset()
    setJob(data.job)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">AF</span>
          <div>
            <strong>Arjun Forge</strong>
            <span>Heat-treatment desk</span>
          </div>
        </div>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <p>Sample plant. Chakan MIDC. Not a live ERP.</p>
          <button type="button" className="ghost" onClick={resetScenario}>
            Reset scenario
          </button>
          <Walkthrough />
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Job HT-2026-0142 · Steering knuckle, RH</p>
            <h1>{title}</h1>
            <p className="lede">{lede}</p>
          </div>
          <div className="who">
            <strong>{job?.user.name || "Anita Deshmukh"}</strong>
            <span>{job?.user.role || "Production manager"}</span>
            <span className="clock">Scenario clock {job?.simulation.clockLabel || "30 Oct 2026, 10:30 IST"}</span>
          </div>
        </header>
        <div className="simbar" role="status">
          {job?.simulation.banner || "Vendor portal is simulated. Nothing on this desk is sent to a real vendor."}
        </div>
        <main className="content">
          {loading && <p className="loading">Opening the heat-treatment job…</p>}
          {error && (
            <div className="result result-failed" role="alert">
              <strong>The desk is not connected.</strong>
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && <Outlet />}
        </main>
      </div>
    </div>
  )
}
