# 1Grow Event Module – Frontend Review and Corrected Improvement Recommendations

NexGenAds Technologies Pvt. Ltd.  |  Product: 1Grow  |  Team: T2 – Event Module UI Development

**Review status:** Static verification of the frontend source code and the Bruno API collection completed. No runtime, build or end-to-end testing performed.

> **Important limitation – read first.** The backend source code is NOT present in this repository. The only server-side evidence available is the Bruno collection under `1Grow Core API/` (request and example response samples). A number of sample responses are themselves inconsistent with each other (see Findings – API contract inconsistencies). Every finding below is labelled:
>
> - **Confirmed (source)** – reproduced in the frontend code in this repo.
> - **Confirmed (sample)** – contradicts the Bruno request/response samples in this repo.
> - **Unverified** – cannot be checked without backend source or a live API; needs confirmation against the running API before fixing.
>
> A previously circulated "verification" quoted `backend/src/app/v1/events/*`, `serializeEvent`, a Prisma schema and DTO classes (`forbidNonWhitelisted`, `UpdateEventStatusDto`, …) as if they exist in this repository. They do not. Any claim in that document that depends on backend source inspection must be treated as unverified and re-checked, or dismissed.

## 1. Overview

This report consolidates the frontend review of all five parts of the 1Grow Event Module and corrects the original intern report using what is actually verifiable in this repository.

**What was inspected**

- Frontend: `frontend/src/features/events/pages/*.tsx`, `frontend/src/services/events.ts`, `frontend/src/services/api-client.ts`, `frontend/src/components/ui/Modal.tsx`, `frontend/src/components/layout/Sidebar.tsx`
- API contract evidence: Bruno collection `1Grow Core API/Event/**` (and `Common/Security`)
- Process docs: original report (this file, previous revision)

**Overall conclusion.** The Event Module is not merely "unpolished" – its frontend and the documented API contract disagree on identifiers, status values and request payloads. As a result, most detail/select/status workflows are broken against the documented samples. The fixes are not cosmetic; they require a contract-first correction of the API layer, then page-by-page repair. The intern's report identified the right risk areas; its evidence was insufficient and in places its severity calls were wrong.

## 2. Findings and Recommendations

Evidence key: `file:line` refers to the frontend. "Bruno" refers to the collection under `1Grow Core API/Event/`.

### Part 1: Events – Creation and Details

| # | Finding | Verdict |
|---|---------|---------|
| 1.1 | List sample returns `eventId` (not `id`), `title`, `description`, `thumbnailImage`, `attachments`, `eventType`, `services` only. It does NOT return `eventNumber`, `status`, `eventDate`, `venue`, `budget`, `client`, `executionStatus`. The list table renders all of these → undefined text, broken date formats, blank/unknown status. | Confirmed (sample) + source (`events-page.tsx` table, `services/events.ts` types `id`, `eventNumber`, `status`…) |
| 1.2 | Frontend `Event` type and all event pages/selectors read `event.id` / `e.eventNumber`. List sample provides neither → `selectedEventId` becomes `undefined` and downstream calls go to `/events/undefined/…`. | Confirmed (source + sample) |
| 1.3 | Get By ID samples are mutually inconsistent: one returns `id`, the other returns `eventId`. Detail view (`openDetail`, `getEvent(event.id)`) is affected by 1.2 and by this inconsistency. | Confirmed (sample inconsistency) – needs API-team confirmation |
| 1.4 | **Status values rejected.** Frontend dropdown sends `DRAFT / CONFIRMED / IN_PROGRESS / COMPLETED / CANCELLED`. The Update Status sample accepts only `ACTIVE` / `INACTIVE` and its 400 example states `"status must be either ACTIVE or INACTIVE"`. Every status change from the UI fails with 400. | Confirmed (sample) |
| 1.5 | **Create/Update payload mismatch.** Frontend sends `venue, address, eventDate, eventEndDate, startTime, endTime, expectedGuests, budget, notes, clientId, eventTypeId`. The Create/Update samples expect `title, description, thumbnailImage, attachments[], eventType:{id}, services:[{id}]`. Create sample returns `data: null` on 201. The frontend form's required fields and types do not map to the documented contract. (Whether the live server rejects unknown fields cannot be verified – no backend source – but the documented sample contract is violated either way.) | Confirmed (sample) payload mismatch; server-rejection behaviour unverified |
| 1.6 | **Archive / Restore calls undocumented.** The frontend calls `POST /events/{id}/archive` and `/restore`. No such requests exist in the Bruno collection. | Confirmed (absence in documented API) – verify at runtime |
| 1.7 | **API error details are lost.** `api-client.ts` converts every failure to `new Error(message)` – HTTP status and field-level validation errors are discarded; pages further swallow the message entirely (`catch { toast.error("Failed to save event") }`). | Confirmed (source) |
| 1.8 | **No-refresh-token session expiry does not redirect.** In `api-client.ts`, the `if (!refreshToken)` branch calls `clearTokens()` and returns early, skipping the later `window.location.href = "/login"`. The global 401 handler below is also bypassed in this path. | Confirmed (source) |
| 1.9 | **List failure renders as empty list** (`catch { setEvents([]) }`), so a broken API looks like "no events". | Confirmed (source) |
| 1.10 | `EventStats` type omits `proposalSent`, `proposalApproved`, `quotationSent` which the Stats sample returns (harmless subset, shows type drift). `executionStatus` appears in NO event sample → the Execution badge on the events page always falls back to `NOT STARTED`. | Confirmed (sample) – low severity display |

