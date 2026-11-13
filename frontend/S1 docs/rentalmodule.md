# 1Grow Rental Module – Verification Review of the Team 3 (Intern) Report

NexGenAds Technologies Pvt. Ltd.  |  Product: 1Grow  |  Team: T3 – Rental Module QA (Customer / Staff / Owner)
Reviewer note: This document verifies the intern report against the frontend source, the Bruno API collection (`1Grow Core API/Rental/`), and the frontend environment configuration. No backend source code exists in this repository, so server-side behaviour is unverified. No code changes have been made.

**Scope constraint (stakeholder decision):** This report recommends **frontend-only** remediation. Anything that requires backend work is listed in "Explicitly out of scope" and is not part of the implementation plan. The frontend must be robust either way (validate responses, degrade gracefully, hide what cannot work), but backend fixes themselves are not planned here.

**Review status:** Source-verified where marked "Confirmed". Items marked "Unverified" need a live API check (Bruno calls against the real server — read-only verification, no backend changes). Runtime behaviour was not reproduced (no test run); verdicts are based on static inspection.

---

## 1. Overview

The Team 3 intern report listed 17 findings (6 customer, 4 staff, 4 owner, 3 common), plus a 15-item UI/UX implementation plan (UX01–UX15) and a summary table claiming "17 unique findings".

This review checks each claim against the repository. Short answer: **the interns found genuine, high-value bugs and the report is worth acting on — with corrections.** Two findings are the same bug, one finding is not a bug, several findings cross modules, and the implementation plan polishes appearance while the blocking defects go unfixed. The report also misses several defects of equal or higher impact. All recommended fixes below live in the frontend repo (`frontend/`), including its `middleware.ts` and `.env` example files; nothing requires API changes.

### Verdict legend
- **Confirmed** – reproduced in source or in the documented samples.
- **Confirmed (conditional)** – code path exists and matches the reported symptom; runtime confirmation needed (or environment/config dependent).
- **Duplicated** – same defect reported under two IDs.
- **Not a bug** – behaviour matches the data/design; the report's interpretation is wrong.
- **Unverified** – cannot be confirmed from this repository.
- **Missed** – defect found during verification that the report did not list.
- **Out of scope** – needs backend work; excluded per the frontend-only constraint (see Section 7).

---

## 2. Verdict summary (all 17 findings)

| ID | Reported as | Verdict |
|---|---|---|
| C01 | Customer – Quotations shows "Coming soon" | Confirmed (placeholder page) |
| C02 | Customer – Rental Agreements shows "Coming soon" | Confirmed (placeholder page) |
| C03 | Customer – Documents shows "Coming soon" | Confirmed (placeholder page) |
| C04 | Customer – Finance pages fail; Invoices crashes filtering undefined data | Confirmed (response-shape crash in source; exact failure depends on live payload) |
| C05 | Customer – Dashboard Quick Actions do nothing | Confirmed |
| C06 | Customer – Support shows "Coming soon" | Confirmed (placeholder page) |
| S01 | Staff – Dashboard 500 error, "reading 'items'", Retry repeats | Confirmed (unvalidated unwrap in source; runtime needs API check) |
| S02 | Staff – Inventory status update succeeds but table shows old value | Confirmed symptom; fix is frontend-robustness + verify refetch reflects the change (see 3.2) |
| S03 | Staff – Rental Bookings visible for all customers incl. PII | Confirmed (UI renders full tenant booking list); frontend mitigation only — enforcement out of scope |
| S04 | Staff – Returns: duplicate React keys "condition" | Confirmed |
| O01 | Owner – Inventory status update not reflected | Duplicated (identical to S02) |
| O02 | Owner – Catalogue: Average Price = ₹1,50,03,00,20,00,875 instead of ~₹1,525 | Confirmed (root cause found) |
| O03 | Owner – Payment History crashes at PaymentHistoryPage line 134 | Confirmed (exact line matches) |
| O04 | Owner – Bookings show "Paid: ₹0" despite amounts | Not a bug (display matches API data); verify one booking against payments data via read-only API call |
| C1 | Common – "Rental Tenant 2" brand link → 404 → redirect to login | Confirmed (mechanism found) |
| C2 | Common – Home icon → login, then back to dashboard | Confirmed (mechanism found) |
| C3 | Common – Profile Location shows NEXT_PUBLIC_GOOGLE_MAPS_API_KEY missing | Confirmed (env var absent; CSP also blocks Google Maps hosts) |

