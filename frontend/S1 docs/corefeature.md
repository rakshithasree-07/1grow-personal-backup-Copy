

## 1. Overview

The spec enumerates a plausible six-module UI build with shared components and an RBAC model. Verified against the codebase, the picture is: **the six modules are mostly already built — and several of them are built more than once.** The genuine gaps are not "which screens to build"; they are (a) missing route-level authorization, (b) fake/inert actions presented as real, (c) large duplicated implementations dressed up as "shared components that exist", and (d) the spec itself describes a role model that does not match the application.

### Verdict legend
- **Implemented** – built and wired; minor issues only.
- **Implemented (duplicated)** – works, but copied per role/route instead of shared.
- **Partial** – built for some roles/flows only; missing states, guardrails or actions.
- **Stub** – placeholder or dead code where a feature is promised.
- **Missing** – no implementation exists.
- **Not a spec claim, not done** – the document asserts behaviour the code does not have.
- **Mis-specified** – implemented behaviour differs from the spec's described model.

---

## 2. Verdict summary

| Spec module | Verdict | One-line summary |
|---|---|---|
| Lead Management | Implemented | Full vertical slice (dashboard, list, create/edit, detail, convert, follow-ups) with role-based routing; assignment UX and branch scoping are weak. |
| Organization Management | Partial | Super-admin tenants list + detail exist; "Create Organization" is a placeholder; owner/branch settings are comprehensive; no search/filter on tenant list. |
| User Management | Implemented (duplicated) | Owner and branch-manager pages are byte-identical full CRUD; super-admin has a separate page; roles & permissions management exist; no overview summary cards anywhere. |
| Audit Logs | Implemented (duplicated) / Stub for branch-manager | Owner and super-admin are feature-rich identical copies; a shared component exists but is unused; branch-manager page is a "Coming soon" stub with ~450 lines of commented code. |
| Access Requests | Implemented (duplicated / re-exported) | One 681-line page re-exported for four roles; approve/reject with reasons and role/branch override work; spec asked for tabs — implemented as a filter. |
| Finance – Dues | Implemented (with fake action) | Due-tracking workspace with stat cards, filters, table, PDF; "Send Reminder" shows a success toast without calling any API; course filter can crash on malformed data. |

Supporting infrastructure claims in the spec (common reusable components, states, confirmations, notifications) are mostly present but unevenly applied; see Section 5.

---

## 3. Module-by-module findings

### 3.1 Lead Management (feature: `foundation`; routes under `/owner/leads`, `/branch-manager/leads`, `/staff/leads`)

**Present and verified:**
- Leads dashboard with summary stat cards.
- Leads list: table with search, filters (status etc.), sorting, pagination, row selection, bulk actions, CSV import and CSV export.
- Create / Edit lead pages with a validated form (name required, phone required with format check).
- Lead details page with information panel, follow-ups list and a Convert-to-Student dialog (real API call) and an Assign dialog.
- Follow-ups page with statuses and urgency handling.
- Route wiring for owner/branch-manager/staff roles via a role-prefix helper.

**Defects and gaps:**
- Assignment UX is inconsistent with the spec: lead-detail "Assign" is essentially self-assignment; assigning to another user or a branch is only possible by typing a raw user ID into the bulk-assign dialog. Spec implies assignment to users/teams — half-implemented, raw-ID entry remains.
- No client-side branch/role scoping in the leads UI (relies on server enforcement, unverifiable here; staff/branch isolation is not demonstrated in the frontend at all).
- Lead form validation exists (name, phone) but error placement/field-level mapping is ad hoc; no coverage of the full lead lifecycle fields seen in other modules.
- Bulk-assign copy asks for a raw "user ID" — same failure mode as the events module (users cannot be expected to know internal UUIDs).
- Export exists; import exists; both call live endpoints — good — but neither shows a preview/validation summary of the file; failure mode unknown.
- The leads feature is named "Foundation" in code (`features/foundation`) — naming drift from the spec, confuses ownership.

### 3.2 Organization Management (tenant/org)

**Present and verified:**
- Super Admin → Tenants: real list page with columns (name, industry badges, status, subscription, users, branches, created) and pagination, plus a tenant detail page (info, subscription, invoices, branding cards).
- Owner and Branch Manager → Organisation: a comprehensive settings workspace (roughly 1,600 lines) covering general, branding, contact and preferences — materially better than what the spec describes.