**Why it matters**

These are contract bugs, not styling bugs. The events list renders mostly empty columns; row actions and the detail page depend on identifiers the list does not return; event creation and status changes cannot succeed against the documented samples; and when failure happens the UI either hides the error or shows an empty table. All downstream pages (Quotations, Vendors, Team, Tasks, Timeline, Budget, Execution) inherit the same broken selector.

**Recommended fix**

- Define one canonical frontend `Event` model mapped from the actual API responses; introduce an explicit mapper/adapter used everywhere (`id ← eventId` or keep `eventId` and update types). Do not sprinkle `?? event.id ?? eventNumber` across pages.
- Align `createEvent`/`updateEvent` payloads with the documented create/update contract (or get the API changed deliberately). Required fields for the form must match the sample: `title` is the only obvious required field; attachments/eventType/services must be wired or removed.
- Replace status options with the documented `ACTIVE` / `INACTIVE` values and rework the stats cards accordingly.
- Remove the archive/restore buttons until the collection documents them (or get them implemented and added to the collection).
- Preserve HTTP status and server messages: reject with a typed error carrying `status` and `message`; show them (field-level where possible).
- Fix the no-refresh-token path to also redirect to `/login` (or show a session-expired screen) after clearing tokens.
- Show an error state with retry when list/detail loads fail – never an empty table.
- Get the API team to make Get By ID consistent and re-publish the collection.

### Part 2: Clients and Proposals

| # | Finding | Verdict |
|---|---------|---------|
| 2.1 | **Proposal validation is weak.** Only title is required; `totalAmount: formAmount ? Number(formAmount) : 0` – empty/invalid/negative amounts pass silently, `NaN` risk via `Number("abc")`. No min/max, no valid-until check. | Confirmed (source) |
| 2.2 | **Client create matches neither the sample payload nor typical constraints.** Frontend requires only name + phone; the Client Create sample sends `email` (and more). Whether the server *requires* email/10-digit phone is unverifiable (no backend source) – but the mismatch plus zero client-side email/phone validation is real. | Partially confirmed (source); server rules unverified |
| 2.3 | **Client list response lacks `isActive` and `_count.events`** (sample returns `id, name, companyName, phone, email, notes, leadId` only). The UI therefore always shows badge `Inactive` and count `0`. | Confirmed (sample) |
| 2.4 | **Double submission is not fully prevented.** Main form buttons use `loading=` on `<Button>` (disabled while submitting), but the RowMenu Send/Approve/Reject buttons and `ConfirmModal` usages in `events-page.tsx` (Archive/Restore) carry no in-flight state. | Confirmed (source) |
| 2.5 | **List-load failure renders as empty state** (`catch { setClients([]); setProposals([]) }` pattern in both pages); no error message or retry. | Confirmed (source) |
| 2.6 | **Details modal duplicates the title** (modal `title=` prop and the body both render `detailProposal.title`). | Confirmed (source) – low severity |
| 2.7 | **Mobile pagination is missing** on every events page: pagination is rendered only inside `<div className="hidden sm:block">` (9 occurrences). Mobile users get no page controls at all. | Confirmed (source) |
| 2.8 | Proposal status values `EXPIRED` (and any transitions other than SENT/APPROVED/REJECTED) are not demonstrated in the collection; status button set unverified against the API. | Unverified |

