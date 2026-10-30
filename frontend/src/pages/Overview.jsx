import { Link } from "react-router-dom"
import { useJob } from "../App.jsx"
import { Money, Qty, Tag } from "../components/Bits.jsx"

export default function Overview() {
  const { job } = useJob()
  const q = job.quantities
  const widthOf = (qty) => `${(qty / q.issuedToVendor) * 100}%`

  return (
    <div className="stack">
      <section className={`risk risk-${job.risk.level}`} data-testid="delivery-risk">
        <p className="eyebrow">Customer delivery</p>
        <h2>{job.risk.title}</h2>
        <p>{job.risk.detail}</p>
        <p className="risk-meta">
          {job.risk.recorded} of {job.risk.totalDecisions} decisions recorded. Bharat Axle is due {job.simulation.promiseLabel}. Saving a decision does not add stock.
        </p>
      </section>

      <ul className="facts">
        <li><span>Part</span>{job.job.part}</li>
        <li><span>Process</span>{job.job.process}, {job.job.hardness}</li>
        <li><span>Vendor</span>{job.job.vendor}</li>
        <li><span>Customer</span>{job.job.customer}</li>
      </ul>

      {job.bar && (
        <section className="panel">
          <div className="panel-head">
            <h2>The 1,000 issued pieces</h2>
            <Tag kind="calculated">Calculated from the source documents</Tag>
          </div>
          <div
            className="split"
            role="img"
            aria-label={`Accepted ${q.qcAccepted}, rejected ${q.qcRejected}, unaccounted ${q.unaccounted}, still at vendor ${q.stillAtVendor}`}
          >
            {job.bar.map((segment) => (
              <span key={segment.key} className={`seg seg-${segment.tone}`} style={{ width: widthOf(segment.qty) }}>
                {segment.qty / q.issuedToVendor > 0.08 ? <i>{segment.qty}</i> : null}
              </span>
            ))}
          </div>
          <ul className="legend">
            {job.bar.map((segment) => (
              <li key={segment.key}>
                <span className={`swatch seg-${segment.tone}`} />
                {segment.label}
                <Qty value={segment.qty} />
              </li>
            ))}
          </ul>
          <p className={`identity ${q.identityOk ? "identity-ok" : "identity-bad"}`} data-testid="identity">
            <Qty value={q.qcAccepted} /> accepted + <Qty value={q.qcRejected} /> rejected + <Qty value={q.unaccounted} /> unaccounted + <Qty value={q.stillAtVendor} /> still at vendor = <Qty value={q.identityTotal} /> issued
          </p>
        </section>
      )}

      <section className="stats">
        <article>
          <span>Shippable today</span>
          <strong data-testid="qty-shippable"><Qty value={q.shippable} /></strong>
          <em>Accepted stock. Other finished stock is 0.</em>
        </article>
        <article>
          <span>Short of the promise</span>
          <strong data-testid="qty-gap"><Qty value={q.deliveryGap} /></strong>
          <em>Customer order {q.customerOrder.toLocaleString("en-IN")}.</em>
        </article>
        <article>
          <span>Unaccounted at the gate</span>
          <strong data-testid="qty-short"><Qty value={q.unaccounted} /></strong>
          <em>Vendor 800, warehouse 780.</em>
        </article>
        <article>
          <span>Billed above accepted</span>
          <strong data-testid="qty-bill-gap"><Qty value={q.invoiceVsAccepted} /></strong>
          <em><Money value={job.money.gapVsAccepted.taxable} /> taxable, before GST.</em>
        </article>
      </section>

      <section className="split-grid">
        <div className="stack">
          {job.discrepancies.map((item) => (
            <article key={item.id} className={`gap-card tone-${item.tone}`}>
              <header>
                <h3>{item.title}</h3>
                <span className="status">{item.status}</span>
              </header>
              <div className="pair">
                <div>
                  <Tag kind={kindFor(item.left.source)}>{item.left.source}</Tag>
                  <Qty value={item.left.qty} />
                  <span>{item.left.label}</span>
                </div>
                <div>
                  <Tag kind={kindFor(item.right.source)}>{item.right.source}</Tag>
                  <Qty value={item.right.qty} />
                  <span>{item.right.label}</span>
                </div>
              </div>
              <p className="gap-label">{item.gapLabel}</p>
              <p>{item.detail}</p>
              <Link to={`/resolve#${item.anchor}`}>Record a decision</Link>
            </article>
          ))}
        </div>
        <aside className="stack">
          <section className="panel">
            <h2>Next actions</h2>
            <ol className="actions">
              {job.nextActions.map((item) => (
                <li key={item.id} className={item.status === "recorded" ? "done" : "open"}>
                  <Link to={item.href}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
          <section className="panel projection">
            <p className="eyebrow">{job.projection.label}</p>
            <p>{job.projection.detail}</p>
          </section>
          <section className="panel">
            <h2>Latest history</h2>
            <ul className="mini-history">
              {job.history.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <span>{item.atLabel}</span>
                  <strong>{item.summary}</strong>
                </li>
              ))}
            </ul>
            <Link to="/history">Full history</Link>
          </section>
        </aside>
      </section>
    </div>
  )
}

function kindFor(source) {
  if (source.startsWith("Vendor")) return "vendor"
  if (source.startsWith("GRN") || source.includes("warehouse")) return "warehouse"
  if (source.startsWith("QI") || source.includes("inspection") || source.includes("Accepted")) return "quality"
  if (source.includes("bill") || source.includes("INV")) return "accounts"
  if (source.includes("SO") || source.includes("Customer") || source.includes("order")) return "customer"
  return "calculated"
}
