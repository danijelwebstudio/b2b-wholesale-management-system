# Interview Guide — B2B Wholesale Operations System

This file is a speaking guide, not text to memorize word-for-word.

## 30-second version

> I built a mobile B2B operations app for a wholesale workflow with two roles: the wholesaler and retail stores. Stores send free-form orders, the warehouse confirms actual quantities and prices, invoices are created, and the system tracks debt, partial payments, packaging returns and transaction history. I first built it as a working MVP, then refactored the risky parts: JWT and role authorization, server-side store isolation, structured invoice items, server-generated IDs and timestamps, and a transactional payment-allocation flow in PostgreSQL with row locking and an allocation audit trail. I also added focused automated tests for authorization and payment allocation.

## 2-minute technical walkthrough

Start with the business problem, not the stack.

1. **Ordering** — A store can send requests quickly in the same informal language used in day-to-day wholesale work.
2. **Fulfillment** — The warehouse does not blindly trust the request quantity. It enters what was actually delivered, its price, or marks an item unavailable.
3. **Invoice/debt** — The invoice stores structured items and contributes to the store's outstanding balance.
4. **Payment** — A company user enters only the store and amount. The backend locks open invoices and allocates the amount from the oldest invoice forward.
5. **Auditability** — The payment and every invoice allocation are committed together in one database transaction.
6. **Authorization** — A store only receives its own invoices, and its identity comes from the JWT rather than a client-supplied store ID.

## The most useful refactor story

A good answer to “what was difficult?” is the payment flow.

The original MVP calculated the waterfall on the frontend. It worked during normal manual testing, but it had two weaknesses:

- the client was trusted with business-critical financial state;
- invoice updates and the transaction-history write were separate HTTP operations.

That creates partial-failure and concurrency risks. I moved the algorithm to a backend service and changed the API so the client sends only intent. The server opens a PostgreSQL transaction, selects open invoices oldest-first with `FOR UPDATE`, validates current debt, calculates allocations in integer cents, writes the payment and allocation records, updates invoices, then commits. Any error rolls the entire operation back.

## Questions you should be ready for

### Why JWT?

It gives the API an authenticated identity on every protected request without trusting navigation state or local UI state. The important part is not “JWT is modern”; it is that authorization decisions are made on the server from a verified identity.

### Authentication vs authorization?

Authentication answers “who are you?”. Authorization answers “are you allowed to do this?”. A valid store token is authenticated, but it is not authorized to call company-only routes.

### Why not send `trgovinaId` from the store app?

Because the client can be modified. For store-created orders, the backend takes the store ID from the verified token subject. A manipulated request therefore cannot impersonate another store.

### Why `FOR UPDATE`?

A payment depends on the current unpaid amount. Without locking the selected invoice rows, two concurrent requests could both calculate from the same stale balance and over-apply money. The row lock serializes that critical section until commit/rollback.

### Why cents if PostgreSQL already has `NUMERIC`?

PostgreSQL stores money values as exact numeric values, but JavaScript `Number` is floating point. The allocation service converts input amounts to integer cents before arithmetic so repeated subtraction/comparison does not depend on floating-point decimals.

### Why a separate allocation table?

One payment can affect several invoices. A transaction-to-invoice allocation table preserves that many-to-many accounting detail and provides an audit trail instead of only storing the final invoice totals.

### Why keep free-form order input?

Because the workflow is optimized for fast store ordering. The order request is not treated as authoritative accounting data; the warehouse records the actual fulfilled quantity and price when creating the invoice.

### What is still missing?

Do not say “nothing”. Good next steps are integration tests with a test database, environment-based mobile configuration, a production session strategy, pagination, deployment/monitoring, and stronger centralized input validation. Overpayments are currently rejected rather than stored as customer credit.

## What not to claim

Avoid saying:

- “production-ready ERP”;
- “natural-language parser”;
- “complete test coverage”;
- “supports overpayments/customer credit”;
- “used in production” unless that becomes factually true later.

Use: **working B2B operations prototype / portfolio project with production-inspired backend safeguards**.