**Why it matters**

Bad input is accepted silently and can be persisted; users cannot distinguish a failed load from an empty list; client rows display false "Inactive / 0 events" data; repeat clicks can duplicate side-effect actions (Send/Approve/Reject, Archive/Restore).

**Recommended fix**

- Add field-level validation (required, numeric, non-negative, sensible ranges) with messages next to each field. Do not use `Number(x) || 0` as validation.
- Validate email format and phone length against the backend rules once confirmed; block partial creates if the API rejects them.
- Wire every action button (RowMenu, ConfirmModal, status selects) to an in-flight `loading` state; disable until the request settles.
- Split loading/error/empty states everywhere; add a retry action for failed loads.
- Backend: expose `isActive` and `_count.events` in the clients list response, or render nothing instead of fabricated defaults.
- Remove the duplicated title; add mobile pagination (or card list + compact pager) for all events pages.
- Confirm proposal status values and enforce permitted transitions in the UI.

### Part 3: Quotations and Vendors

| # | Finding | Verdict |
|---|---------|---------|
| 3.1 | **Event selectors broken everywhere.** Every events sub-page builds options as `{ value: e.id, label: \`${e.eventNumber} - ${e.title}\` }` (quotations, proposals, vendors, timeline, team, tasks, budget, execution). The list sample has no `id`/`eventNumber` → labels show `"undefined – Title"`, keys are undefined, `getXxx(undefined)` hits `/events/undefined/…`. | Confirmed (source + sample) |
| 3.2 | **Quotation identifier mismatch.** Frontend reads `q.id` for keys and status actions (`updateQuotationStatus(quotation.id, …)`), and calls `PATCH /events/quotations/{id}/status`. Samples return `quotationId` and routes use `{{quotationId}}` (List/Get/Update/Update Status). Same for proposals: frontend `proposal.id` vs samples' `proposalId`. | Confirmed (sample) |
| 3.3 | **Vendor integration is unverifiable as written.** The collection documents vendor *master* CRUD at `/vendors` (`Vendor - List/Add/Update/Update Status`, route param `{{vendor-Id}}`) and one event-scoped route: `DELETE /events/{{eventId}}/vendors/{{eventVendorId}}`. The frontend calls `GET/POST/PATCH /events/{id}/vendors[…]` which do NOT exist in the collection. The vendor master sample returns `id` – the claim "API returns `vendorId`" is NOT supported by the samples; `editingVendor.id` therefore works only if the call resolves to the master endpoint or an undocumented event-scoped endpoint that also returns `id`. | Confirmed (collection gap); field claim unverified |
| 3.4 | **Vendor delete is not wired in the UI** (no Delete action in vendors-page), even though `DELETE /events/{eventId}/vendors/{eventVendorId}` is documented. | Confirmed (source) |
| 3.5 | Quotation detail and edit views are absent (no detail page/modal; no update flow except status change), although `Quotation - Get By ID` and `Quotation - Update` exist in the collection. | Confirmed (source + collection) – feature gap |
| 3.6 | Amount fields use `Number(x) \|\| 0` (subtotal/tax/discount); negative and non-numeric inputs accepted silently. | Confirmed (source) |
| 3.7 | **RowMenu Send/Approve/Reject have no in-flight guard** – repeat clicks fire duplicate status requests. | Confirmed (source) |
| 3.8 | **Modal keyboard support is partial.** `role="dialog"`, `aria-modal`, ESC close and backdrop close exist; however there is no focus trap, no initial focus on open, and no focus restoration on close (the code comment even claims a "Focus trap + ESC" but only ESC was implemented). | Confirmed (source) |
| 3.9 | Duplicate-create risk: `Quotation - Create` requires `proposalId` in the sample body; the frontend create form has no proposal selector, so the payload requirement is unmet / untested. | Unverified combination – needs confirmation + wiring |

