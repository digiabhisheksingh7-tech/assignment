import { createInitialState, laterHistory, openingHistory } from "./seed.js"

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const RATE = 230

export const FIXTURE_META = {
  dispatch: {
    id: "dispatch",
    title: "Dispatch update, 800 pieces",
    detail: "The update already posted on this job. Importing it again must not add another 800."
  },
  dispatch_conflict: {
    id: "dispatch_conflict",
    title: "Conflicting copy of the same update",
    detail: "Same update id, but the payload says 1,000 pieces. The posted 800 must stay."
  },
  eta: {
    id: "eta",
    title: "Balance ETA for the remaining 200",
    detail: "A second vendor message. It records a plan. It does not add pieces to the dispatch."
  }
}

const CHOICES = {
  disposition: {
    rework: {
      label: "Send 40 back for re-temper",
      status: "Re-temper requested",
      defaultNote: "Crates C-17 and C-28 failed hardness. Send both back to Mettherm for re-temper. They stay rejected until a new inspection accepts them."
    },
    scrap: {
      label: "Treat 40 as scrap",
      status: "Scrap recommended",
      defaultNote: "Treat crates C-17 and C-28 as scrap. They remain rejected and are not available to ship."
    },
    concession: {
      label: "Ask the customer for a concession",
      status: "Concession requested",
      defaultNote: "Ask Bharat Axle whether 24–27 HRC can be used. Until they agree in writing, these 40 pieces stay in QC hold."
    }
  },
  shortage: {
    dispute: {
      label: "Dispute the missing crate",
      status: "Disputed with vendor",
      defaultNote: "Crate C-40 is on Mettherm challan MT/OUT/26-3391 and was not on the truck. Ask them to account for 20 pieces. Leave the GRN at 780."
    },
    acknowledge: {
      label: "Acknowledge the shortage internally",
      status: "Shortage acknowledged",
      defaultNote: "Acknowledge the 20 missing pieces internally. The vendor dispatch stays 800 and the GRN stays 780 so accounts can raise a debit note."
    }
  },
  invoice: {
    hold_all: {
      label: "Hold the entire bill",
      status: "Payment held in full",
      defaultNote: "Do not pay MT/INV/26-1104 until the missing 20 and the rejected 40 are closed. Leave the billed quantity at 800."
    },
    pay_accepted: {
      label: "Pay only the 740 accepted",
      status: "Pay 740 recommended",
      defaultNote: "Recommend payment for 740 accepted pieces only. Ask Mettherm for a debit note or a revised bill for the other 60. Do not rewrite this bill to 740."
    },
    pay_received: {
      label: "Pay the 780 received",
      status: "Pay 780 recommended",
      defaultNote: "Recommend payment for the 780 pieces counted at the gate, and hold the value of 20. The 40 rejects still need a quality decision. The bill stays at 800."
    }
  },
  expedite: {
    chase: {
      label: "Chase the remaining 200",
      status: "Balance chased",
      defaultNote: "Ask Mettherm to dispatch the remaining 200 pieces on 31 Oct. They still need our receipt and inspection before they can go to Bharat Axle."
    }
  },
  customer: {
    partial: {
      label: "Plan to ship the 740",
      status: "Partial shipment planned",
      defaultNote: "Tell Vikram Iyer we can ship 740 against the promise. 260 pieces are not ready. Ask for a date on the balance. This does not create a delivery note."
    },
    hold_ship: {
      label: "Hold the customer shipment",
      status: "Shipment held",
      defaultNote: "Do not ship a partial quantity yet. The promise stays at risk until we agree the customer message."
    }
  }
}

export function createSeed(fixtures, { withDispatch = true } = {}) {
  const state = createInitialState()
  for (const entry of openingHistory) addHistory(state, entry)
  if (withDispatch) {
    importFixture(state, fixtures, {
      fixtureId: "dispatch",
      simulateFailure: false,
      now: "2026-10-28T19:05:00+05:30"
    })
  }
  for (const entry of laterHistory) addHistory(state, entry)
  return state
}

