# Demo Checklist

Target length: **2–4 minutes**. Do not try to show every button.

## Before recording

- Backend is running.
- Expo app can reach the LAN backend.
- Database has a clean demo state or at least one understandable store balance.
- Phone battery/network are stable.
- No terminal window exposes `.env` values.
- Use `trgovina1` and `firma`; keep `trgovina2` for the isolation proof if needed.

## Recommended demo flow

1. **Store login** — show `Trgovina Centar` and current debt.
2. **Create an order** — enter 2–3 items, including one free-form request such as `Crvena paprika samo 3 kg`.
3. **Company login** — open incoming orders and show that the new order belongs to the correct store.
4. **Fulfillment** — enter actual quantity/price for one item and mark another `NEMA NA STANJU`.
5. **Invoice** — create it and briefly show the store balance increased.
6. **Partial payment** — record a small payment from the company debt screen.
7. **Store view** — show the reduced outstanding balance / partially paid invoice.
8. **History** — show the transaction record.

Optional final proof: log in as `trgovina2` and show that it does not see Trgovina Centar's invoices/debt.

## Narration structure

Use three sentences repeatedly:

- **Problem:** what the business user needs to do.
- **Action:** what the screen does.
- **Engineering point:** what the backend guarantees.

Example:

> A store sends the order quickly without needing perfect structured quantities. The warehouse later records what was actually fulfilled. When money is applied, the phone does not decide invoice balances—the backend handles the allocation transactionally and records exactly which invoices were affected.

## Recording tips

- Keep typing fast; use short product names.
- Do not explain every dependency.
- Avoid scrolling through source code during the product demo.
- If you want a technical follow-up video, keep it separate and show `middleware/auth.js`, `services/paymentAllocator.js`, and the transaction route.