**Count corrections:** S02 ≡ O01 (same defect on two portals) → unique findings = **16**, not 17. C01/C02/C03/C06 are placeholder pages — a product decision (build / hide / mark planned), not an engineering regression.

---

## 3. Findings in detail

### 3.1 Customer Portal

**C01 / C02 / C03 / C06 – Placeholder pages (Confirmed).** The customer Quotations, Rental Agreements, Documents and Support routes are literal placeholder scaffolds that render a "Coming soon" badge, wired into the client sidebar as if they were real features. **Frontend decision:** hide them from the sidebar and breadcrumb (or clearly mark "Planned" and make the pages non-clickable) so no user lands on a dead end. Building them is a project, not a fix, and needs its own scope approval; the documented collection offers quotation and (limited) agreement surface, but that is New Work, not remediation, and belongs to a later phase if approved.

**C04 – Finance pages crash (Confirmed, with one condition).** The customer-scoped finance pages consume paginated API responses without any shape validation or fallback, then call filter/reduce on the result; when the server responds with anything other than the exact expected shape, the page throws. The same unguarded pattern is used in more than one finance page, so the blast radius is larger than the one page reported. **Frontend fix:** a shared response normalizer for the finance feature that accepts both a bare array and the documented `{ items, total, page, pageSize, totalPages }` envelope; every finance page then renders data or a proper error state with retry — never a crash. Error toast and inline error card on failure; silent catches removed.

**C05 – Quick Action buttons are inert (Confirmed).** The customer dashboard Quick Action tiles render as buttons with an empty click handler. **Frontend fix:** link each tile to its real route if one exists (Bookings route exists; Documents/Messages/Settings must be checked); anything without a route is removed or rendered disabled with a tooltip. Do not ship inert controls.

### 3.2 Staff Portal

**S01 – Staff dashboard 500 error (Confirmed, mechanism).** The dashboard service unwraps a response envelope with zero validation; an unexpected body makes the unwrapped value undefined, the hook reads a property of it, and the entire dashboard collapses into the 500 screen; Retry fails the same way every time. **Frontend fix:** isolate each of the four requests (summary / metrics / upcoming / alerts), validate the payload, degrade failed widgets to inline error states, keep the rest live, and make Retry meaningful. Also record the raw failure in a toast instead of hiding it behind a full-page 500 when other widgets could still render.

**S02 / O01 – Inventory status update not reflected (Confirmed symptom).** The update call returns success, the page toasts success and re-fetches — and the row still shows the old value. **Frontend-only remediation:** after a successful update, the list must be re-fetched and the affected row verified against the payload that was written; if the refetched row does not reflect the requested change, show an explicit "Saved, but the server did not confirm the change — refresh to verify or contact support" state instead of a false success toast, and keep the table on the server's truth. The tables must also stop trusting shadow copies — always render from the last server response, never from local optimistic state for this field. **Known limit:** whether the server actually persists the status can only be decided with the backend owner; if it drops the field, the frontend cannot conjure persistence — but it can stop lying to the user about it (success toasts are removed for unconfirmed writes). This converts a silent data-integrity bug into an explicit, visible one.

**S03 – Staff see full tenant booking PII (Confirmed).** The staff rental pages reuse the owner pages; every booking — names, phones, dates, amounts — is rendered to staff. **Frontend-only action:** gate the booking list/detail views for the staff role on an assignment predicate when the booking payload carries an assignee field; when it does not, hide the unfiltered list behind an explicit "Contact your administrator" empty state and remove the detail drill-in. **Known limit:** hiding or filtering in the UI is not a security boundary; real enforcement is server-side and is listed as out of scope below. This is the best the frontend can do alone.

**S04 – Duplicate "condition" columns (Confirmed).** The returns table defines two columns keyed `condition` with different renderers — duplicate React keys and a redundant column. **Frontend fix:** remove one column or retarget it (most likely intended as an inspection/notes column; either is fine as long as keys are unique and headers are honest).

### 3.3 Owner Portal

**O01 – Duplication of S02; do not double-count.** Same defect on the owner inventory page; one fix covers both portals.

**O02 – Average Price is astronomically wrong (Confirmed, root cause).** The catalogue computes its average with a raw sum over items whose API amounts are string-encoded; string concatenation in the reducer yields the absurd 13–14 digit figure shown on the card. All monetary fields in the rental API are strings (prices, deposits, amounts, totals). **Frontend fix:** a shared amount parser for the whole rental/finance surface (parse, validate, fall back to 0 with a flagged state, never concatenate), used everywhere amounts are summed, averaged, compared or compared to thresholds; plus the average is scoped to the full dataset, not the current page (or relabelled "this page").