export function importFixture(state, fixtures, { fixtureId, simulateFailure = false, now }) {
  const meta = FIXTURE_META[fixtureId]
  const payload = fixtures[fixtureId]
  if (!meta || !payload) throw new HttpError(400, "Unknown fixture.")
  assertPayload(payload)

  if (simulateFailure) {
    rememberAttempt(state, payload, fixtureId, "failed", now)
    addHistory(state, {
      at: now,
      actor: "Vendor import (simulation)",
      area: "Vendor",
      summary: `Simulated portal timeout for ${payload.updateId}.`,
      detail: "The vendor portal timed out before the update was acknowledged. No quantity was posted."
    })
    return result(state, fixtures, {
      http: 503,
      outcome: "failed",
      updateId: payload.updateId,
      fixtureId,
      message: "Simulated failure: the vendor portal timed out. No quantity was posted. Retry when you are ready.",
      quantitiesUnchanged: true
    })
  }

  const existing = state.imports[payload.updateId]
  if (existing?.status === "applied") {
    if (!sameBusinessPayload(existing.payload, payload)) {
      rememberAttempt(state, payload, fixtureId, "conflict_preserved", now)
      addHistory(state, {
        at: now,
        actor: "Vendor import (simulation)",
        area: "Vendor",
        summary: `Conflicting copy of ${payload.updateId} was rejected.`,
        detail: conflictDetail(existing.payload, payload)
      })
      return result(state, fixtures, {
        http: 409,
        outcome: "conflict_preserved",
        updateId: payload.updateId,
        fixtureId,
        message: conflictDetail(existing.payload, payload),
        quantitiesUnchanged: true
      })
    }
    rememberAttempt(state, payload, fixtureId, "duplicate_ignored", now)
    addHistory(state, {
      at: now,
      actor: "Vendor import (simulation)",
      area: "Vendor",
      summary: `Repeat of ${payload.updateId} ignored.`,
      detail: "This update id was already posted. Quantities were not added again."
    })
    return result(state, fixtures, {
      http: 200,
      outcome: "duplicate_ignored",
      updateId: payload.updateId,
      fixtureId,
      message: `Already posted. ${payload.updateId} was not applied again, so quantities were not double-counted.`,
      quantitiesUnchanged: true
    })
  }

  const record = ensureImport(state, payload, fixtureId)
  record.status = "applied"
  record.payload = payload
  record.appliedAt = now
  record.fixtureId = fixtureId
  rememberAttempt(state, payload, fixtureId, "applied", now)
  addHistory(state, {
    at: now,
    actor: "Vendor import (simulation)",
    area: "Vendor",
    summary: appliedSummary(payload),
    detail: appliedDetail(payload)
  })
  return result(state, fixtures, {
    http: 200,
    outcome: "applied",
    updateId: payload.updateId,
    fixtureId,
    message: appliedDetail(payload),
    quantitiesUnchanged: payload.type !== "dispatch"
  })
}

export function retryImport(state, fixtures, now) {
  const last = state.lastAttempt
  if (!last || last.result !== "failed") {
    throw new HttpError(400, "There is no failed import to retry.")
  }
  return importFixture(state, fixtures, {
    fixtureId: last.fixtureId,
    simulateFailure: false,
    now
  })
}

export function recordDisposition(state, { decision, note, actor, now }) {
  const choice = CHOICES.disposition[decision]
  if (!choice) throw new HttpError(400, "Choose rework, scrap, or a customer concession.")
  const clean = cleanText({ note, actor })
  const entry = {
    id: `QI-26-088-D${state.dispositionHistory.length + 1}`,
    decision,
    label: choice.label,
    status: choice.status,
    note: clean.note,
    actor: clean.actor,
    at: now,
    preserved: {
      acceptedQty: state.documents.inspection.acceptedQty,
      rejectedQty: state.documents.inspection.rejectedQty
    }
  }
  state.disposition = entry
  state.dispositionHistory.push(entry)
  addHistory(state, {
    at: now,
    actor: clean.actor,
    area: "Quality",
    summary: `Disposition recorded: ${choice.label}.`,
    detail: `${clean.note} Inspection QI-26-088 still shows 740 accepted and 40 rejected.`
  })
  return {
    message: `${choice.label}. Accepted and rejected quantities are unchanged.`,
    job: derive(state)
  }
}

