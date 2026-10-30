import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createApp, loadFixtures } from "../src/server.js"
import { createStore } from "../src/store.js"
import {
  createSeed,
  derive,
  importFixture,
  recordDecision,
  recordDisposition,
  retryImport,
  sourceQuantities
} from "../src/logic.js"

const fixtures = loadFixtures()

function scenario() {
  return createSeed(fixtures)
}

test("scenario quantities stay in disagreement and still add back to 1,000", () => {
  const view = derive(scenario())
  const q = view.quantities
  assert.equal(q.customerOrder, 1000)
  assert.equal(q.issuedToVendor, 1000)
  assert.equal(q.vendorDispatched, 800)
  assert.equal(q.warehouseReceived, 780)
  assert.equal(q.qcAccepted, 740)
  assert.equal(q.qcRejected, 40)
  assert.equal(q.invoicedQty, 800)
  assert.equal(q.unaccounted, 20)
  assert.equal(q.stillAtVendor, 200)
  assert.equal(q.shippable, 740)
  assert.equal(q.deliveryGap, 260)
  assert.equal(q.otherFinishedStock, 0)
  assert.equal(q.identityOk, true)
  assert.equal(q.qcAccepted + q.qcRejected + q.unaccounted + q.stillAtVendor, 1000)
  assert.equal(view.risk.hoursRemaining, 48)
  assert.equal(view.money.invoice.taxable, 184000)
  assert.equal(view.money.invoice.cgst, 16560)
  assert.equal(view.money.invoice.sgst, 16560)
  assert.equal(view.money.invoice.total, 217120)
  assert.equal(view.money.gapVsAccepted.taxable, 13800)
})

test("importing the same dispatch twice does not double-count", () => {
  const state = createSeed(fixtures, { withDispatch: false })
  const first = importFixture(state, fixtures, {
    fixtureId: "dispatch",
    now: "2026-10-28T19:05:00+05:30"
  })
  assert.equal(first.body.outcome, "applied")
  assert.equal(derive(state).quantities.vendorDispatched, 800)

  const second = importFixture(state, fixtures, {
    fixtureId: "dispatch",
    now: "2026-10-30T11:00:00+05:30"
  })
  assert.equal(second.body.outcome, "duplicate_ignored")
  assert.equal(second.body.quantitiesUnchanged, true)
  assert.equal(derive(state).quantities.vendorDispatched, 800)
  assert.equal(state.imports["VU-METTHERM-2026-10-28-001"].attempts.length, 2)
})

test("a simulated failure posts nothing and retry posts the ETA once", () => {
  const state = scenario()
  const before = sourceQuantities(state)
  const failed = importFixture(state, fixtures, {
    fixtureId: "eta",
    simulateFailure: true,
    now: "2026-10-30T11:05:00+05:30"
  })
  assert.equal(failed.http, 503)
  assert.equal(failed.body.outcome, "failed")
  assert.deepEqual(sourceQuantities(state), before)
  assert.equal(derive(state).documents.eta, null)

  const retried = retryImport(state, fixtures, "2026-10-30T11:06:00+05:30")
  assert.equal(retried.body.outcome, "applied")
  const after = derive(state)
  assert.equal(after.quantities.vendorDispatched, 800)
  assert.equal(after.documents.eta.balanceQty, 200)
  assert.equal(after.quantities.stillAtVendor, 200)

  const again = importFixture(state, fixtures, {
    fixtureId: "eta",
    now: "2026-10-30T11:07:00+05:30"
  })
  assert.equal(again.body.outcome, "duplicate_ignored")
  assert.equal(Object.values(state.imports).filter((item) => item.payload?.type === "balance_eta" && item.status === "applied").length, 1)
})

test("a conflicting replay keeps the posted dispatch quantity", () => {
  const state = scenario()
  const outcome = importFixture(state, fixtures, {
    fixtureId: "dispatch_conflict",
    now: "2026-10-30T11:10:00+05:30"
  })
  assert.equal(outcome.http, 409)
  assert.equal(outcome.body.outcome, "conflict_preserved")
  assert.equal(derive(state).quantities.vendorDispatched, 800)
  assert.equal(state.imports["VU-METTHERM-2026-10-28-001"].payload.dispatchedQty, 800)
})

test("inspection and reconciliation do not edit source quantities", () => {
  const state = scenario()
  const before = sourceQuantities(state)
  recordDisposition(state, {
    decision: "rework",
    note: "Send both failed crates back for re-temper.",
    actor: "Anita Deshmukh",
    now: "2026-10-30T11:15:00+05:30"
  })
  recordDecision(state, {
    kind: "shortage",
    choice: "dispute",
    note: "Ask Mettherm to account for crate C-40.",
    actor: "Anita Deshmukh",
    now: "2026-10-30T11:16:00+05:30"
  })
  recordDecision(state, {
    kind: "invoice",
    choice: "pay_accepted",
    note: "Recommend payment for 740 and ask for a debit note.",
    actor: "Anita Deshmukh",
    now: "2026-10-30T11:17:00+05:30"
  })
  const view = derive(state)
  assert.deepEqual(sourceQuantities(state), before)
  assert.equal(view.documents.inspection.acceptedQty, 740)
  assert.equal(view.documents.inspection.rejectedQty, 40)
  assert.equal(view.documents.invoice.billedQty, 800)
  assert.equal(view.documents.grn.qty, 780)
  assert.equal(view.disposition || view.documents.inspection.disposition.status, "Re-temper requested")
  assert.equal(view.risk.recorded, 3)
  assert.equal(view.quantities.shippable, 740)
  assert.equal(view.quantities.deliveryGap, 260)
  assert.ok(view.history.some((item) => item.summary.includes("Disposition recorded")))
  assert.ok(view.history.some((item) => item.area === "Finance"))
})

test("http import, retry, conflict, decision, and reset", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "heat-desk-"))
  const store = createStore(path.join(dir, "state.json"), fixtures)
  const server = createApp(store, fixtures).listen(0)
  const port = server.address().port
  const base = `http://127.0.0.1:${port}`

  try {
    const job = await (await fetch(`${base}/api/job`)).json()
    assert.equal(job.quantities.vendorDispatched, 800)
    assert.equal(job.quantities.identityOk, true)

    const failed = await fetch(`${base}/api/vendor-updates/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixtureId: "dispatch", simulateFailure: true })
    })
    assert.equal(failed.status, 503)
    const failedBody = await failed.json()
    assert.equal(failedBody.vendorDispatched, 800)

    const retried = await (await fetch(`${base}/api/vendor-updates/retry`, { method: "POST" })).json()
    assert.equal(retried.outcome, "duplicate_ignored")
    assert.equal(retried.vendorDispatched, 800)

    const conflict = await fetch(`${base}/api/vendor-updates/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixtureId: "dispatch_conflict" })
    })
    assert.equal(conflict.status, 409)

    const saved = await fetch(`${base}/api/inspections/disposition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: "concession",
        note: "Ask the customer before these 40 move.",
        actor: "Anita Deshmukh"
      })
    })
    assert.equal(saved.status, 200)
    const savedBody = await saved.json()
    assert.equal(savedBody.job.quantities.qcRejected, 40)
    assert.equal(savedBody.job.quantities.qcAccepted, 740)

    const reset = await (await fetch(`${base}/api/simulation/reset`, { method: "POST" })).json()
    assert.equal(reset.job.risk.recorded, 0)
    assert.equal(reset.job.quantities.warehouseReceived, 780)
    assert.equal(reset.job.documents.inspection.disposition, null)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
