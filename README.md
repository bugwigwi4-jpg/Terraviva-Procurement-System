# Terraviva Procurement System

Procurement management for **Terraviva** (NGO, Mwanza, Tanzania). The system is in English.

It covers the full cycle: requisition, multi-level approval, RFQ and sealed bids, bid scoring with conflict-of-interest
declarations, purchase orders (printable, with QR verification), goods received, 3-way invoice matching, payments,
budgets, grants, contracts, reports and an append-only audit trail. Files (photos, PDFs, video, audio, Word, Excel)
can be attached wherever evidence is needed.

Stack: Next.js 15 (App Router) + TypeScript + Tailwind 4, Supabase (Postgres, Auth, Storage, RLS), Vercel, GitHub Actions.

## 1. Run locally

```bash
npm install
cp .env.example .env.local     # values for the Supabase project are already filled in
npm run dev                    # http://localhost:3000
```

## 2. Accounts and the first administrator

People create their own account on **/signup** (show/hide password included). They confirm their email, and the
account then stays **inactive** and sees no data until an administrator activates it and assigns roles
(Users and roles screen). Forgot password works from **/login** by email link.

Make yourself the first administrator once you have signed up and confirmed your email:

```sql
update public.profiles set is_active = true where email = 'you@example.com';
insert into public.user_roles (user_id, role)
select id, 'admin' from public.profiles where email = 'you@example.com'
on conflict do nothing;
```

In Supabase set **Authentication > URL Configuration**: Site URL = your Vercel URL, and add
`https://YOUR-URL/auth/callback` to Redirect URLs (needed for email confirmation and password reset).
For production, configure a custom SMTP sender so confirmation emails are not rate limited.

## 3. Roles

| Role | Can do |
|---|---|
| admin | Everything, including users, roles, rules and policy |
| procurement_officer | Suppliers, RFQs, bids, purchase orders, contracts, catalogue |
| finance_officer | Budgets, grants, invoices, payments, finance approvals |
| department_head | Sees own department; first-level approver |
| approver | Director-level approval for large amounts |
| program_manager | Programs, plan, scoring bids, read access |
| store_keeper | Goods received notes and returns |
| auditor | Read-only everywhere, including the audit log and fraud checks |
| requester | Creates requisitions and attaches files |

Approval thresholds (TZS) are in the `approval_rules` table and editable at **Rules and policy**.
The seeded values are **placeholders**: confirm them against Terraviva's finance policy and donor rules.

## 4. Deploy

1. Push this folder to GitHub (`main` and `develop`, protect `main`, require the CI check).
2. In Vercel: **Add New > Project**, import the repo, set the two `NEXT_PUBLIC_SUPABASE_*` variables.
3. Use separate Supabase projects for staging and production.

## 5. Keep the database in Git

The schema was applied through seven migrations. Pull them into this repo:

```bash
npx supabase login
npx supabase link --project-ref ggamqzedldoqfzjcqadp
npx supabase db pull
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

## 6. Screens

Dashboard · Notifications · Requisitions · Approvals · RFQs and bids · Purchase orders (print LPO with QR) ·
Goods received · Returns and credit notes · Suppliers · Contracts · Procurement plan · Invoices · Payments ·
Budgets · Grants · Donors · Programs · Reports (CSV export for Excel) · Fraud checks · Audit log ·
Users and roles · Rules and policy · Item catalogue · Delegation · My account.

## 7. Rules enforced by the database

- Approvals only through `submit_*` and `act_on_approval`; nobody approves their own document.
- Budget is checked when a requisition or order is submitted.
- Bids are sealed until the RFQ is closed; scoring needs a clean conflict-of-interest declaration.
- Award needs the minimum number of quotations (or a written reason) and an approved supplier.
- Goods cannot be over-received; invoices need the 3-way match and approval before payment.
- Duplicate supplier invoice numbers and TINs are blocked; status fields cannot be forged from the browser.
- Audit log entries cannot be edited or deleted.

## 8. Attachments

```tsx
<Attachments entityType="grn" entityId={id} categories={[{ value: 'delivery_proof', label: 'Delivery photo' }]} />
```

Entity types: requisition, supplier, rfq, quotation, purchase_order, grn, goods_return, invoice, payment,
contract, program, grant. Files go to the private `attachments` bucket (25 MB max) and are served by short-lived
signed URLs; access follows the permissions of the parent record.

## 9. Known limits

- Not yet compiled in a full Node environment: run `npm run build` and fix any type errors reported.
- Approval reminders are stored (`due_at`) but no scheduled job sends escalation yet.
- Exports are CSV files that open in Excel; PDF reports other than the LPO are not included.