export function recordDecision(state, { kind, choice, note, actor, now }) {
  const group = CHOICES[kind]
  if (!group || kind === "disposition") throw new HttpError(400, "Unknown reconciliation.")
  const selected = group[choice]
  if (!selected) throw new HttpError(400, "That option is not available on this decision.")
  const clean = cleanText({ note, actor })
  const entry = {
    id: `DEC-${state.decisionHistory.length + 1}`,
    kind,
    choice,
    label: selected.label,
    status: selected.status,
    note: clean.note,
    actor: clean.actor,
    at: now
  }
  state.decisions[kind] = entry
  state.decisionHistory.push(entry)
  addHistory(state, {
    at: now,
    actor: clean.actor,
    area: areaFor(kind),
    summary: `${titleFor(kind)}: ${selected.label}.`,
    detail: `${clean.note} Source quantities were not edited.`
  })
  return {
    message: `${selected.label}. Source quantities were not edited.`,
    job: derive(state)
  }
}

export function derive(state) {
  const docs = state.documents
  const dispatches = appliedPayloads(state, "dispatch")
  const etas = appliedPayloads(state, "balance_eta")
  const vendorDispatched = dispatches.reduce((sum, item) => sum + item.dispatchedQty, 0)
  const issued = docs.challan.qty
  const received = docs.grn.qty
  const accepted = docs.inspection.acceptedQty
  const rejected = docs.inspection.rejectedQty
  const billed = docs.invoice.billedQty
  const customerOrder = docs.salesOrder.qty
  const otherFinished = state.job.otherFinishedStock
  const stillAtVendor = issued - vendorDispatched
  const unaccounted = vendorDispatched - received
  const inspectionBalance = received - accepted - rejected
  const shippable = accepted + otherFinished
  const deliveryGap = customerOrder - shippable
  const identityTotal = accepted + rejected + unaccounted + stillAtVendor
  const identityOk = identityTotal === issued && inspectionBalance === 0
  const latestEta = etas.at(-1) || null
  const hoursRemaining = Math.round(
    (new Date(docs.salesOrder.promiseAt) - new Date(state.meta.scenarioNow)) / 36e5
  )

  const quantities = {
    customerOrder,
    issuedToVendor: issued,
    vendorDispatched,
    stillAtVendor,
    warehouseReceived: received,
    unaccounted,
    qcAccepted: accepted,
    qcRejected: rejected,
    inspectionBalance,
    invoicedQty: billed,
    invoiceVsReceived: billed - received,
    invoiceVsAccepted: billed - accepted,
    otherFinishedStock: otherFinished,
    shippable,
    deliveryGap,
    identityTotal,
    identityOk
  }

  const projection = {
    label: "Projection, not inventory",
    shippableIfBalancePasses: shippable + Math.max(stillAtVendor, 0),
    gapIfBalancePasses: customerOrder - (shippable + Math.max(stillAtVendor, 0)),
    detail: `If every piece still at the vendor returns and passes inspection, shippable stock would be ${formatPieces(shippable + Math.max(stillAtVendor, 0))}. The order would still be short by ${formatPieces(customerOrder - (shippable + Math.max(stillAtVendor, 0)))}. Rejected pieces and unaccounted pieces are outside that hope.`
  }

  const recorded = countRecorded(state)
  const risk = {
    level: deliveryGap > 0 ? "high" : "clear",
    title: deliveryGap > 0
      ? `${formatPieces(shippable)} can ship. The order is short by ${formatPieces(deliveryGap)}.`
      : "Accepted stock covers the customer order.",
    detail: `Promise is ${formatWhen(docs.salesOrder.promiseAt)}, ${hoursRemaining} hours from the scenario clock. No other finished stock. Decisions do not add pieces.`,
    hoursRemaining,
    recorded,
    totalDecisions: 5
  }

  return {
    simulation: {
      banner: "Vendor portal is simulated. Imports read local JSON fixtures on this machine. Nothing is sent to Mettherm.",
      clock: state.meta.scenarioNow,
      clockLabel: formatWhen(state.meta.scenarioNow),
      promiseLabel: formatWhen(docs.salesOrder.promiseAt)
    },
    company: state.meta.company,
    user: state.meta.user,
    job: {
      ...state.job,
      customer: docs.salesOrder.customer,
      customerPo: docs.salesOrder.number,
      buyer: docs.salesOrder.buyer,
      vendorPo: docs.purchaseOrder.number
    },
    quantities,
    money: moneyView(quantities),
    risk,
    projection,
    bar: identityOk && [accepted, rejected, unaccounted, stillAtVendor].every((n) => n >= 0)
      ? [
          { key: "accepted", label: "Accepted", qty: accepted, tone: "good" },
          { key: "rejected", label: "Rejected", qty: rejected, tone: "hold" },
          { key: "unaccounted", label: "Unaccounted", qty: unaccounted, tone: "risk" },
          { key: "vendor", label: "Still at vendor", qty: stillAtVendor, tone: "vendor" }
        ]
      : null,
    discrepancies: discrepancyCards(state, quantities),
    nextActions: nextActions(state, quantities, latestEta, hoursRemaining),
    rows: bridgeRows(state, quantities, hoursRemaining),
    documents: documentViews(state, quantities, latestEta),
    forms: formViews(state, latestEta),
    ledger: ledgerView(state),
    catalog: Object.values(FIXTURE_META).map((item) => ({ ...item })),
    retry: state.lastAttempt?.result === "failed"
      ? {
          fixtureId: state.lastAttempt.fixtureId,
          updateId: state.lastAttempt.updateId,
          failedAt: formatWhen(state.lastAttempt.at)
        }
      : null,
    history: [...state.history].sort((a, b) => (a.at < b.at ? 1 : -1)).map(presentHistory)
  }
}