**Why it matters**

The event dropdown is broken module-wide (3.1). Quotation/proposal status actions and keys are broken against the documented routes (3.2). Vendor flows either hit undocumented routes or cannot be verified at all (3.3), and delete support is missing in the UI (3.4). Data-entry errors (negative amounts) pass, and status actions can be spammed (3.7).

**Recommended fix**

- Fix every selector to use `eventId` + `title` (label "Title" only, or `EVT-…` once returned); auto-select must use the same field.
- Switch quotation/proposal identifiers to `quotationId` / `proposalId` end-to-end (types, keys, routes); add a mapper if the UI wants `id`.
- Reconcile vendor integration: either implement the documented master `/vendors` flow + event-scoped DELETE with a picker, or confirm the event-scoped routes exist and their response shape; then wire vendor delete (with confirmation + error handling).
- Wire quotation Get By ID / Update flows or formally defer them with the team.
- Add numeric validation (non-negative, finite) and disable status buttons while a request is in flight.
- Complete modal accessibility: initial focus, focus trap, focus restore, ESC (already present).
- Confirm the create payload (esp. `proposalId` requirement) with the API team before enabling create.

### Part 4: Team Assignments and Tasks

| # | Finding | Verdict |
|---|---------|---------|
| 4.1 | **Event dropdown shows `undefined`** (same selector bug as 3.1: `list[0].id`, `e.id`, `e.eventNumber`). | Confirmed (source + sample) |
| 4.2 | **Raw User ID entry** for assigning members and tasks – no searchable picker (name/email/role). | Confirmed (source) – UX defect |
| 4.3 | **Invalid role option.** Frontend offers `EXECUTOR` (`team-assignment-page.tsx`). No Bruno sample uses EXECUTOR; assign/list examples use `MANAGER`, `COORDINATOR`, `EXECUTION`, `SUPPORT` (and `LIGHTING_TECHNICIAN`, `SOUND_ENGINEER` in bulk-assign). | Confirmed mismatch vs samples (backend enum unverified – no source) |
| 4.4 | **Invalid task status option.** Frontend offers `PENDING` (`tasks-page.tsx`); samples use `TODO` / `IN_PROGRESS` (create/update-status examples). `TODO` is missing from the UI. | Confirmed mismatch vs samples |
| 4.5 | **Tasks endpoints mismatch.** Frontend calls `/events/{id}/tasks` (list/create/update). The collection has NO such routes; tasks are nested under team members: `/events/{id}/team/{memberId}/tasks[...]`. | Confirmed (collection gap) – needs runtime confirmation |
| 4.6 | **Team removal mismatch.** Frontend calls `DELETE /events/{id}/team/{memberId}`. The collection documents `PATCH /events/{id}/team/{memberIdP}/status` for removal. | Confirmed (collection mismatch) |
| 4.7 | **Sidebar double-highlight.** `isActive = href === "/x/dashboard" ? pathname === href : pathname.startsWith(href)` (`Sidebar.tsx`). `/owner/events` matches every events sub-page → "Events" and e.g. "Team Assignment" both appear active. | Confirmed (source) |
| 4.8 | **Sidebar may look cut off.** Nav container is `overflow-y-auto` with `scrollbar-none` – long menus are scrollable but undiscoverable. Visual claim; not fully verifiable headless. | Partially confirmed (source) |
| 4.9 | **"1 Issue" badge not found in source** – almost certainly the Next.js dev-mode indicator overlay (screenshot artifact), not application UI. | Confirmed absent from source |
| 4.10 | **Empty state has no next step** – no "Add Member" CTA when the team list is empty. | Confirmed (source) – UX |
| 4.11 | **Team list failure renders as empty list** (`catch { setTeam([]) }`). The reported "404 = empty team" behaviour is unverifiable without backend source; distinguish error from empty regardless. | Confirmed (source); backend nuance unverified |

