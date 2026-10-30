# Arjun Forge heat-treatment desk

A local prototype for a small auto-parts manufacturer in Chakan. One customer order of 1,000 steering knuckles has gone out for harden-and-temper, and the vendor dispatch, the gate count, the inspection, and the vendor bill do not agree. The desk keeps those records side by side and lets a production manager act without “correcting” the numbers into a single story.

This is sample data for a fictional company. It does not connect to a vendor, a GST portal, or a bank.

## Run it

Requirements: Node.js 20 or newer.

```bash
npm install
npm run setup
npm test
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). If that port is already taken, Vite prints the port it actually used. The API is [http://localhost:4000](http://localhost:4000). `npm test` checks the quantity identity, idempotent import, simulated timeout, conflict handling, and that decisions do not edit source documents.

**Play 3-minute walkthrough** is in the sidebar. It speaks the script, shows captions, and drives the real screens: the quantity gap, the separate documents, a duplicate import, a simulated timeout and retry, a conflicting file, a rework decision, a bill hold, and the integration choices. Turn sound on. The button resets the scenario first, so the figures return to 800, 780, 740, and 40 before it starts. The transcript is `docs/WALKTHROUGH.md`.

`npm run build` then `npm start` serves the built page and the API together on port 4000.

The prototype stores state in `backend/data/state.json`. **Reset scenario** in the sidebar puts the original documents back.

## The scenario

Scenario clock: 30 Oct 2026, 10:30 IST. Promise: 1 Nov 2026, 10:30 IST (48 hours). There is no other finished stock.

| Record | Pieces | Document |
| --- | ---: | --- |
| Customer order | 1,000 | SO-26-0771 |
| Sent to Mettherm | 1,000 | DC-8841, 50 crates |
| Vendor says dispatched | 800 | MT/OUT/26-3391, imported once |
| Still at the vendor | 200 | Calculated. Crates C-41 to C-50 |
| Counted at our gate | 780 | GRN-26-1904. Crate C-40 was not on the truck |
| Accepted | 740 | QI-26-088, location FG-HT |
| Rejected, possible rework | 40 | QI-26-088, crates C-17 and C-28 in QC-HOLD |
| Vendor billed | 800 | MT/INV/26-1104 |
| Shippable | 740 | Accepted stock only |
| Short of the promise | 260 | Calculated |

They add back: 740 + 40 + 20 + 200 = 1,000. The 20 unaccounted pieces are not given a bin.

## What to click

1. **Overview** shows the delivery risk, the split of the 1,000 pieces, and the open gaps.
2. **Quantities** lists every figure with the document and the person who reported it.
3. **Source records** keeps the vendor slip, the weighbridge, the hardness readings, and the bill apart.
4. **Vendor import** is simulated. It reads `backend/fixtures/*.json`.
   - Import the 800-piece dispatch again. The quantity stays 800.
   - Tick **Simulate a vendor portal timeout**, import the balance ETA, then **Retry last failure**. The ETA posts once and does not increase the dispatch.
   - Import the conflicting copy. It says 1,000 on the same update id. The posted quantity stays 800.
5. **Resolve** records a disposition or a reconciliation. Statuses, next actions, and history change. The 800 / 780 / 740 / 40 figures do not.
6. **History** is the audit list. Refresh the browser. The JSON file still has the decision.

## Research that shaped the desk

Two manufacturing ERPs already split this work across documents. The desk follows that split and refuses the last step, where a clerk overwrites one document so the set “matches”.

**Odoo 19 subcontracting.** In the resupply flow the company sends components to the subcontractor and validates a receipt for what actually comes back. The components are not a sale. Lead times are estimates, not promises.

- [Subcontracting overview](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/subcontracting.html)
- [Resupply subcontracting](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/subcontracting/subcontracting_resupply.html)
- [Basic subcontracting, including the receipt](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/subcontracting/subcontracting_basic.html)
- [Resupply lead times](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/subcontracting/resupply_subcontracting_lead_times.html)

Odoo 15’s quality document says a check for subcontracted parts is set on the receipt, so inspection is not the vendor’s certificate. I did not re-verify that the 19.0 screens use the same control-point wording: [Quality control, Odoo 15](https://www.odoo.com/documentation/15.0/applications/inventory_and_mrp/manufacturing/management/quality_control.html).

**ERPNext subcontracting.** A subcontracting order sends raw material to a supplier warehouse. A subcontracting receipt takes finished goods back and can record scrap. The purchase invoice, not the receipt, creates the supplier payable. Incoming inspection is its own document, and accepted and rejected quantities can land in different warehouses.

- [Subcontracting](https://docs.frappe.io/erpnext/subcontracting)
- [Quality inspection](https://docs.frappe.io/erpnext/quality-inspection)
- [Purchase receipt, accepted and rejected quantity](https://docs.frappe.io/erpnext/purchase-receipt)

What that changed here:

- DC-8841 leaves the knuckles as our stock. `VENDOR-METTHERM` is a location for the 200 not yet dispatched back.
- The vendor update, GRN, inspection, and bill are stored separately. The screen derives the gaps.
- Rejected pieces sit in `QC-HOLD` and are excluded from shippable stock.
- The remaining 200 stay visible. They are not cancelled to make the receipt look complete.
- A decision never rewrites 800 to 780 or 740.

## Assumptions

- One firm sales order, one vendor, one heat batch, one job. The order is not a forecast.
- This is job work. Mettherm bills the process at ₹230 per piece. The forgings stay ours.
- Both parties are in Maharashtra, so the sample tax is CGST 9% plus SGST 9%. Taxable value on 800 pieces is ₹1,84,000, GST is ₹33,120, and the bill total is ₹2,17,120. The SAC code is not confirmed. A tax advisor has to confirm it before anyone files.
- Crate size is 20. The gaps are whole crates: one crate missing at the gate, two crates rejected, ten crates still at the vendor.
- Piece weight is 2.4 kg. The weighbridge is 4 kg under the 780-piece expectation and about 48 kg under an 800-piece load, so the scale supports the gate count.
- The 40 rejects might take a re-temper. Decarburisation was not checked, so they are not scrap yet.
- The 20 missing pieces are not booked as in transit. The vendor says they left. The warehouse did not count them.
- The scenario clock is fixed, so the two-day risk stays put while someone reviews the prototype. Decisions you record use the computer’s clock.
- The vendor has no API. The JSON fixtures stand in for a portal export.
- GSTINs, the e-way number, and the people are samples.

## Limitations

- One seeded job. The UI does not open a second order or post a fresh goods receipt.
- No login, no PDF, no email, no e-way bill, no payment.
- Persistence is one JSON file on one Node process.
- The “if the 200 come back and pass” line is a projection. It is not stock.
- The walkthrough is spoken by the browser from `frontend/public/narration.wav`. It is not a separately exported video file.

## AI tools, and one correction

Built in Cursor with Grok 4.7. Official Odoo, ERPNext, Tally, and NIC pages were checked in the browser’s search results while writing the research and the integration plan.

An early pass treated “vendor dispatched 800” and “invoice 800” as one number, and a reconciliation button reduced the bill to 740 so the screens agreed. That hides the dispute. The bill stays 800, the receipt stays 780, and the inspection stays 740 / 40. A decision changes status, next action, and history only.

The same pass had the invoice total as ₹2,21,120. That arithmetic was wrong. 800 × ₹230 is ₹1,84,000. GST at 18% is ₹33,120. The total on the desk is ₹2,17,120.

## Time

Actual clock time on 30 October 2026. The suggested hours in the brief were not used as the log.

| Task | Suggested | Actual |
| --- | --- | --- |
| Research and prototype | 3 hours | 25 minutes, 22:50–23:15 IST |
| Integration plan | 2 hours | 10 minutes, 23:15–23:25 IST |
| README and the three-minute walkthrough | inside the five-hour cap | 15 minutes, 23:25–23:40 IST |

Total about 50 minutes, inside the five-hour limit. SAC confirmation, a live IRN check, and a GSP or Tally sandbox were not part of the brief, and they are not done.
