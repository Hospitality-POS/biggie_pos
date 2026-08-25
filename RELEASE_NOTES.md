# Release Notes — Accounting & Invoices Update

## Frontend (`biggie_pos`)

### Reports
- P&L / period reports now send `from`/`to` only and no longer incorrectly pull in the whole financial year.
- Journal Entries page: added entry number search.
- `/reports` route now grants access to users with either `REPORTS_ITEM_SALES` or the new `REPORTS_VIEW` permission.

### Invoices
- Invoice table shows `Posted` / `Not Posted` badges.
- Invoice detail view displays the linked `journal_entry_id` entry number.
- New `Post to Accounting` row action for non-Draft, non-Voided, unposted invoices.
- Added quick filter on `/orders` for All, Not Posted, Due, Pending, Paid, Overdue.
- Cart/invoice requests now include `shop_id`.

### Access Control
- Added `REPORTS_VIEW` permission under Accounting scope.
- `PermissionRoute` now accepts a single permission or an array (any match).

## Backend (`biggie_api`)

- New `PATCH /accounting/invoices/:id/post` endpoint.
- Cart invoice list supports `status` and `posted` filters.
- Invoice posting logic uses `item.net_amount`, falls back to system account `4100` / first `REVENUE` account, handles VAT-inclusive pricing, discounts, and invoice-level `discount_amount` by scaling revenue to keep the journal balanced.
