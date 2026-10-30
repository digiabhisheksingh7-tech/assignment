const JOB_ID = "HT-2026-0142"

const documents = {
  salesOrder: {
    number: "SO-26-0771",
    customer: "Bharat Axle Systems Pvt Ltd",
    buyer: "Vikram Iyer",
    customerPart: "BAS-KN-4418",
    qty: 1000,
    orderedAt: "2026-10-18T11:00:00+05:30",
    promiseAt: "2026-11-01T10:30:00+05:30",
    note: "Single firm order for the Chakan plant. No blanket release and no forecast quantity is included."
  },
  purchaseOrder: {
    number: "PO-HT-26-214",
    vendor: "Mettherm Heat Treat",
    orderedAt: "2026-10-20T15:10:00+05:30",
    service: "Harden and temper, job work",
    qty: 1000,
    rateInr: 230,
    note: "Service order only. The forgings remain Arjun Forge stock while they are at Mettherm."
  },
  challan: {
    number: "DC-8841",
    issuedAt: "2026-10-22T09:40:00+05:30",
    qty: 1000,
    crates: 50,
    crateSize: 20,
    crateRange: "C-01 to C-50",
    ewayBill: "EWB-SAMPLE-2710-8841",
    ewayNote: "Sample e-way number for the prototype. It was not generated on the NIC portal.",
    vehicle: "MH12DE4418",
    note: "Job-work delivery challan. Material value moves with the goods; Mettherm will bill only the treatment."
  },
  grn: {
    number: "GRN-26-1904",
    receivedAt: "2026-10-29T18:10:00+05:30",
    gateInAt: "2026-10-29T16:22:00+05:30",
    qty: 780,
    cratesReceived: 39,
    crateSize: 20,
    missingCrate: "C-40",
    countedBy: "Ramesh Pawar",
    vehicle: "MH14AB2291",
    lrNo: "SL-55281",
    weighbridge: "WB-44190",
    netKg: 1868,
    expectedNetKg: 1872,
    scaleTolerance: "±0.5%",
    locationNote: "740 pieces are not booked here. This document is the gate count only.",
    note: "Packing slip lists C-01 to C-40 (800 pieces). Unload tally found C-01 to C-39. Crate C-40 was not on the truck. The slip was left as the vendor wrote it."
  },
  inspection: {
    number: "QI-26-088",
    inspectedAt: "2026-10-30T10:05:00+05:30",
    inspector: "Farzana Shaikh",
    method: "Rockwell C",
    tester: "HT-RC-02",
    calibratedAt: "2026-10-02",
    spec: "28–32 HRC",
    acceptedQty: 740,
    rejectedQty: 40,
    acceptedCrates: 37,
    rejectedCrates: ["C-17", "C-28"],
    acceptedLocation: "FG-HT",
    rejectedLocation: "QC-HOLD",
    heatBatch: "HB-7721",
    readings: [
      { sample: "C-17 / 1", hrc: 25.2, result: "Reject" },
      { sample: "C-17 / 2", hrc: 24.8, result: "Reject" },
      { sample: "C-17 / 3", hrc: 26.0, result: "Reject" },
      { sample: "C-17 / 4", hrc: 25.5, result: "Reject" },
      { sample: "C-28 / 1", hrc: 26.4, result: "Reject" },
      { sample: "C-28 / 2", hrc: 25.9, result: "Reject" },
      { sample: "C-28 / 3", hrc: 26.8, result: "Reject" },
      { sample: "C-28 / 4", hrc: 25.1, result: "Reject" },
      { sample: "C-04 / 1", hrc: 30.1, result: "Accept" },
      { sample: "C-09 / 1", hrc: 29.4, result: "Accept" },
      { sample: "C-22 / 1", hrc: 31.0, result: "Accept" },
      { sample: "C-33 / 1", hrc: 28.6, result: "Accept" }
    ],
    note: "Both failed crates were quarantined as lots of 20. Re-temper may recover them. Decarburisation has not been checked, so they are not scrap yet."
  },
  invoice: {
    number: "MT/INV/26-1104",
    billedAt: "2026-10-28T20:10:00+05:30",
    enteredBy: "Meera Joshi",
    billedQty: 800,
    rateInr: 230,
    taxScheme: "CGST 9% + SGST 9%",
    placeOfSupply: "Maharashtra",
    irn: null,
    note: "Entered from the vendor bill copy. The desk did not copy the dispatch quantity onto this bill. IRN was not on the copy accounts received, so it is not verified."
  },
  vendorCertificate: {
    number: "MT/CERT/HB-7721",
    heatBatch: "HB-7721",
    claimedQty: 800,
    claimedAverageHrc: 30.2,
    claim: "Vendor certificate says the whole dispatched batch conforms.",
    note: "This is Mettherm's claim. QI-26-088 does not edit it. Crates C-17 and C-28 failed our hardness check."
  }
}