**Defects and gaps:**
- "Create Organization" (super-admin) is a placeholder page; dead navigation item linked from the tenants UI.
- No edit path for an organization in super-admin flows; tenant detail is read-only; no suspend/activate actions exposed in the UI despite status badges existing.
- Super-admin tenant list has **no search and no filters**, contradicting the spec's "Search, status, and plan filters" row; pagination only.
- Owner/branch users pages duplicate the exact same component for both roles (identical 628 lines), including the Organisation settings where the branch-manager gets the same file and parameter switch — works, but one fix must be applied twice forever.
- Spec's "Organization List / Create / Edit / Details / Settings" mapping to tenancy is loose: tenants (super-admin) and own-organization (owner) are different products sharing one name; the spec never disambiguates, which mis-scopes the work.

### 3.3 User Management

**Present and verified:**
- Owner and Branch Manager: full user workspace — list with search, role and status filters, sorting, pagination; invite/create staff with generated invite link; role change, status change (activate/deactivate), remove from branch, actions behind dropdown menus, modal-based edits. Also reachable error state with Retry.
- Super Admin: users list with client-side search/filter/sort, status toggle, explicit error state with Retry.
- Super Admin: Roles page and Permissions page — real CRUD against the RBAC service (list roles, edit role-permission mapping, create/edit/delete permissions).

**Defects and gaps:**
- No "User Overview" summary cards (Total/Active/Pending/Inactive) anywhere — the spec's first row is unimplemented for every role.
- No branch scoping in the UI: branch managers see the identical page as owner, with no front-end evidence of branch restriction; combined with absent middleware role checks (Section 4), "branch-level management" is asserted, not demonstrated.
- Branch Manager copy: the spec promises "Cannot access administrative settings" — true in the UI only insofar as links are absent; not enforced by any guard.
- Super Admin list filters client-side over the current page only; no server-driven search despite the endpoint accepting params.
- The owner/branch users page is literally the same file copied; the super-admin page is a third implementation; no shared component — directly contradicts the spec's "Common Reusable Components" goals.

### 3.4 Audit Logs

**Present and verified:**
- Owner and Super Admin audit trail: feature-rich pages — stat cards (total/24h/7d/entity types), search, action filter, entity filter, date range, CSV export, refresh, pagination, and inline change-diff viewer (old → new values with line-through), IP/browser and correlation ID columns.

**Defects and gaps:**
- Branch Manager audit logs page: a "Coming soon" stub — and it carries the entire previous implementation as ~450 lines of commented-out dead code (maintainability and review hygiene problem).
- The shared `AuditLogsView` component exists but is used by **nobody**; owner and super-admin pages are byte-identical copies (~566 lines each) instead of composing it.
- Staff and Client have no audit logs surface at all (fine if intended; spec does not say).
- Spec promised "Log Details Drawer" — implemented as inline expandable diff instead; behaviour is arguably better but is a spec/impl mismatch nobody recorded.
- Branch-manager nav links to a dead page — unresolved placeholder leaked into navigation.

### 3.5 Access Requests

**Present and verified:**
- Owner page (681 lines): search, status filter, role filter, sorting, pagination, detail view, approve dialog (with role and branch override applied before approval), reject dialog (reason required), blocking state for BLOCKED requests, per-row action lock while submitting, toasts on success/failure.
- The same owner page is re-exported for Branch Manager, Staff and Super Admin — the seven-line wrapper pages import it directly.

**Defects and gaps:**
- Spec asked for "Request Status Tabs (Pending, Approved, Rejected)" — implemented as a dropdown filter instead; functional but a documented mismatch.
- Client-side search/filter only over loaded data; no server-driven filter; fine at small N, but unbounded.
- The re-export means the same 681-line bundle ships four times semantically; one bug fix must be applied in one place that all four consume — technically true here (single module), so this is the one place duplication worked — but the coupling is invisible and fragile.
- Branch-manager actions on a tenant's requests are not visibly scoped anywhere; same authorization weakness as the rest of the app (Section 4).
- "Pending/Approved/Rejected" statuses exist in code as PENDING/APPROVED/REJECTED/BLOCKED — consistent enough; BLOCKED undocumented in the spec.

### 3.6 Finance – Dues (Due Tracking)

**Present and verified:**
- Four summary cards (Total Due, Overdue, Due Today, Upcoming) with overdue-amount warning banner.
- Dues table: payer, invoice, amount, due date, days remaining/overdue, status badge variants (Overdue / Due Soon / Upcoming / On Track), search, status filter, course filter, date range, sorting, pagination, PDF download, print.
- Error state with retry; skeleton loading; empty state.

