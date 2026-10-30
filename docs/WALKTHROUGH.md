# Three-minute walkthrough

In the running desk, choose **Play 3-minute walkthrough** in the sidebar. Sound on. Captions stay on screen if the machine is muted.

The button resets the job, then spends about three minutes on the live screens. It does not edit the posted figures.

| Time | Screen | What it shows |
| --- | --- | --- |
| 0:00 | Overview | 1,000 ordered, 740 shippable, 260 short, 48 hours left |
| 0:35 | Overview | 740 + 40 + 20 + 200 = 1,000 |
| 1:00 | Source records | Vendor slip, weighbridge, certificate, and bill kept apart |
| 1:25 | Vendor import | The 800-piece file imported again does not add pieces |
| 1:45 | Vendor import | Simulated timeout, retry, then a second ETA import that does not double |
| 2:15 | Vendor import | Same update id claiming 1,000 is rejected. Posted quantity stays 800 |
| 2:30 | Resolve | 40 sent for re-temper. Bill for 800 held in full |
| 2:45 | History | Status and history changed. Accepted 740, rejected 40, gate 780, bill 800 |
| 2:50 | History | Build the ledger here. Tally for the books. File inbox for the vendor. Typed e-way number until a GST sandbox exists |

## Transcript

This is the heat-treatment desk for Arjun Forge, a small auto-parts plant in Chakan. Bharat Axle needs one thousand finished steering knuckles. The promise is forty-eight hours away, and there is no other finished stock.

We sent one thousand pieces to Mettherm for harden and temper. The vendor says they dispatched eight hundred. Our gate counted seven hundred and eighty. Quality accepted seven hundred and forty and rejected forty for possible rework. The vendor billed eight hundred. Seven hundred and forty can ship. The order is short by two hundred and sixty.

The bar is the whole delivery challan. Seven hundred and forty accepted, forty rejected, twenty unaccounted, and two hundred still at the vendor. Those figures add back to one thousand. A decision on this desk never adds a piece.

These are separate documents. The vendor slip says crate C-40 left their gate. Our unload tally did not find it. The weighbridge is four kilos under a seven hundred and eighty piece load, so the scale supports the gate count. Their hardness certificate still says the batch conforms. Our inspection rejected crates C-17 and C-28. The certificate and the bill stay as they wrote them.

This vendor portal is a simulation. It reads a local JSON file. The dispatch of eight hundred is already posted. Importing it again does not add pieces. The ledger shows a duplicate, and the quantity stays eight hundred.

A simulated portal timeout fails the balance update before anything is posted. Retry sends the same file without the timeout. The ETA is stored once, and the dispatch quantity does not change. Importing that ETA again does not double it.

The last file uses the same update id but claims one thousand pieces. The desk keeps the posted eight hundred and leaves the new figure out.

Two decisions are recorded. The forty rejects go back for re-temper. The bill for eight hundred is held in full. Status, next action, and history all update. Accepted stays seven hundred and forty, rejected stays forty, the gate stays seven hundred and eighty, and the bill stays eight hundred. The customer is still short.

The wider ERP keeps this ledger inside the product, not in a separate MES. If the company already files from Tally, Tally keeps the books and the e-invoice, and this desk sends one approved voucher. The vendor has no API, so this file inbox is the integration. A GST sandbox can take longer than a month, so a typed e-way number is the fallback. A duplicate or a conflicting vendor file must never change a posted quantity.