function moneyView(q) {
  return {
    rateInr: RATE,
    scheme: "CGST 9% + SGST 9%. Assumed because the plant and the vendor are both in Maharashtra. A tax advisor should confirm the SAC before anyone files.",
    invoice: line(q.invoicedQty),
    accepted: line(q.qcAccepted),
    received: line(q.warehouseReceived),
    gapVsAccepted: line(q.invoiceVsAccepted),
    gapVsReceived: line(q.invoiceVsReceived)
  }
}

function line(qty) {
  const taxable = qty * RATE
  if (taxable % 1 !== 0 || (taxable * 9) % 100 !== 0) {
    throw new Error(`GST for ${qty} pieces is not a whole rupee. Refusing to round it silently.`)
  }
  const cgst = (taxable * 9) / 100
  const sgst = cgst
  return { qty, taxable, cgst, sgst, total: taxable + cgst + sgst }
}

function bridgeRows(state, q, hoursRemaining) {
  const docs = state.documents
  return [
    row("order", "Customer order", q.customerOrder, docs.salesOrder.number, "customer", "Customer", "Firm order. Due on the promise below."),
    row("issued", "Sent for heat treatment", q.issuedToVendor, docs.challan.number, "stores", "Our stores", "Job-work challan. The pieces still belong to us."),
    row("vendor", "Vendor says dispatched", q.vendorDispatched, dispatchesLabel(state), "vendor", "Vendor report", "Imported from the vendor update. Not a warehouse count."),
    row("still", "Still at vendor", q.stillAtVendor, "Issued minus vendor dispatch", "calculated", "Calculated", "Ten crates, C-41 to C-50, if the 800 dispatch is right."),
    row("received", "Counted at our gate", q.warehouseReceived, docs.grn.number, "warehouse", "Our warehouse", "Physical count. Crate C-40 was missing. The slip was not rewritten."),
    row("short", "Vendor dispatch minus gate count", q.unaccounted, "800 − 780", "calculated", "Calculated", "These pieces are in no bin. They are not booked as in transit.", "risk"),
    row("accepted", "Quality accepted", q.qcAccepted, docs.inspection.number, "quality", "Our inspection", "37 crates in FG-HT. This is the only shippable stock.", "good"),
    row("rejected", "Quality rejected", q.qcRejected, docs.inspection.number, "quality", "Our inspection", "Crates C-17 and C-28 in QC-HOLD. Possible rework, not scrap yet.", "hold"),
    row("billed", "Vendor billed", q.invoicedQty, docs.invoice.number, "accounts", "Vendor bill", "Accounts entered the bill as received. It still says 800.", "hold"),
    row("ship", "Ready for the customer", q.shippable, "Accepted plus other finished stock", "calculated", "Calculated", "Other finished stock is 0.", "good"),
    row("gap", "Short of the promise", q.deliveryGap, "Order minus shippable", "calculated", "Calculated", `Due in ${hoursRemaining} hours on the scenario clock.`, "risk")
  ]
}