**O03 – Payment History crash (Confirmed; the reported line matches).** The summary computation filters the payments array without a fallback when the response is not the expected shape, and line 134 in the file is exactly the filter that throws. **Frontend fix:** same response normalizer as C04 (shared finance hook), so both pages render or error cleanly.

**O04 – "Paid: ₹0" (Not a bug).** The rental list samples expose `paidAmount` as `"0"` for bookings with no recorded payments; the UI truthfully renders the API value. **No frontend change.** If the owner claims payments were recorded for these bookings, the check is a read-only query against the payments API — an assertion to verify before calling it a bug, not code to fix.

### 3.4 Common (all roles)

**C1 – Sidebar brand link leads to a missing route (Confirmed).** The sidebar brand links to `/dashboard`, which has no page; the 404 page then auto-redirects to login. **Frontend fix:** link the brand to the role's real dashboard path (the app already computes this pattern for notification links — extract and reuse).

**C2 – Home icon bounces through login (Confirmed).** The breadcrumb Home icon links to `/`, which redirects to `/login`; an already-authenticated user is bounced back. **Frontend fix:** Home links to the role dashboard, using the same helper as C1.

**C3 – Google Maps key missing (Confirmed, plus a second defect).** The LocationPicker rejects with an explicit configuration error because `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is absent from the frontend environment definition — and independently, the Content-Security-Policy only allows the app's own origin and a small allowlist, so even a configured Maps script would be blocked. **Frontend fix (in this repo):** provision the variable in the frontend environment files and document it there; add the Maps hosts to the CSP in `middleware.ts`; make the location section degrade to plain latitude/longitude/address fields with a "Map unavailable" notice when the key is missing or the script fails — never a raw error string, never a broken half-rendered map.

### 3.5 Findings outside the rental module (scope note)

C04 and O03 are finance-module code paths; S01 is shared dashboard infrastructure; C1–C3 are shell/configuration (navigation, breadcrumb, CSP, environment). They were observed during rental testing but live in the same frontend repo and are fixed here; they are tagged "finance module", "shared dashboard" and "shell" so ownership is not confused, and finance regressions get their own checklist entries.

---

## 4. Additional defects found during verification (missed by the report)

| ID | Area | Finding |
|---|---|---|
| M01 | Rental – Shared types | Monetary fields arrive as strings; frontend types declare numbers. Every sum, average, comparison and currency helper that ignores this is unsound (same class as O02, module-wide). |
| M02 | Rental – Items stats | The items stats endpoint returns different field names than the frontend type expects; inventory stat cards silently render fallback zeros. |
| M03 | Rental – Catalogue average | "Avg. Price" is computed over the current page only, not the catalogue; mislabelled and wrong even after the math fix. |
| M04 | Finance – blast radius | The same unguarded `.items` access appears in the client payments page and shared finance hooks (renewals/transfers/enrollments too); one malformed response crashes or silently empties several pages. |
| M05 | Finance – Invoices | The customer invoices page passes a `studentId` parameter while scoped to a client session; even without crashing, expect empty or erroring results unless the parameter is removed for client roles. |
| M06 | Rental – Pagination | Every rental page hides pagination behind a desktop-only breakpoint; mobile users cannot change pages. |
| M07 | Rental – Error handling | List/detail failures are swallowed to empty arrays everywhere; a broken API is indistinguishable from "no data". No error state, no retry, no toast. |
| M08 | Rental – Dead capabilities | The collection documents availability check, booking calendar, quotation send/approve/convert/PDF, status transitions, damage actions, maintenance start/complete, PDF receipts — none wired in the UI; implemented generic updates bypass those documented flows. Frontend action: wire the read-only, safe ones (availability check in pickers, calendar for booking forms, PDF download buttons) against existing UI; the rest remain intentionally unused and this must be recorded. |
| M09 | Rental – Enquiries stats | The frontend calls an enquiries stats endpoint that does not exist in the collection; the cards can never show real numbers. Frontend action: compute stats client-side from the loaded page + what the list response says (page totals), or hide the cards. |
| M10 | Rental – Category delete | The UI calls a category delete route that does not exist in the collection. Frontend action: remove the delete affordance (or keep it strictly disabled with a tooltip) until the server confirms support. |
| M11 | Shell – Brand/Home links | Brand and breadcrumb Home both point at non-role destinations; the notification-link role-prefix helper already computes the right paths and can be reused. |
| M12 | Shell – CSP | CSP omits the Google Maps hosts (see C3); any script not on the allowlist is blocked. |
| M13 | Rental – Mobile/a11y | Tables hidden on mobile with no mobile list on several pages; modals lack initial focus and focus trap; pagination hidden on mobile; row-menu actions lack in-flight guards. |

---

## 5. Assessment of the interns' UI/UX implementation plan (Section 5 of their report)

**What is sound.** The direction is legitimate product work: consistent dashboards, light-mode contrast, responsive behaviour, sidebar hierarchy and active states, table density, form consistency, shared design tokens, skeletons, empty states, accessible error pages, notifications, search/filter improvements, button consistency, accessibility, profile redesign. Concrete IDs with stated benefits — reasonable to carry as a backlog.

**What is wrong with it as a remediation plan.**
1. **It fixes appearance, not correctness.** None of UX01–UX15 touches a single confirmed defect: the finance crash, the 404/login bounce, the missing Maps key, silent-empty error handling, string-amount math, duplicate keys, inert Quick Actions, placeholder pages, mobile pagination, the staff PII exposure or the false success toasts of S02/O01.
2. **It ignores the data-plumbing problem.** No item covers response validation, amount parsing, stats field mapping or hidden error states. Restyling on top of unsound plumbing reproduces the same bugs in a prettier shell.
3. **It is untestable as written.** No acceptance criteria, no regression checklist, no environment expectations, no accessibility targets, no definition of done, no ownership, no sequencing. "Responsive Design" and "Accessibility Improvements" without measurable outcomes cannot be signed off.
4. **Scope risk.** "Modern Dashboard Redesign" and "Light Mode Redesign" are the highest-effort, least-verifiable items in the list; they crowd the calendar ahead of confirmed-correctness work.
5. **Redundant with defect fixes.** UX05 (table/pagination) overlaps the missing mobile pagination fix, which is a defect, not an enhancement; it ships in the Phase 1 pass, not as a design project.

**Verdict on the plan:** keep it as a *polish* backlog; it does not drive the schedule. The frontend-only sequence is in Section 7. If the team ships only "UI/UX work" this cycle, the correct first step is the blocking-bug pass, which is small and largely mechanical — then UX01–UX07.

---

## 6. Scope and quality defects in the intern report itself

1. **Counting error:** 6+4+4+3 = 17 is arithmetically right but substantively wrong — S02 and O01 are the same defect (−1); the true unique count is **16**.
2. **Duplicate across portals:** inventory status not reflected (staff + owner) is one bug fixed once.
3. **No severity, no repro steps, no environment, no acceptance criteria.** The report cannot distinguish "broken for everyone" from "broken on one tenant/one machine" (several items are environment-dependent, e.g. C3, and most response-shape crashes depend on the live payload).
4. **Misdiagnosis in one place:** the item-update status issue is reported as a UI refresh bug; static inspection shows a contract-shaped question first (generic update not demonstrating `status` semantics). Frontend action is deliberately "stop claiming success until server state confirms" — it does not silently assume the server is wrong, it instrumentally handles both.
5. **Module mislabeling:** finance, navigation, dashboard and profile items are filed under "Rental".
6. **No contract-verification item at all** — notable given the module's verified type drift (string amounts, stats fields, missing endpoints, pagination patterns, unguarded response access).
7. **The report never marks what is verified vs. believed**; the standard for the reworked report should be: evidence (file or sample), verdict, scope, severity, acceptance test.

The interns kept the habit worth keeping — they looked at the running product and found real, user-facing defects, including one whose reported line number is exact. They need the engineering bar: evidence, verdict, deduplication, ownership, acceptance criteria.

---

## 7. Frontend-only implementation plan

Everything below is confined to the frontend repo (`frontend/`, incl. `middleware.ts`, environment files, shared hooks and the rental/finance features). Backend fixes are explicitly excluded; see "Explicitly out of scope".

**Phase 0 – Frontend contract guards**
Introduce a shared response normalizer (accept both array and wrapped paginated shapes) and a shared amount parser (string amounts → number, safe fallback, no silent NaN). Wire them across rental + finance pages. Add one regression test file if the repo has a test runner, or at minimum a documented manual checklist per page. Update TypeScript types to string-typed API amounts with parsing at the edge.

**Phase 1 – P0 blocking defects (one pass, small patches, reviewed together)**
Placeholders disposition (C01/C02/C03/C06: hide or mark "Planned" + disable, not build); finance response normalizer everywhere incl. `.items` fallbacks and error+retry cards (C04/O03/M04); dashboard per-request isolation with widget-level error states (S01); Quick Actions wired or removed (C05); duplicate `condition` key removed (S04); inventory status flow stops claiming unconfirmed success — user-visible "saved, not confirmed" state and no false toast (S02/O01); sidebar brand + breadcrumb Home link to role dashboard (C1/C2); Google Maps degrades gracefully + key documented in frontend env file + CSP hosts added in `middleware.ts` (C3); string-amount math fixed in catalogue average + full dataset scope (O02/M01/M03); items stats mapping corrected (M02); client invoices `studentId` param dropped for client role (M05); pagination shown on mobile (M06); silent catches → error+retry (M07); category delete affordance removed/hidden (M10); enquiries stats cards computed client-side or hidden (M09); read-only dead capabilities wired: availability check (enquiry/booking pickers), booking calendar, PDF downloads (M08); notification/notification-link role-path helper reused (M11); pagination + table mobile layout + focus/keyboard modal behaviour (M13).

**Phase 2 – Authorization-conformance UI (frontend only)**
Staff views: assignment-predicate gating where the payload permits, otherwise an explicit admin-contact empty state and no drill-in to booking detail for non-assigned staff (S03); hide role-inappropriate actions by reading the role from the auth store; never call endpoints the role does not need; keep every authorization decision visibly honest (disabled, not faked).

**Phase 3 – UX/UI backlog (the interns' UX01–UX15, re-scoped)**
Accessibility with measurable criteria (focus trap, keyboard path for modals/menus, contrast, touch targets, axe checks); table/form/button/notification consistency per the design tokens; empty-state illustrations; responsive passes for every rental page on 320px; profile redesign gated on Phase 0/1 completion.

**Explicitly out of scope (needs backend; not planned in this document)**
- Server-side fix for the inventory status persistence question (S02/O01) if the server drops the field.
- Server enforcement of staff booking visibility (S03); frontend gating is a courtesy, not a boundary.
- Plain-vs-wrapped API response shape standardization on `/payments`, `/invoices`, `/dashboard/*` (frontend handles both).
- New enquiries-stats or category-delete endpoints (frontend computes client-side / hides instead).
- Projecting C01/C02/C03/C06 as shipped features (needs product + both sides).
- The 13–14 digit-average class of bug can never be fixed by restyling — it is fixed by the Phase 0 parser, listed here only for completeness.

**Frontend regression checklist (all roles)**
Invoices/payments render or show inline error + retry (never a crash); dashboard renders when any one of four endpoints fails; Quick Actions navigate; brand/Home land on role dashboard; inventory update either confirms persisted change or shows "unconfirmed" state; average price matches seed data; mobile pagination works; booking list shows only what staff may see per Phase 2 gating; Maps section degrades gracefully without key; duplicate-key warnings gone; 401 → refresh or login; no silent empty lists anywhere in rental/finance.

---

## 8. Verdict on the Team 3 report

**Use it, but correct it.** The interns found real bugs; keep them looking at the product. The report needs: the count corrected to 16 with S02/O01 merged; module tags so finance/shell items route correctly (they still get fixed here, just labelled honestly); severity + acceptance criteria; Section 4's missed defects merged or explicitly rejected; and UX01–UX15 re-sequenced behind the frontend-only Phase 0–2. Nothing in the report is fabricated; the missing half is verification and prioritisation. Do not start UX01–UX07 before Phase 1 ships.

*(Original intern report preserved verbatim in Appendix A for traceability.)*

---

# Appendix A – Original Team 3 report (verbatim)

1GROW ERP – RENTAL MODULE REPORT
Team 3 – Rental Module
Team Members
Mohamed Anser Kaif A – Owner Module	Mariappan B – Staff Module	Selva Vishva M – Customer Module

1. CUSTOMER PAGE BUGS (Tester: Selva Vishva M)
Bug ID	Page / Module	Bug Description
C01	Customer – Quotations	The Quotations page displays "Coming soon" instead of showing customer quotations.
C02	Customer – Rental Agreements	The Rental Agreements page displays "Coming soon" instead of showing rental agreements.
C03	Customer – Documents	The Documents page displays "Coming soon" instead of providing access to documents.
C04	Customer – Finance	The Invoices, Payments and Payment History pages fail to load. The Invoices page displays a runtime error because the application tries to filter undefined data.
C05	Customer – Dashboard	The Quick Action buttons do not respond when clicked.
C06	Customer – Support	The Support page displays "Coming soon" instead of providing support functionality.

2. STAFF PAGE BUGS (Tester: Mariappan B)
Bug ID	Page / Module	Bug Description
S01	Staff – Dashboard	The Dashboard fails to load and displays a 500 error: "Cannot read properties of undefined (reading 'items')". Clicking Retry displays the same error.
S02	Staff – Rental – Inventory	After updating an item's status, the page displays "Item updated successfully", but the table continues to show the previous status.
S03	Staff – Rental – Bookings	Staff can view booking details belonging to multiple customers, including names, phone numbers, rental dates, booking amounts and statuses.
S04	Staff – Rental – Returns	The Returns table generates duplicate React keys named "condition", resulting in repeated console warnings for table headers and cells.

3. OWNER PAGE BUGS (Tester: Mohamed Anser Kaif A)
Bug ID	Page / Module	Bug Description
O01	Owner – Rental – Inventory	The inventory status update is not reflected in the inventory table after updating.
O02	Owner – Rental – Catalogue	The Average Price card displays an unusually large and incorrect value (₹1,50,03,00,20,00,875) instead of the expected average of ₹1,525 based on the four displayed item prices.
O03	Owner – Finance – Payment History	The Payment History page crashes with "Cannot read properties of undefined (reading 'filter')". The error occurs in PaymentHistoryPage.tsx at line 134.
O04	Owner – Rental – Bookings	The booking list displays Paid: ₹0 for all three bookings, despite showing booking amounts of ₹8,000, ₹9,600 and ₹8,600.

4. COMMON BUGS (observed in Customer, Staff and Owner accounts – listed once)
Bug ID	Page / Module	Bug Description	Affected Roles
C1	Rental Tenant 2 Navigation	Clicking Rental Tenant 2 leads to a 404 error page and then redirects the user to the login page.	Customer, Staff, Owner
C2	Home Navigation	Clicking the Home icon redirects the user to the login page and then returns to the dashboard.	Customer, Staff, Owner
C3	Profile – Location	The Location section displays an error stating that NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.	Customer, Staff, Owner

5. UI/UX IMPLEMENTATION
Objective: Improve the overall appearance, consistency, responsiveness and usability of the 1Grow Rental Module across Customer, Staff and Owner portals.

A. High-Priority UI/UX Implementations
ID	Implementation	Expected Improvement
UX01	Modern Dashboard Design	Redesign dashboard cards, statistics, charts and recent activities with a clean and modern layout.
UX02	Light Mode Redesign	Improve background colours, text contrast, card backgrounds, borders and readability.
UX03	Responsive Design	Ensure all pages adapt properly to desktop, tablet and mobile screens.
UX04	Sidebar Improvements	Improve navigation hierarchy, icons, active menu highlighting and spacing.
UX05	Table Redesign	Improve table alignment, column spacing, readability, pagination and mobile scrolling.
UX06	Form Improvements	Standardize input fields, dropdowns, labels, validation and error messages.
UX07	Consistent Design System	Maintain common colours, typography, buttons, cards, badges and spacing throughout the application.

B. Usability Enhancements
ID	Implementation	Expected Improvement
UX08	Loading Skeletons	Display loading placeholders while dashboard cards and tables are fetching data.
UX09	Empty State Design	Display meaningful messages, illustrations and relevant actions when no records are available.
UX10	Error Page Design	Create user-friendly 404, 403 and 500 error pages with clear navigation options.
UX11	Notification System	Standardize success, error and warning messages with clear descriptions.
UX12	Search and Filter Improvements	Improve search fields, filter panels, dropdowns and filter visibility.
UX13	Button Consistency	Standardize button sizes, colours, icons, hover effects and disabled states.
UX14	Accessibility Improvements	Improve keyboard navigation, focus indicators, colour contrast and touch targets.
UX15	Profile Page Redesign	Improve profile information layout, location section and editing experience.

6. FINAL SUMMARY
No.	Category	Description	Total Findings
1	Customer Page Bugs	Customer-specific findings	6
2	Staff Page Bugs	Staff-specific findings	4
3	Owner Page Bugs	Owner-specific findings	4
4	Common Bugs	Common findings (all roles)	3
TOTAL UNIQUE FINDINGS	17