**Defects and gaps:**
- **"Send Reminder" is fake.** The button shows a success toast ("Reminder sent to student") without calling any API or service — pure UI theatre; users believe action happened. Must either call a notification/email endpoint or render as disabled/"coming soon".
- The course dropdown fetches `res.data.items.map(...)` without a guard — a malformed or empty response crashes the page (same unguarded-shape class as the finance module's known crashes).
- The spec's summary wants "Overdue Count" — implemented as amount, fine, but the spec was never reconciled with what shipped.
- Reminder permission (`canRemind`) is role-gated in UI — good sign — but again with no underlying enforcement visible.
- The page re-implements patterns copied from Invoices/Payments pages; no shared finance table component, despite the volume of duplication.

---

## 4. The RBAC claims vs. reality (the spec's centerpiece)

The spec's "Permission Enforcement" paragraph asserts five properties. Verified against the frontend:

| Spec assertion | Reality | Verdict |
|---|---|---|
| Centralized permission checks | None. Role/permission checks are scattered ad hoc (`canManage`, `canRemind`, dropdown gating). RBAC service exists but no guard consumes it for UI | Missing |
| Hide/disable restricted actions | Partially: a few buttons are role-gated in finance/dues; invites/roles/status edits are open to any staff user with page access | Partial |
| Protect routes and pages | `middleware.ts` checks only that a token exists — no role/module matching. Any authenticated user can open any role's URL directly | Missing |
| Display access-denied messages | An `/access-denied` page exists but **nothing routes to it**; 403 handling is unwired | Missing |
| Prevent branch-data access via URL manipulation | No frontend control: no middleware role checks, no route param validation, no branch scoping in the UI; pages rely on server enforcement, which is unverifiable from this repo | Missing (frontend evidence) |
| Backend also validates permissions | Not verifiable; frontend must assume yes | Unverified (backend) |
| Future expansion / granular roles | Super-admin Role & Permission management UIs exist (real CRUD) — foundation is in place, unused by the rest of the app | Partial |

Additionally:
- **The spec's role model is fiction.** It defines "Administrator / Branch Manager / Employee (Sales Executive)". The application's roles are SUPER_ADMIN, OWNER, BRANCH_MANAGER, STAFF, STUDENT, CLIENT. Every permission sentence in the spec must be rewritten against the actual roles or discarded.
- **Sidebar navigation hides modules by subscription/industry/plan** — cosmetic only; hidden by default, shown to subscribers; no security value.
- Pending/rejected access flows exist (isAccessRestricted, pending approval screens) — genuinely implemented; this is the one part of "permissioned app" that works end-to-end in UI.

**What must change (frontend):** role-aware `middleware.ts` (route → allowlist per role with redirect to `/access-denied`); a tiny shared guard hook/component consumed by all role-area layouts; wiring `/access-denied`; nav hiding tied to actual role, not just module subscription; page-level role checks for destructive actions (users, roles, permissions).

---

## 5. Cross-cutting quality issues (measured, not anecdotal)

1. **Pagination is hidden on mobile in 42 places** (`hidden sm:block` pattern around the table + pager). Every module — including the ones in this spec — is unusable for page navigation on phones.
2. **235 raw `catch {}` blocks** swallow errors to empty state or nothing; a user sees blank tables with no message and no retry. (Spec's own requirement — "failure" state — is silently violated almost everywhere.)
3. **Duplication instead of composition:** users page (identical ×2), audit-logs page (identical ×2), access-requests (re-export ×4) — spec's "Common Reusable Components" section claims sharing that does not exist; `AuditLogsView` sits unused; ~450 lines of commented code in the branch-manager audit-logs stub.
4. **Fake actions:** send-reminder toast (Dues), "Assign" flows asking for raw IDs (Leads bulk, events), "Coming soon" links in live navigation (tenant create, branch-manager audit logs, and — in the adjacent rental module — client quotations/documents/agreements/support).
5. **Unguarded response parsing** in finance (Invoices/PaymentHistory/DueTracking/getCourses) — `.data.items` assumed; crashes on unexpected payloads.
6. **No shared data-table primitive usage discipline**: some pages use `Table`, some hand-rolled layouts; spec's "Data Table" component claim is partially true.
7. **Design-system adherence:** PageContainer/Button/Badge/StatCard/Pagination/SearchBar/FilterBar/Skeleton/EmptyState/Modal/ConfirmModal all exist and are broadly used — the spec's "existing design system" premise is accurate; the duplication is the violation.
8. **Naming/ownership drift:** Leads shipped as "Foundation"; spec's six modules do not map cleanly onto `features/*` folders; future contributors will not find code matching spec section names.
9. **Accessibility pass absent** app-wide (modals without focus trap/initial focus, keyboard paths unverified, pagination hidden on mobile).
10. **Type-time drift:** several spec's row shapes don't match API types (amounts as numbers in types vs strings in samples elsewhere in app — same family of bug as the events/rental modules).

---

## 6. The spec itself, reviewed

**Strengths:** module coverage is the right six; component inventory matches the design system that exists; states requirement (loading/empty/error/validation/permission) is stated; confirmations for destructive actions and toast standards named; reuse aspiration is correct.

**Weaknesses:**
1. **Fictional role model** — Administrator/Employee-Sales mapping does not exist in the product; rewrite against SUPER_ADMIN/OWNER/BRANCH_MANAGER/STAFF/STUDENT/CLIENT.
2. **No route-protection component specified** despite making it a headline requirement — an spec that demands guards and lists no guard component stays unbuilt.
3. **Reuse section is contradicted by the codebase** — the doc documents a pattern the codebase doesn't follow; needs migration rules, not aspirations.
4. **No acceptance criteria, no sequencing, no owners, no effort sizing** — "implement X components" with no order, dependencies or definition of done; the doc is an inventory, not a plan.
5. **Silent on the six stub pages** that sit behind navigation (placeholder pages shipped as routes) — needs a disposition rule rather than a component list.
6. **No accessibility or mobile criteria** — tables hidden on mobile in 42 places would have been caught by a single responsive requirement.
7. **No mention of the finance crash risk class** (unguarded response parsing) — the single most impactful failure mode in the app today.
8. **No error-state standard** despite listing it — 235 raw catch blocks are the outcome.
9. **Misleading "frontend restrictions alone sufficient" implication** — spec leans on client-side hiding; must state plainly that UX gating ≠ authorization (and item remains backend-dependent).
10. **No evidence requirement** — nothing in the spec asks the implementer to verify endpoints exist, so every item is built against assumed APIs (this review found multiple pages wired to absent/undocumented endpoints).

Verdict: keep the document as a checklist skeleton; it needs a rewrite of the role model, an explicit guard strategy, acceptance criteria, and verification steps before it can drive work.

---

## 7. Corrected plan (frontend only)

**Phase 0 – Guardrails first**
Role-aware middleware (route → role allowlist → redirect to /access-denied); wire /access-denied; shared guard hook for destructive actions in users/roles/permissions; audit/bell/reminder actions audited for fakes (reminder button must call an endpoint or be removed); close the four finance crash paths by wrapping response parsing in a shared normalizer.

**Phase 1 – Eliminate the duplicates and dead code**
Introduce shared feature components properly: single UsersView, single AuditLogsView actually consumed everywhere, single AccessRequestsView; delete the 450-line commented block; delete or ship `tenants/create`; branch-manager audit logs either implemented from AuditLogsView (one-liners) or removed from nav.

**Phase 2 – Close the spec's visible gaps**
User overview summary cards (all four roles); super-admin tenant search + status/plan filters; "Assign" replaced with a searchable member picker (reuse events-module picker once built); lead bulk-assign raw-ID eliminated the same way; leads feature renamed to its domain; forged reminder action implemented or hidden; invoice course filter guarded.

**Phase 3 – States & mobile**
Eliminate the 42 `hidden sm:block` pagination wrappers (always-visible compact mobile pagination or card lists); every list gets explicit loading/empty/error+retry; toast standards enforced; disabled-instead-of-hidden for role-gated screens where waiting beats confusion.

**Phase 4 – The spec rewrite**
New document: six modules with actual roles (SUPER_ADMIN/OWNER/BRANCH_MANAGER/STAFF/STUDENT/CLIENT), evidence column (file or Bruno sample per feature), guard requirement per route, acceptance test per row, disposition rule for placeholder routes, and no component listed twice.

**Explicitly out of scope (needs backend; not planned here):** server-side RBAC enforcement, route-levelAuthorization on the API layer, studentId contract for finance, payments saga for reminders, and availability/quota of any Finance reminders feature — the frontend can only render or withhold these.

**Recommended verification checklist (per role):** route-URL manipulation blocked; access-denied rendered for forbidden routes; reminder never claims success without an API response; all six modules render with (a) empty data, (b) 500 payload, (c) malformed payload, (d) mobile 320px; pagination works by touch; branch data invisible to other branches; user list role-filter actually filters server-side.

---

## 8. Verdict on the spec

**Do not start implementation from it as written.** The frontend it describes is largely built — often twice — so the highest-value work is deleting, guarding and wiring what exists, not adding screens. The document needs (in order): role-model rewrite, guard/middleware section, acceptance criteria + evidence rule, deduplication plan, and only then its component list as a backlog. Attach its success to measurable checks (401/403 behaviour, crash-free finance pages, zero raw catch blocks in touched files) and to the Phase ordering above.

*(The original spec text is not reproduced verbatim here; its content is exhaustively covered by the verdicts above. If needed for traceability, the source file can be retrieved from wherever the intern shared it before this review.)*