**Why it matters**

Broken event selection (4.1) propagates to every team/task call. Invalid role/status values are rejected by the API, so assignments and task updates fail. The tasks endpoints called by the UI do not exist in the documented collection, so the entire task workflow is unverified at best. The sidebar indicates two pages are active, and users who empty the list get no guidance.

**Recommended fix**

- Fix selection via the shared event mapping (see Part 1); never render `undefined`.
- Replace raw User ID inputs with a searchable member picker (name, email, role) for both forms; submit the selected `userId`.
- Restrict role options to values demonstrated by the API samples (`MANAGER`, `COORDINATOR`, `EXECUTION`, `SUPPORT` – confirm full enum with the API team) and task statuses to the documented set (`TODO`, `IN_PROGRESS`, `REVIEW`, `COMPLETED`, `BLOCKED`, `CANCELLED` – confirm).
- Resolve the tasks route discrepancy with the API team (either the collection is incomplete or the frontend calls the wrong paths) and align team-member removal to the documented PATCH-`status` flow.
- Fix sidebar `isActive` so a parent entry is not highlighted alongside its child (exact/segment-aware matching).
- Add an "Add Member" CTA to the empty state (role-gated), keep the sidebar scrollable with visible affordance.
- Separate failed loads from genuinely empty states with retry UI.

### Part 5: Timeline, Budget and Event Execution

| # | Finding | Verdict |
|---|---------|---------|
| 5.1 | **All three pages use the same broken event selector** (5.x = 3.1): `list[0].id`, `e.id`, `e.eventNumber` → labels/ids are `undefined`. | Confirmed (source + sample) |
| 5.2 | **Timeline toggle always sends `true`.** The list sample contains NO `isActive` (only `slotId, eventId, title, description, startTime, endTime, priority, isMilestone, dependencies, taskId, assignees, createdAt, updatedAt`). `!entry.isActive` is always `true`; deactivation is impossible; the opacity/edge styling for inactive slots never applies correctly. (`Timeline - Update Slot Status` with `isActive` is documented, so the endpoint exists – only the field source is missing.) | Confirmed (sample) + source |
| 5.3 | **Timeline status badge uses a field absent from the samples** – `entry.status` is undefined → badge renders empty; variant map unused. | Confirmed (sample) |
| 5.4 | **Schedule-conflict / slot errors are swallowed** – every timeline write ends in generic toasts (`"Failed to add slot"`, `"Failed to update slot"`); the API's specific message is never surfaced. | Confirmed (source) |
| 5.5 | **Budget: stale summary across events.** `setSummary` is only called on success (`if (summaryRes?.data)`); when switching events the previous event's summary remains on screen, and `setBudgetItems([])` only happens in catch. | Confirmed (source) |
| 5.6 | **Budget: invalid amounts silently become 0** (`Number(formBudgeted) \|\| 0`), including non-numeric/negative inputs. No validation of negative amounts. | Confirmed (source) |
| 5.7 | **Budget/summary failures render as empty lists** (`catch` → `setBudgetItems([])`), no error/retry state. | Confirmed (source) |
| 5.8 | **`items` vs `itemCount` is UNVERIFIABLE.** `Budget - Summary.bru` contains no example response at all. The frontend type/UI expects `items` (`BudgetSummary.items`, `<StatCard … value={summary.items} />`). Do not assume either name – capture the live response before fixing. | Unverified |
| 5.9 | **Execution status options mismatch.** Frontend offers `NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD`. Execution samples use `SETUP`, `IN_PROGRESS`, `COMPLETED`. `ON_HOLD` appears in no sample; `SETUP`/`WRAP_UP` are missing from the UI. The events-list `executionStatus` badge (events-page) also assumes values absent from samples and falls back to `NOT STARTED`. | Confirmed mismatch vs samples (full enum unverified) |
| 5.10 | **Execution list failure renders as "No execution logs"** (`catch { setLogs([]) }`) – a broken API looks like an empty log. | Confirmed (source) |
| 5.11 | Execution `Update Log` (`PATCH /events/{id}/execution/{logId}`) and `Execution - Summary` exist in the collection but are not used by the UI – improvement opportunities. | Confirmed (source + collection) |
| 5.12 | `FormData`/empty-selection case: when `selectedEventId` is empty (auto-select failed per 3.1), all three pages silently render empty states. | Confirmed (source) |