function row(key, label, qty, document, kind, source, note, tone = "neutral") {
  return { key, label, qty, document, kind, source, note, tone }
}

function dispatchesLabel(state) {
  const applied = appliedPayloads(state, "dispatch")
  if (!applied.length) return "No dispatch update posted"
  return applied.map((item) => item.challanNo).join(", ")
}

function discrepancyCards(state, q) {
  const shortage = state.decisions.shortage
  const invoice = state.decisions.invoice
  return [
    {
      id: "shortage",
      anchor: "shortage",
      tone: "risk",
      title: "Partial receipt against the vendor dispatch",
      left: { label: "Vendor dispatched", qty: q.vendorDispatched, source: "Vendor report" },
      right: { label: "Warehouse received", qty: q.warehouseReceived, source: "GRN-26-1904" },
      gapLabel: `${formatPieces(q.unaccounted)} unaccounted`,
      status: shortage?.status || "Open",
      detail: "Crate C-40 is on the packing slip and not in the unload tally. Neither document has been edited."
    },
    {
      id: "quality",
      anchor: "disposition",
      tone: "hold",
      title: "Inspection split on the pieces we do have",
      left: { label: "Accepted", qty: q.qcAccepted, source: "QI-26-088" },
      right: { label: "Rejected", qty: q.qcRejected, source: "QI-26-088" },
      gapLabel: "40 held for possible rework",
      status: state.disposition?.status || "Disposition open",
      detail: "This is a quality result, not a counting error. The vendor certificate still claims the batch conforms."
    },
    {
      id: "invoice",
      anchor: "invoice",
      tone: "hold",
      title: "Bill does not match what we can use",
      left: { label: "Billed", qty: q.invoicedQty, source: "MT/INV/26-1104" },
      right: { label: "Accepted", qty: q.qcAccepted, source: "QI-26-088" },
      gapLabel: `${formatPieces(q.invoiceVsAccepted)} billed above accepted`,
      status: invoice?.status || "Unreviewed",
      detail: `The bill is also ${formatPieces(q.invoiceVsReceived)} above the gate count. Payment can be held without changing the bill.`
    },
    {
      id: "promise",
      anchor: "customer",
      tone: "risk",
      title: "Customer promise is larger than shippable stock",
      left: { label: "Customer order", qty: q.customerOrder, source: "SO-26-0771" },
      right: { label: "Shippable now", qty: q.shippable, source: "Accepted stock" },
      gapLabel: `${formatPieces(q.deliveryGap)} short`,
      status: state.decisions.customer?.status || "At risk",
      detail: "There is no other finished stock to borrow. A partial shipment is a decision, not a new quantity."
    }
  ]
}

function nextActions(state, q, eta, hoursRemaining) {
  const items = []
  if (!state.decisions.shortage) {
    items.push(action("shortage", "open", "Dispute the 20 unaccounted pieces", "Vendor dispatch stays 800 and the GRN stays 780. Ask Mettherm about crate C-40."))
  } else {
    items.push(action("shortage", "recorded", `Shortage: ${state.decisions.shortage.status}`, "Both source quantities are still the originals."))
  }
  if (!state.disposition) {
    items.push(action("disposition", "open", "Decide what happens to the 40 rejects", "Rework, scrap, or a customer concession. QI-26-088 will still read 740 and 40."))
  } else {
    items.push(action("disposition", "recorded", `Quality: ${state.disposition.status}`, "The original inspection counts were not edited."))
  }
  if (!state.decisions.invoice) {
    items.push(action("invoice", "open", "Hold vendor bill MT/INV/26-1104", `It bills ${formatPieces(q.invoicedQty)}. Inspection accepted ${formatPieces(q.qcAccepted)}.`))
  } else {
    items.push(action("invoice", "recorded", `Invoice: ${state.decisions.invoice.status}`, "The billed quantity is still 800."))
  }
  if (!state.decisions.expedite) {
    const etaLine = eta
      ? `Mettherm's latest message plans dispatch at ${formatWhen(eta.plannedDispatchAt)}.`
      : "No ETA has been imported yet."
    items.push(action("expedite", "open", "Chase the 200 pieces still at Mettherm", etaLine))
  } else {
    items.push(action("expedite", "recorded", "Balance chase recorded", eta ? `Imported ETA: ${formatWhen(eta.plannedDispatchAt)}.` : "No ETA message is posted yet."))
  }
  if (!state.decisions.customer) {
    items.push(action("customer", "open", "Tell the customer what can ship", `${formatPieces(q.shippable)} can go. ${formatPieces(q.deliveryGap)} cannot. The promise is ${hoursRemaining} hours out.`))
  } else {
    items.push(action("customer", "recorded", `Customer plan: ${state.decisions.customer.status}`, "Shippable stock is still the accepted quantity."))
  }
  return items
}

