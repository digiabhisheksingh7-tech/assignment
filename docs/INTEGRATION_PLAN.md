# Third-party integration plan

The heat-treatment desk becomes a small manufacturing ERP only if the subcontracting ledger stays inside the product. Most of the pain in this scenario is a document boundary, not a missing connector. Buy or connect the things that are someone else’s network: GST, the company’s existing books, email, and file storage. Leave payroll, a plant MES, and a data warehouse alone until a named process needs them.

Anything marked **Unverified** was not proven against this company’s vendor, bank, or customer.

## Build these inside the ERP

- Job-work stock: material at Mettherm is still our stock, in a vendor location.
- Separate documents for the delivery challan, vendor update, goods receipt, inspection, and vendor bill.
- A derived gap that is not stored back onto those documents.
- An inbound inbox with an idempotency key, the same rule as `updateId` in this prototype.
- Bins for accepted, quality hold, and “no bin” when a piece is unaccounted.
- Batch and crate identity on every quantity.
- Roles for stores, quality, production, and accounts. Accounts can see a bill. They cannot edit a hardness result.
- A payment recommendation. The bank payment itself stays outside.

## Team and access assumed

- Now: one developer, a laptop, sample data, no vendor and no sandbox credentials.
- For the month plan: the same developer, plus the production manager for about two hours a week to check the words on the quantity bridge.
- No separate QA, DevOps, or integration engineer.
- Tally, if they already own it, is on one office PC. A GST Suvidha Provider sandbox needs a registration and often takes longer than a week. The vendor will send Excel or a PDF, not an API. No bank has offered an API. No customer has named an EDI standard.

## Integration table

Need is **Essential**, **Optional**, or **Not applicable**.