**Why it matters**

All three pages are unusable against the documented samples (undefined event id). The timeline toggle cannot deactivate, and its badge is blank. Budget shows another event's totals after a failed switch and silently zeroes bad input. Execution failures masquerade as "No execution logs".

**Recommended fix**

- Fix selection through the shared event mapping; clear `items/summary/logs/currentEvent` immediately on event change and on failure.
- Timeline: confirm with the API team what the list returns; either add `isActive` / status to the list response (preferred, since `Timeline - Update Slot Status` already exists) or stop inventing badges/toggles for fields the server does not provide. Bind the toggle to the documented activation state; surface conflict messages verbatim.
- Budget: reset `summary` on event change and on failure; validate numeric input (non-negative, finite); show error+retry instead of empty state; confirm the summary response field name (`items` vs `itemCount`) against a live call.
- Execution: offer only documented statuses (`SETUP`, `IN_PROGRESS`, `WRAP_UP`, `COMPLETED` – confirm full enum); render error+retry on failure; use `Execution - Summary` if the screen can benefit.
- Integration checklist: verify every chained call with Bruno against the real server before closing.

## 3. Corrected Common Priorities

Priority | Focus | What to do
---|---|---
**P0 – Blocker** | **Identifier & selector mapping** | One shared adapter (`eventId`/`title`); `quotationId`, `proposalId`, vendor-id handling end-to-end; never render or send `undefined`. Fix the 9 `hidden sm:block`-adjacent selectors and the stats/type drift.
**P0 – Blocker** | **Create/Update/Status contract** | Align event create/update payloads and the status dropdown with the documented samples (`ACTIVE`/`INACTIVE`). Decide archive/restore: remove the UI or get the API to add them.
**P0 – Blocker** | **Status/role enums** | Team role (drop `EXECUTOR`, confirm set), task status (use `TODO`, drop `PENDING`), execution status (drop `ON_HOLD` unless documented, add `SETUP`), event status (`ACTIVE`/`INACTIVE`).
**P1 – High** | **Error handling & session expiry** | Typed errors preserving HTTP status; login redirect on unrecoverable auth; loading/empty/error kept separate with retry; no fake `[]`-fallbacks.
**P1 – High** | **Stale & silently-wrong state** | Reset budget summary/items/logs on selection change; validate amounts/times; fix `\|\| 0` coercions.
**P2 – Medium** | **Action guards & confirmation** | In-flight disabling on RowMenu/ConfirmModal/status selects; confirm archive/restore/vendor-delete semantics.
**P2 – Medium** | **Modal & pagination accessibility** | Focus trap, initial/restore focus; mobile pagination or card lists; sidebar active-item logic; `scrollbar-none` affordance; empty-state CTA.
**P3 – Confirmation** | **Unverifiable contracts** | Budget summary (`items` vs `itemCount`), tasks routes (`/events/{id}/tasks` vs nested team routes), team removal flow, proposal status transitions, full enums, `executionStatus` presence, vendor endpoints/master-vs-event-scoped split, client `isActive`/`_count.events`. Resolve against the live API/collection with the API team; do not ship guesses.

## 4. Corrections to the Original Intern Report