function action(id, status, title, detail) {
  return { id, status, title, detail, href: `/resolve#${id}` }
}

function documentViews(state, q, eta) {
  const docs = state.documents
  const dispatch = appliedPayloads(state, "dispatch")[0]
  return {
    salesOrder: {
      ...docs.salesOrder,
      kind: "customer",
      source: "Customer",
      title: "Sales order",
      status: state.decisions.customer?.status || "Promise at risk"
    },
    challan: {
      ...docs.challan,
      kind: "stores",
      source: "Our stores",
      title: "Delivery challan to vendor",
      status: "Posted"
    },
    purchaseOrder: {
      ...docs.purchaseOrder,
      kind: "stores",
      source: "Our purchase",
      title: "Job-work purchase order",
      status: "Open service order"
    },
    vendorDispatch: dispatch
      ? {
          kind: "vendor",
          source: "Vendor report",
          title: "Vendor dispatch update",
          number: dispatch.challanNo,
          updateId: dispatch.updateId,
          qty: dispatch.dispatchedQty,
          cratesClaimed: dispatch.cratesClaimed,
          dispatchAt: dispatch.dispatchAt,
          dispatchLabel: formatWhen(dispatch.dispatchAt),
          heatBatch: dispatch.heatBatch,
          vehicle: dispatch.vehicle,
          lrNo: dispatch.lrNo,
          note: dispatch.note,
          status: "Imported once. A repeat of this update id will not add pieces."
        }
      : {
          kind: "vendor",
          source: "Vendor report",
          title: "Vendor dispatch update",
          qty: 0,
          status: "No dispatch update is posted.",
          note: ""
        },
    vendorCertificate: {
      ...docs.vendorCertificate,
      kind: "vendor",
      source: "Vendor report",
      title: "Vendor hardness certificate",
      status: "Claim only. Our inspection disagrees for two crates."
    },
    eta: eta
      ? {
          kind: "vendor",
          source: "Vendor report",
          title: "Balance ETA",
          updateId: eta.updateId,
          balanceQty: eta.balanceQty,
          plannedLabel: formatWhen(eta.plannedDispatchAt),
          note: eta.note,
          status: "Posted. Dispatched quantity was not increased."
        }
      : null,
    grn: {
      ...docs.grn,
      kind: "warehouse",
      source: "Our warehouse",
      title: "Goods receipt",
      status: state.decisions.shortage?.status || "Posted at the physical count",
      gateLabel: formatWhen(docs.grn.gateInAt),
      receivedLabel: formatWhen(docs.grn.receivedAt)
    },
    inspection: {
      ...docs.inspection,
      kind: "quality",
      source: "Our inspection",
      title: "Quality inspection",
      inspectedLabel: formatWhen(docs.inspection.inspectedAt),
      status: state.disposition?.status || "740 accepted, 40 rejected, disposition open",
      disposition: state.disposition
        ? { ...state.disposition, atLabel: formatWhen(state.disposition.at) }
        : null
    },
    invoice: {
      ...docs.invoice,
      kind: "accounts",
      source: "Vendor bill",
      title: "Vendor tax invoice",
      billedLabel: formatWhen(docs.invoice.billedAt),
      status: state.decisions.invoice?.status || "Unreviewed. Variance open.",
      amounts: line(docs.invoice.billedQty)
    },
    locations: [
      { bin: "FG-HT", qty: q.qcAccepted, meaning: "Accepted, ready to ship" },
      { bin: "QC-HOLD", qty: q.qcRejected, meaning: "Rejected, waiting on a disposition" },
      { bin: "VENDOR-METTHERM", qty: Math.max(q.stillAtVendor, 0), meaning: "Issued, not on a vendor dispatch" },
      { bin: "No bin", qty: q.unaccounted, meaning: "Vendor says dispatched, gate count does not include them" }
    ]
  }
}