export function createInitialState() {
  return {
    seq: 0,
    meta: {
      scenarioNow: "2026-10-30T10:30:00+05:30",
      company: {
        name: "Arjun Forge Components Pvt Ltd",
        plant: "Plot 18, Phase 2, Chakan MIDC, Pune",
        gstin: "Sample GSTIN, not a registered taxpayer"
      },
      user: {
        name: "Anita Deshmukh",
        role: "Production manager"
      }
    },
    job: {
      id: JOB_ID,
      part: "AFC-SK-4418-HT",
      partName: "Steering knuckle, right hand",
      material: "42CrMo4 pre-machined forging",
      process: "Harden and temper",
      hardness: "28–32 HRC",
      pieceWeightKg: 2.4,
      otherFinishedStock: 0,
      vendor: "Mettherm Heat Treat",
      vendorContact: "Suresh Kulkarni, vendor desk (sample contact, not a live number)"
    },
    documents,
    imports: {},
    lastAttempt: null,
    disposition: null,
    dispositionHistory: [],
    decisions: {
      shortage: null,
      invoice: null,
      expedite: null,
      customer: null
    },
    decisionHistory: [],
    history: []
  }
}

export const openingHistory = [
  {
    at: "2026-10-18T11:20:00+05:30",
    actor: "Sales",
    area: "Planning",
    summary: "Customer order SO-26-0771 confirmed for 1,000 pieces.",
    detail: "Bharat Axle Systems needs finished knuckles by 1 Nov 2026, 10:30 IST. No other finished stock is on hand."
  },
  {
    at: "2026-10-20T15:20:00+05:30",
    actor: "Purchase",
    area: "Vendor",
    summary: "Job-work order PO-HT-26-214 placed on Mettherm for 1,000 pieces.",
    detail: "Rate ₹230 per piece for harden and temper. The purchase order quantity is not a receipt and not a bill."
  },
  {
    at: "2026-10-22T09:50:00+05:30",
    actor: "Ramesh Pawar",
    area: "Warehouse",
    summary: "Delivery challan DC-8841 sent 1,000 pieces to Mettherm.",
    detail: "50 crates, C-01 to C-50. Sample e-way bill EWB-SAMPLE-2710-8841. Stock stays ours while it is at the vendor."
  }
]

export const laterHistory = [
  {
    at: "2026-10-28T20:15:00+05:30",
    actor: "Meera Joshi",
    area: "Finance",
    summary: "Vendor bill MT/INV/26-1104 entered for 800 pieces.",
    detail: "Taxable value is 800 × ₹230. The bill was not reduced to the gate count or the accepted count."
  },
  {
    at: "2026-10-29T18:20:00+05:30",
    actor: "Ramesh Pawar",
    area: "Warehouse",
    summary: "GRN-26-1904 posted for 780 pieces.",
    detail: "Crate C-40 was on the vendor slip and not on the truck. Weighbridge net 1,868 kg against 1,872 kg expected for 780 pieces. The GRN was not changed to 800."
  },
  {
    at: "2026-10-30T10:12:00+05:30",
    actor: "Farzana Shaikh",
    area: "Quality",
    summary: "Inspection QI-26-088 accepted 740 and rejected 40.",
    detail: "Crates C-17 and C-28 are below 28 HRC and sit in QC-HOLD. The other 37 received crates are in FG-HT. The vendor certificate still says the batch conforms."
  },
  {
    at: "2026-10-30T10:25:00+05:30",
    actor: "System",
    area: "Planning",
    summary: "Customer delivery marked at risk.",
    detail: "740 pieces can ship. The order is 1,000 and the promise is 48 hours from the scenario clock. Nothing else is in finished stock."
  }
]