1. **"Backend code not available"** – correct as stated for this repository, and strengthen the point: the Bruno collection is the *only* contract evidence, and it is inconsistent in places (Get By ID returns `id` in one example and `eventId` in another; Budget Summary has no example at all; Client List omits `isActive`/`_count.events`; tasks are nested under team members; archive/restore/tasks are undocumented). The biggest correction is not a bug list – it is that the API surface must be reconciled and published before the frontend can be finished.
2. **Evidence quality.** Attribution should shift from "confirm with the backend team" to "verify against this repo's Bruno collection and the live API". The intern was right to be cautious; the report simply stopped too early and labelled everything "may".
3. **Severity.** The identifier/selector bug is not one "High" priority among many – with the documented samples, *no* selector, detail view, status change, budget view, timeline toggle, execution header or quotation/proposal action can work. It is a module-wide P0. Similarly, the status dropdown is guaranteed to fail (400 per sample) – not "needs stronger checks".
4. **Part 2 classification.** These are confirmed defects (validation, silent `0` coercion, empty-on-error, duplicated modal title, hidden mobile pagination), not just an improvement plan.
5. **Verified-vs-unverified claims.** Every "confirmed" claim in this corrected report is tied to this repo (file:line or sample). Claims that the sample evidence cannot support – e.g. `serializeEvent` behaviour, `forbidNonWhitelisted`, the exact `executionStatus` values, `itemCount`, the 404-empty-team behaviour – are marked **Unverified**, not "confirmed".
6. **Additional defects found that the intern missed:** team-member removal endpoint mismatch, tasks/routes discrepancy vs the collection, quotation create's unmet `proposalId` payload, `EventStats` drift, `executionStatus` absent from all samples, vendor collection gap (master vs event-scoped), `team-assignment EXECUTOR`, client-list `isActive/_count` fabrication, and the absence of mobile pagination on 9 pages.
7. **Claims in the original report that do NOT survive verification:** "(seemingly) both id and eventId are returned by the API" – the list sample returns only `eventId`; Get By ID is inconsistent, so treat `id` as untrustworthy until fixed. "1 Issue badge" intel – absent from source; dev-mode artifact, do not track as product bug.
8. **"Verdict: ship the P0/P1 fixes first" stands, but with test evidence** – fixes must be verified with Bruno against the live server plus a runtime smoke pass (create → list → detail → status → archive/restore decision) before release.

## 5. Recommended Implementation Plan (contract-first)

**Phase 1 – Reconcile the contract (API team + frontend, together)**
Document every Event endpoint's exact request/response (Create, Update, List, Get By ID, Stats, Update Status), fix the two Get By ID samples, add Budget Summary example, decide archive/restore, tasks and team-removal routes, and vendor endpoint split. Freeze the contract.

**Phase 2 – Shared frontend API layer**
Canonical `Event`/`Quotation`/`Proposal`/`Vendor`/`BudgetSummary`/`EventExecutionLog` types; one mapper; typed errors (`status`, `message`, field errors); `getMessage` kept but surfaced; fix 401/no-refresh redirect.

**Phase 3 – Workflow blockers (P0)**
Selector mapping; create/update payload alignment; status/role/enum alignment; quotation/proposal identifier switch; vendor delete wiring (documented route).

**Phase 4 – Correctness & guards (P1)**
Error/empty/loading split with retry everywhere; stale-state resets; numeric validation; in-flight disabling; timeline mapping vs confirmed sample; budget summary field name fix post-confirmation.

**Phase 5 – UX, accessibility, mobile (P2)**
Mobile pagination/card lists; modal focus trap/initial focus/restore; sidebar exact-match active logic + visible scroll affordance; empty-state CTAs; client list rendering without fabricated fields; proposal modal de-duplication.

**Regression checklist (must pass against the real server)**
Create event → it appears in list with usable columns; open detail; switch event and confirm no stale budget/timeline/execution data; change status to ACTIVE then to an unsupported value (expect a clear 400 message); archive/restore behaviour per decision; create quotation/proposal with required payload; Send/Approve/Reject single-fire; assign member with each role; create task with each status; activate/deactivate timeline slot; budget add with invalid amount; execution status update; 401 without refresh token → redirected to login; list API failure → error + retry, not empty list; mobile pagination; keyboard-only modal flow.

## 6. Conclusion

The Event Module's problems are real and structural: frontend and documented API disagree on identifiers, statuses and payloads; error handling hides failures; several inputs silently corrupt data. They are fixable in a contract-first sequence. Do not assign page-by-page fixes before Phase 1–2 complete, and do not trust any environment-specific observation that cannot be reproduced against this repo or the live API. This report replaces the intern's version as the working reference; its owner is T2 with the API team for Phase 1. No code changes have been made; this is a recommendation document only.