| Area | Need | Recommended approach | Fastest practical implementation | Failure and fallback |
| --- | --- | --- | --- | --- |
| Existing books and open job-work data | Essential | Keep Tally as the book of record if the company already files from it. Build stock and subcontracting here. One-way vouchers only. | CSV for items, vendors, customers, and open challans. Approved vendor bills later go to Tally as XML over HTTP on the Tally port. [Tally XML integration](https://help.tallysolutions.com/xml-integration/), [prerequisites](https://help.tallysolutions.com/pre-requisites-for-integrations/). | Tally is down or the company is not loaded: queue the voucher and show it unposted. Never write a receipt back from Tally. Duplicate voucher numbers are rejected. If there is no Tally company, export the same voucher as JSON and stop. |
| Customers, orders, portals, EDI, forecasts | Sales orders essential. CRM, portal, EDI, forecasts not applicable yet | Sales orders and promise dates live in this ERP. | A sales-order screen and a CSV of open orders. No CRM product. | A missed promise is a row on this desk, not a sync job. EDI is **Unverified** until a customer names the standard. Until then, email the discrepancy. Forecasts stay in the planner’s sheet. |
| Suppliers, dispatches, bills, portals | Essential | Build the purchase order, challan, inbox, receipt, and bill match. A vendor portal is optional. | Reuse this prototype’s fixture adapter. The same function accepts the JSON file, a CSV with the same columns, or a later webhook. Idempotency key is the vendor update id. | Timeout: the attempt is stored and a person retries, as on the import screen. A second copy of the same id does not add quantity. A copy with a different quantity is rejected and the posted quantity stays. If the vendor has no API, email plus a file is the interface. **Unverified** that Mettherm will ever offer a portal. |
| BOM, drawings, revisions | BOM and revision essential. CAD / PLM not applicable | One BOM line: the knuckle needs this heat-treatment step. Drawings are PDFs with a revision. | Store the file next to the part. The job stores the revision it was issued against. | A missing drawing blocks issue of the challan. It does not block viewing a receipt already posted. No CAD connector until they name the CAD tool. |
| Production scheduling and shop-floor reporting | A job status essential. A separate MES not applicable | This subcontract step is the schedule: sent, part-received, inspected, at risk. | Status is derived from the documents already on the job. | If the desk is down, stores keep the paper challan and post the receipt when it is back. Do not invent a second MES for one vendor process. |
| Machines, IoT, maintenance | Not applicable | The furnace belongs to Mettherm. Do not connect it. | Nothing in the first month. If they later connect their own machines, start with OPC UA and a named machine. [OPC UA reference](https://reference.opcfoundation.org/). **Unverified** against any machine they own. | Machine data never overwrites a goods receipt or a hardness result. A dead collector leaves the last good reading and an “offline” flag. |
| Warehouse, scanners, scales, transport | Locations and a barcode-ready receipt essential. RFID and a WMS not applicable. Scale and transporter tracking optional | Three locations are enough: FG-HT, QC-HOLD, VENDOR-METTHERM. USB scanners type into the crate field. | Keyboard-wedge input needs no SDK. The weighbridge ticket number is typed, as on GRN-26-1904. The lorry receipt number is a field. | A missed scan falls back to typing the crate id. A scale that disagrees with the piece count is shown beside the count, not copied over it. Transporter GPS is **Unverified**. The lorry receipt and the e-way bill are the record. |
| Quality results, certificates, traceability | Essential inside the ERP. A LIMS is not applicable | Inspection is our document. The vendor certificate is their document. Heat batch and crate link them. | Typed Rockwell readings and a PDF of the certificate in file storage. | A missing certificate does not change our accept and reject counts. A second inspection is a new document. It does not edit QI-26-088. No instrument connector until the tester model is known. |
| Bank payments and statement matching | Optional | Pay from the bank’s own channel. This ERP only recommends the amount and stores the reference. | Import a statement CSV when someone downloads it. Match the reference on the vendor bill. | No bank API is assumed. **Unverified** per bank. If the file is late, the bill stays “payment recommended” and unpaid in the desk. Duplicate statement lines match on reference plus amount plus date and post once. |
| GST, e-invoice, e-way bill | Essential, and not a custom GST client in month one | Sales e-invoices and e-way bills are generated where the books already are, or through one GSP. Vendor IRNs are checked, not created by us. Job-work movement uses a delivery challan. | If Tally stays, use Tally’s own IRP setup. [Tally e-invoicing](https://help.tallysolutions.com/one-time-setup-for-e-invoicing/), [Tally e-way bill](https://help.tallysolutions.com/e-way-bill-one-time-setup/). Direct NIC APIs exist if volumes justify them: [e-invoice sandbox](https://einv-apisandbox.nic.in/api-overview.html), [e-way bill API](https://docs.ewaybillgst.gov.in/apidocs/api-overview.html). Confirm the current job-work threshold and document type on the portal before coding. | IRP down: save the invoice as not filed and retry. Do not ship on a made-up IRN. A rejected payload is fixed and sent again. The same invoice number must not create two IRNs. Our desk can store an e-way number typed from the portal if the API is not approved yet. |
| HR, payroll, attendance, SSO | Not applicable | Leave payroll where it is. Four named users do not need an identity provider. | Local users and passwords in week one, only if the desk leaves a single shared laptop. | A forgotten password is reset by the developer in month one. Attendance does not gate a goods receipt. |
| Email, WhatsApp, files, OCR, e-sign | Email and file storage essential. WhatsApp and OCR optional. E-sign not applicable in v1 | Email the vendor about crate C-40. Store certificates as files. | SMTP through Nodemailer and the company’s mailbox. [Nodemailer](https://nodemailer.com/). Files on disk now, MinIO when more than one PC needs them. [MinIO](https://min.io/docs/minio/linux/index.html). WhatsApp only through the official Cloud API, after template approval. [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/). | Mail server down: the decision is still saved, and the outbox shows unsent. Sending the same decision twice uses the decision id so the vendor does not get two disputes. OCR of a vendor PDF is **Unverified** and must not post a quantity. A person checks it. Wet signature on the challan is enough until a customer demands e-sign. |
| Reporting and exports | Operational screens essential. A warehouse of data is not applicable. Metabase is optional | The quantity bridge is the report. | CSV of the job, the ledger, and the history from this API. Metabase can sit on PostgreSQL later. [Metabase](https://www.metabase.com/docs/latest/). | If a BI tool is down, the desk screens and the CSV still work. Exports are generated, not edited back into stock. |

## Action plan

### Framework and tools

Stay on React (Vite) and Node.js (Express). Replace the JSON file with PostgreSQL when a second person uses the desk. [PostgreSQL](https://www.postgresql.org/docs/current/). Add BullMQ and Redis only when email and file imports need a retry queue. [BullMQ](https://docs.bullmq.io/).

The import route in this prototype is the adapter. File, CSV, and a future webhook all call it and hit one unique key.

### What to reuse, and what to build

Reuse: this quantity derivation and the idempotent inbox; Tally for returns and e-invoice if they already use Tally; NIC’s invoice schema rather than a homemade one; Nodemailer; later MinIO and, only if someone asks for dashboards, Metabase.

Build: the document model, the gap screen, dispositions, roles, the job-work challan, and the voucher payload we hand to Tally.

Do not build: a bank, payroll, a MES, a PLM, a TMS, a LIMS, or a private WhatsApp client.

Adopting all of ERPNext would be faster for a generic ERP and worse for this screen. The first month copies ERPNext’s document boundaries. It does not install ERPNext.

### Sequence

**Two days.** This prototype is that deliverable: one job, source documents, derived gaps, idempotent import, a simulated timeout and retry, decisions, history, and a local file.

**First week.**

- PostgreSQL with a unique constraint on the vendor update id.
- Four local users. No SSO.
- Enter a goods receipt and an inspection instead of only deciding on seeded ones.
- A one-page PDF of the open gaps to attach to the vendor email.
- The same dispatch columns accepted as CSV through the existing importer.

**First month.**

- Sales order and promise date as entered data.
- Delivery-challan PDF with a typed e-way number.
- Tally XML for an approved vendor-bill voucher, against a sample company, with no live filing.
- Email when a gap opens, with the decision id as the idempotency key.
- Crate id typed or scanned into the receipt.
- E-way and e-invoice APIs stay manual until sandbox access exists.

### What can slip, and what does not

Sandbox approval for a GSP, a Tally licence on a PC we control, WhatsApp template approval, and any vendor API are outside the month if they are not already in hand. The desk does not wait on them. Typed e-way numbers, a JSON voucher, and email cover the gap.

The quantity rule does not slip: a retry, a duplicate file, or a conflicting file must leave 800, 780, 740, and 40 as they were posted.