function formViews(state, eta) {
  return {
    disposition: formBlock("disposition", {
      title: "Disposition for the 40 rejected pieces",
      explanation: "QI-26-088 stays 740 accepted and 40 rejected. This records what we will do next.",
      recorded: presentRecord(state.disposition)
    }),
    shortage: formBlock("shortage", {
      title: "The 20 pieces between dispatch and the gate",
      explanation: "Vendor update 800 and GRN 780 both stay. Choose how to chase the gap.",
      recorded: presentRecord(state.decisions.shortage)
    }),
    invoice: formBlock("invoice", {
      title: "Vendor bill for 800 pieces",
      explanation: "MT/INV/26-1104 stays at 800. A hold changes the payment status, not the bill.",
      recorded: presentRecord(state.decisions.invoice)
    }),
    expedite: formBlock("expedite", {
      title: "The 200 pieces still at Mettherm",
      explanation: eta
        ? `An imported ETA says planned dispatch ${formatWhen(eta.plannedDispatchAt)}. Chasing them does not receive them.`
        : "No ETA is posted yet. You can still record the chase, or import the ETA fixture first.",
      recorded: presentRecord(state.decisions.expedite)
    }),
    customer: formBlock("customer", {
      title: "What Bharat Axle is told",
      explanation: "Planning a shipment does not move stock and does not close the 260-piece gap.",
      recorded: presentRecord(state.decisions.customer)
    })
  }
}

function formBlock(kind, extra) {
  const group = CHOICES[kind]
  return {
    ...extra,
    options: Object.entries(group).map(([value, item]) => ({
      value,
      label: item.label,
      defaultNote: item.defaultNote
    }))
  }
}

function presentRecord(record) {
  if (!record) return null
  return { ...record, atLabel: formatWhen(record.at) }
}

function ledgerView(state) {
  return Object.values(state.imports)
    .map((record) => ({
      updateId: record.updateId,
      type: record.type,
      status: record.status,
      fixtureId: record.fixtureId,
      appliedAt: record.appliedAt ? formatWhen(record.appliedAt) : null,
      effect: effectText(record),
      postedQty: record.status === "applied" && record.payload?.type === "dispatch" ? record.payload.dispatchedQty : null,
      attempts: [...record.attempts].reverse().map((attempt) => ({
        ...attempt,
        atLabel: formatWhen(attempt.at)
      }))
    }))
    .sort((a, b) => a.updateId.localeCompare(b.updateId))
}

function effectText(record) {
  if (record.status !== "applied") return "Not posted. Failed or unfinished attempts do not change quantities."
  if (record.payload?.type === "dispatch") return `Posted vendor dispatched quantity ${record.payload.dispatchedQty}.`
  return "Posted as a message. Dispatched quantity was not changed."
}

function countRecorded(state) {
  return ["shortage", "invoice", "expedite", "customer"].filter((kind) => state.decisions[kind]).length
    + (state.disposition ? 1 : 0)
}

function presentHistory(entry) {
  return { ...entry, atLabel: formatWhen(entry.at) }
}

function appliedPayloads(state, type) {
  return Object.values(state.imports)
    .filter((record) => record.status === "applied" && record.payload?.type === type)
    .map((record) => record.payload)
}

function assertPayload(payload) {
  if (!payload || typeof payload !== "object") throw new HttpError(400, "Fixture payload is missing.")
  if (payload.jobRef !== "HT-2026-0142") throw new HttpError(422, "Fixture job reference does not match HT-2026-0142.")
  if (payload.vendorCode !== "METTHERM") throw new HttpError(422, "Fixture vendor does not match Mettherm.")
  if (!payload.updateId) throw new HttpError(400, "Fixture has no update id.")
  if (payload.type === "dispatch") {
    if (!Number.isInteger(payload.dispatchedQty) || payload.dispatchedQty < 0) {
      throw new HttpError(422, "Dispatch quantity must be a whole number of pieces.")
    }
    return
  }
  if (payload.type === "balance_eta") {
    if (!Number.isInteger(payload.balanceQty) || payload.balanceQty < 0) {
      throw new HttpError(422, "Balance quantity must be a whole number of pieces.")
    }
    if (!payload.plannedDispatchAt) throw new HttpError(422, "ETA fixture has no planned dispatch time.")
    return
  }
  throw new HttpError(422, "Unsupported vendor update type.")
}

