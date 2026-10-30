import { useState } from "react"
import { useJob } from "../App.jsx"

const filters = ["All", "Vendor", "Warehouse", "Quality", "Finance", "Planning"]

export default function HistoryPage() {
  const { job } = useJob()
  const [area, setArea] = useState("All")
  const rows = job.history.filter((item) => area === "All" || item.area === area)

  return (
    <div className="stack">
      <div className="filters" role="tablist" aria-label="History areas">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            className={item === area ? "chip selected" : "chip"}
            onClick={() => setArea(item)}
            aria-pressed={item === area}
          >
            {item}
          </button>
        ))}
      </div>
      <ol className="timeline" data-testid="history-list">
        {rows.map((item) => (
          <li key={item.id}>
            <div className="when">
              <span>{item.atLabel}</span>
              <em>{item.area}</em>
            </div>
            <div>
              <strong>{item.summary}</strong>
              <p>{item.detail}</p>
              <span className="meta">{item.actor}</span>
            </div>
          </li>
        ))}
      </ol>
      {rows.length === 0 && <p>Nothing in this area yet.</p>}
    </div>
  )
}
