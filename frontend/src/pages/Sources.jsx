import { useJob } from "../App.jsx"
import { Money, Qty, Tag } from "../components/Bits.jsx"

export default function Sources() {
  const { job } = useJob()
  const docs = job.documents
  const missingCrateKg = job.job.pieceWeightKg * docs.grn.crateSize

  return (
    <div className="stack">
      <p className="intro">
        Four records describe the same batch and they are allowed to disagree. The desk shows who wrote each one. Reconciliation on the next screen changes a status, not these documents.
      </p>

      <section className="doc">
        <header>
          <Tag kind="customer">Customer</Tag>
          <h2>{docs.salesOrder.title} {docs.salesOrder.number}</h2>
          <span className="status">{docs.salesOrder.status}</span>
        </header>
        <dl>
          <div><dt>Customer</dt><dd>{docs.salesOrder.customer}</dd></div>
          <div><dt>Buyer</dt><dd>{docs.salesOrder.buyer}</dd></div>
          <div><dt>Their part</dt><dd>{docs.salesOrder.customerPart}</dd></div>
          <div><dt>Our part</dt><dd>{job.job.part}</dd></div>
          <div><dt>Quantity</dt><dd><Qty value={docs.salesOrder.qty} /></dd></div>
          <div><dt>Promise</dt><dd>{job.simulation.promiseLabel}</dd></div>
        </dl>
        <p>{docs.salesOrder.note}</p>
      </section>

      <section className="doc">
        <header>
          <Tag kind="stores">Our stores</Tag>
          <h2>{docs.challan.title} {docs.challan.number}</h2>
          <span className="status">{docs.challan.status}</span>
        </header>
        <dl>
          <div><dt>Quantity</dt><dd><Qty value={docs.challan.qty} /></dd></div>
          <div><dt>Crates</dt><dd>{docs.challan.crates} × {docs.challan.crateSize}</dd></div>
          <div><dt>Range</dt><dd>{docs.challan.crateRange}</dd></div>
          <div><dt>E-way sample</dt><dd>{docs.challan.ewayBill}</dd></div>
          <div><dt>Service PO</dt><dd>{docs.purchaseOrder.number}</dd></div>
          <div><dt>Service rate</dt><dd><Money value={docs.purchaseOrder.rateInr} /> / pc</dd></div>
        </dl>
        <p>{docs.challan.note} {docs.challan.ewayNote}</p>
      </section>

      <section className="doc doc-vendor">
        <header>
          <Tag kind="vendor">Vendor report</Tag>
          <h2>{docs.vendorDispatch.title}</h2>
          <span className="status">{docs.vendorDispatch.status}</span>
        </header>
        {docs.vendorDispatch.qty > 0 && (
          <dl>
            <div><dt>Update id</dt><dd>{docs.vendorDispatch.updateId}</dd></div>
            <div><dt>Challan</dt><dd>{docs.vendorDispatch.number}</dd></div>
            <div><dt>Dispatched</dt><dd data-testid="qty-vendor"><Qty value={docs.vendorDispatch.qty} /></dd></div>
            <div><dt>Crates claimed</dt><dd>{docs.vendorDispatch.cratesClaimed}</dd></div>
            <div><dt>Left their gate</dt><dd>{docs.vendorDispatch.dispatchLabel}</dd></div>
            <div><dt>Heat batch</dt><dd>{docs.vendorDispatch.heatBatch}</dd></div>
            <div><dt>Vehicle / LR</dt><dd>{docs.vendorDispatch.vehicle} · {docs.vendorDispatch.lrNo}</dd></div>
          </dl>
        )}
        <p>{docs.vendorDispatch.note}</p>
        <div className="callout">
          <h3>Certificate {docs.vendorCertificate.number}</h3>
          <p>
            Mettherm claims {docs.vendorCertificate.claimedQty} pieces in batch {docs.vendorCertificate.heatBatch}, average {docs.vendorCertificate.claimedAverageHrc} HRC, and says the batch conforms. Our inspection rejected crates C-17 and C-28. The certificate is still shown as they issued it.
          </p>
        </div>
        {docs.eta && (
          <div className="callout">
            <h3>Balance ETA {docs.eta.updateId}</h3>
            <p>{docs.eta.note}</p>
            <p className="status">{docs.eta.status}</p>
          </div>
        )}
      </section>

      <section className="doc doc-warehouse">
        <header>
          <Tag kind="warehouse">Our warehouse</Tag>
          <h2>{docs.grn.title} {docs.grn.number}</h2>
          <span className="status">{docs.grn.status}</span>
        </header>
        <dl>
          <div><dt>Gate in</dt><dd>{docs.grn.gateLabel}</dd></div>
          <div><dt>Count posted</dt><dd>{docs.grn.receivedLabel}</dd></div>
          <div><dt>Counted</dt><dd data-testid="qty-received"><Qty value={docs.grn.qty} /></dd></div>
          <div><dt>Crates on the truck</dt><dd>{docs.grn.cratesReceived}</dd></div>
          <div><dt>Missing crate</dt><dd>{docs.grn.missingCrate}</dd></div>
          <div><dt>Counted by</dt><dd>{docs.grn.countedBy}</dd></div>
          <div><dt>Weighbridge</dt><dd>{docs.grn.weighbridge}</dd></div>
          <div><dt>Net weight</dt><dd>{docs.grn.netKg.toLocaleString("en-IN")} kg</dd></div>
          <div><dt>Expected for 780</dt><dd>{docs.grn.expectedNetKg.toLocaleString("en-IN")} kg</dd></div>
        </dl>
        <p>{docs.grn.note}</p>
        <p>
          The scale is {docs.grn.expectedNetKg - docs.grn.netKg} kg under the 780-piece expectation, inside {docs.grn.scaleTolerance}. One crate is about {missingCrateKg} kg, so the ticket supports the short count.
        </p>
      </section>

      <section className="doc doc-quality">
        <header>
          <Tag kind="quality">Our inspection</Tag>
          <h2>{docs.inspection.title} {docs.inspection.number}</h2>
          <span className="status">{docs.inspection.status}</span>
        </header>
        <dl>
          <div><dt>Inspector</dt><dd>{docs.inspection.inspector}</dd></div>
          <div><dt>Finished</dt><dd>{docs.inspection.inspectedLabel}</dd></div>
          <div><dt>Method</dt><dd>{docs.inspection.method}, tester {docs.inspection.tester}</dd></div>
          <div><dt>Spec</dt><dd>{docs.inspection.spec}</dd></div>
          <div><dt>Accepted</dt><dd data-testid="qty-accepted"><Qty value={docs.inspection.acceptedQty} /></dd></div>
          <div><dt>Rejected</dt><dd data-testid="qty-rejected"><Qty value={docs.inspection.rejectedQty} /></dd></div>
          <div><dt>Hold location</dt><dd>{docs.inspection.rejectedLocation}</dd></div>
        </dl>
        <p>{docs.inspection.note}</p>
        <div className="table-wrap">
          <table className="readings">
            <thead>
              <tr>
                <th>Sample</th>
                <th>HRC</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {docs.inspection.readings.map((reading) => (
                <tr key={reading.sample} className={reading.result === "Reject" ? "tone-risk" : "tone-good"}>
                  <td>{reading.sample}</td>
                  <td>{reading.hrc.toFixed(1)}</td>
                  <td>{reading.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {docs.inspection.disposition && (
          <div className="callout">
            <h3>Disposition {docs.inspection.disposition.id}</h3>
            <p>{docs.inspection.disposition.label}. Recorded by {docs.inspection.disposition.actor} at {docs.inspection.disposition.atLabel}.</p>
            <p>{docs.inspection.disposition.note}</p>
          </div>
        )}
      </section>

      <section className="doc doc-accounts">
        <header>
          <Tag kind="accounts">Vendor bill</Tag>
          <h2>{docs.invoice.title} {docs.invoice.number}</h2>
          <span className="status">{docs.invoice.status}</span>
        </header>
        <dl>
          <div><dt>Entered by</dt><dd>{docs.invoice.enteredBy}</dd></div>
          <div><dt>Entered</dt><dd>{docs.invoice.billedLabel}</dd></div>
          <div><dt>Billed quantity</dt><dd data-testid="qty-invoice"><Qty value={docs.invoice.billedQty} /></dd></div>
          <div><dt>Rate</dt><dd><Money value={docs.invoice.rateInr} /></dd></div>
          <div><dt>Taxable value</dt><dd><Money value={docs.invoice.amounts.taxable} /></dd></div>
          <div><dt>CGST 9%</dt><dd><Money value={docs.invoice.amounts.cgst} /></dd></div>
          <div><dt>SGST 9%</dt><dd><Money value={docs.invoice.amounts.sgst} /></dd></div>
          <div><dt>Invoice total</dt><dd><Money value={docs.invoice.amounts.total} /></dd></div>
          <div><dt>IRN</dt><dd>{docs.invoice.irn || "Not on the copy we have"}</dd></div>
        </dl>
        <p>{docs.invoice.note} {job.money.scheme}</p>
      </section>
    </div>
  )
}