function sameBusinessPayload(posted, incoming) {
  if (posted.type !== incoming.type) return false
  if (posted.type === "dispatch") return posted.dispatchedQty === incoming.dispatchedQty
  if (posted.type === "balance_eta") {
    return posted.balanceQty === incoming.balanceQty && posted.plannedDispatchAt === incoming.plannedDispatchAt
  }
  return false
}

function conflictDetail(posted, incoming) {
  if (incoming.type === "dispatch") {
    return `Same update id ${incoming.updateId} arrived again with dispatched quantity ${incoming.dispatchedQty}. The posted quantity stays ${posted.dispatchedQty}.`
  }
  return `Same update id ${incoming.updateId} arrived with different ETA data. The posted message was kept.`
}

function appliedSummary(payload) {
  if (payload.type === "dispatch") return `Imported dispatch ${payload.updateId} for ${payload.dispatchedQty} pieces.`
  return `Imported balance ETA ${payload.updateId}.`
}

function appliedDetail(payload) {
  if (payload.type === "dispatch") {
    return `Posted vendor dispatched quantity ${payload.dispatchedQty} from challan ${payload.challanNo}. A second import of ${payload.updateId} will not add pieces.`
  }
  return `Recorded the planned dispatch at ${formatWhen(payload.plannedDispatchAt)}. Vendor dispatched quantity was not changed.`
}

function rememberAttempt(state, payload, fixtureId, resultName, now) {
  const record = ensureImport(state, payload, fixtureId)
  record.lastFixtureId = fixtureId
  record.attempts.push({
    at: now,
    result: resultName,
    fixtureId,
    simulation: true
  })
  state.lastAttempt = { fixtureId, updateId: payload.updateId, result: resultName, at: now }
}

function ensureImport(state, payload, fixtureId) {
  if (!state.imports[payload.updateId]) {
    state.imports[payload.updateId] = {
      updateId: payload.updateId,
      type: payload.type,
      fixtureId,
      status: "not_applied",
      payload: null,
      appliedAt: null,
      attempts: []
    }
  }
  return state.imports[payload.updateId]
}

function addHistory(state, entry) {
  state.seq += 1
  state.history.push({ id: `H-${state.seq}`, ...entry })
}

function cleanText({ note, actor }) {
  const cleanNote = String(note || "").trim()
  const cleanActor = String(actor || "").trim()
  if (cleanActor.length < 2 || cleanActor.length > 80) {
    throw new HttpError(400, "Enter the name of the person recording this.")
  }
  if (cleanNote.length < 8 || cleanNote.length > 600) {
    throw new HttpError(400, "Add a short note, between 8 and 600 characters.")
  }
  return { note: cleanNote, actor: cleanActor }
}

function areaFor(kind) {
  if (kind === "invoice") return "Finance"
  if (kind === "customer" || kind === "expedite") return "Planning"
  return "Warehouse"
}

function titleFor(kind) {
  if (kind === "shortage") return "Shortage decision"
  if (kind === "invoice") return "Invoice decision"
  if (kind === "expedite") return "Balance chase"
  return "Customer plan"
}

function result(state, fixtures, body) {
  const job = derive(state)
  return {
    http: body.http,
    body: {
      simulation: true,
      ...body,
      vendorDispatched: job.quantities.vendorDispatched,
      job
    }
  }
}

export function formatWhen(iso) {
  if (!iso) return ""
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(iso))
  return `${formatted} IST`
}

function formatPieces(qty) {
  return `${new Intl.NumberFormat("en-IN").format(qty)} pcs`
}

export function sourceQuantities(state) {
  const view = derive(state)
  return {
    vendorDispatched: view.quantities.vendorDispatched,
    warehouseReceived: view.quantities.warehouseReceived,
    qcAccepted: view.quantities.qcAccepted,
    qcRejected: view.quantities.qcRejected,
    invoicedQty: view.quantities.invoicedQty,
    grnQty: state.documents.grn.qty,
    inspectionAccepted: state.documents.inspection.acceptedQty,
    inspectionRejected: state.documents.inspection.rejectedQty,
    invoiceQty: state.documents.invoice.billedQty
  }
}
