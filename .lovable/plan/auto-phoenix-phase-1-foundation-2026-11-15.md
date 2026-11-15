# Auto Phoenix — Phase 1 Foundation

Scope for this phase only: app structure, database + security, sign-in and permissions, Branches, Customers & Vehicles, navigation and role dashboards. No sample transactions are created. Later modules (job cards, inventory, payments, invoicing, etc.) build on this.

## What you will be able to do
- First person to sign up becomes **Admin**. After that, sign-up is closed: only the Admin creates staff accounts.
- Staff sign in with email + password or Google (Google works when the email matches an account the Admin created).
- Admin adds branches, creates staff, gives each one a role (Admin, Accountant, Sales Agent, Supervisor) and the branches they can work in. Admin can deactivate staff.
- Staff register customers (individual or company, with TRN for companies) and their vehicles (make, model, year, plate, emirate, VIN, colour, odometer), and upload vehicle photos/documents.
- A branch switcher at the top: Admin sees "All branches" (consolidated) or one branch; others see only their assigned branches.
- Role dashboards showing real figures from the database (counts per branch, recent customers/vehicles, staff, quick actions). Empty until real data is entered.
- Phone-first layout: bottom tab bar on mobile, charcoal sidebar on desktop, large touch buttons, phoenix-orange accent on white. Installable to the phone home screen.

## Intended database (for your review)

```text
branches        code (e.g. AQZ, used later in job card numbers), name, address,
                phone, email, VAT TRN, active flag. No deletion — deactivate only.
profiles        one per staff account: full name, email, phone, active flag.
user_roles      staff → role (admin / accountant / sales_agent / supervisor).
                Kept separate from profiles so nobody can promote themselves.
user_branches   staff → branches they may access.
customers       home branch, type (individual/company), name, phone, email,
                emirate, address, TRN, notes, active flag, created by/at.
vehicles        customer, branch, make, model, year, plate no./code/emirate,
                VIN, colour, odometer, notes, active flag.
vehicle_files   vehicle, kind (photo/document), private file path, uploaded by.
audit_logs      who, when, which record, action, before/after values.
```

Customers and vehicles belong to a branch and are visible to staff of that branch (Admin sees all). Phone numbers and plates are checked for duplicates within the business.

## Security policies
- Every table has database-level access rules; the screens are never the only gate.
- Helper checks run in the database: "is this user an active Admin?", "does this user have role X?", "may this user access branch Y?" (Admin = all branches; others = assigned branches, only while active).
- **Branches**: staff see their assigned branches; only Admin creates/edits.
- **Staff, roles, branch assignments**: staff see their own; Admin sees and manages all. Creating accounts runs on the server and checks the caller is Admin first.
- **Customers & vehicles**: view for any active staff in that branch; create/edit for Admin and Sales Agents (Supervisors and Accountants view only). No deletes — deactivate instead.
- **Vehicle files**: private storage; only staff of the vehicle's branch can view/upload.
- **Audit log**: written automatically by the database on every change to branches, staff roles/branches, customers and vehicles; read-only, Admin only; nobody can edit or delete entries.
- Deactivated or unassigned accounts can sign in but see an "Access pending — contact your Admin" screen and no data.

## Technical details
- TanStack Start + React + TypeScript, Lovable Cloud (Postgres, Auth, Storage). Server functions with auth middleware for admin actions (create user with temporary password via service role, after has_role check).
- `app_role` enum; SECURITY DEFINER functions `has_role`, `is_admin`, `has_branch_access`, `app_is_initialized` (anon-callable, tells the sign-in page whether to offer first-admin setup).
- `handle_new_user` trigger: creates profile; first user gets admin role, later self-created users stay inactive with no role.
- Generic `audit_trigger()` writing to `audit_logs`; no INSERT/UPDATE/DELETE grants on audit_logs for clients.
- Explicit GRANTs on every table; no DELETE policies on business tables.
- Routes: `/auth`, `/reset-password`, `_authenticated/` → `/dashboard`, `/branches`, `/customers`, `/customers/$id`, `/vehicles`, `/vehicles/$id`, `/staff`, `/settings`, `/audit-log` (admin).
- PWA: web manifest + icons for home-screen install; offline caching deferred.
- GitHub: connect from Lovable's GitHub settings (you do this once; I can't link it from chat).
