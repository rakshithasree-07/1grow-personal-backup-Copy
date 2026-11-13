# 1Grow Event Module – Frontend Review and Improvement Recommendations

NexGenAds Technologies Pvt. Ltd.  |  Product: 1Grow  |  Team: T2 – Event Module UI Development

## 1. Overview

This report brings together the frontend review of all five parts of the 1Grow Event Module. It explains what problems we found, why they matter, and what we recommend doing about them.

The review is based on the frontend code, sample API responses (Bruno) and UI screenshots. We did not have the backend code and did not run full tests, so some points still need to be confirmed with the backend team. Part 2 is an improvement plan rather than a list of confirmed bugs. Everything here is a recommendation; no fixes have been made yet.

## 2. Findings and Recommendations

### Part 1: Events – Creation and Details

**Problems found**

- The Event type does not match the API samples, which return both id and eventId.
- Error details such as status codes and field errors are lost, so users may see a vague or wrong message.
- When a session expires and there is no refresh token, the user is not clearly sent to the login page.

**Why it matters:** Some event details may not show, actions that depend on the event ID may fail, and users cannot tell what went wrong.

**Recommended fix**

- Confirm the real API response (ID field, statuses, amount formats) and update the Event type.
- Keep status codes and field errors, and show them clearly.
- Send users to login when the session cannot be refreshed.

### Part 2: Clients and Proposals

**Problems found**

- The proposal forms need stronger checks, such as required fields and no negative amounts.
- Users get limited feedback while a request is loading or after it fails, and a form can be submitted twice.
- The details modal repeats some information, and mobile pagination needs work.

**Why it matters:** Bad data can be saved, and users are left unsure whether their action worked.

**Recommended fix**

- Add clear validation messages next to each field.
- Show loading, success and error messages, and block repeat submissions.
- Tidy the details view and fix mobile pagination. Check API behaviour before adding more actions.

### Part 3: Quotations and Vendors

**Problems found**

- Pages expect id and eventNumber, but the API returns eventId and title. The event dropdown can break, and a quotation may be sent with no event.
- Quotations use id, but the API returns quotationId. This affects list keys and the Send / Approve / Reject buttons.
- Vendor routes and data do not clearly match the API. Quotation details and edit, and vendor delete, are not connected yet.
- Forms check very little, status buttons can be clicked repeatedly, and modals lack proper keyboard support.

**Why it matters:** Users may be unable to pick an event or update a quotation, wrong amounts can get through, and duplicate requests are possible.

**Recommended fix**

- Fix the event and quotation field mapping, and require an event before saving.
- Confirm the create payload, vendor endpoints and status values with the API team.
- Add field-level validation, and disable status buttons while a request runs.
- Improve modal, dropdown and pagination accessibility, and show pagination on mobile.

### Part 4: Team Assignments and Tasks

**Problems found**

- The event dropdown shows “undefined” before the event name.
- Adding a team member or a task means typing a raw User ID.
- Both Events and Team Assignment look selected in the sidebar, and the empty state gives no next step.
- The sidebar looks cut off in some views, and a development “1 Issue” badge is visible. (Seen in screenshots only.)

**Why it matters:** Labels are confusing, users must know internal IDs, and there is little guidance on what to do next.

**Recommended fix**

- Use the correct event name field, with proper loading, error and empty states.
- Add a searchable member picker (name, email, role) for both forms.
- Highlight only the current page, make the sidebar scrollable, add an “Add Member” button to the empty state, and hide development badges in production.

### Part 5: Timeline, Budget and Event Execution

**Problems found**

- All three pages may use mismatched event fields (id versus eventId). Confirm the actual API response and standardize the mapping.
- Timeline: the activate toggle may always send “true”, the status badge uses a field not in the samples, and schedule-conflict errors are not shown.
- Budget: an old summary can stay after switching events, invalid amounts quietly become 0, and errors look like empty lists.
- Execution: status options differ from the API examples, and a failed request shows “No execution logs”.

**Why it matters:** Users may see another event’s data or wrong totals, and cannot tell a failure from an empty list.

**Recommended fix**

- Use one shared event mapping, and clear old data when the event changes.
- Confirm status values and the activation field with the API team.
- Show real API errors with a retry option, and validate times, amounts and event selection.
- Integrate the available edit, update, summary and photo APIs where supported, after confirming their contracts, and verify role permissions.

## 3. Common Priorities

| Priority | Focus | What to do |
|---|---|---|
| High | **Event ID mismatch** | Confirm the event fields once and use one shared mapping everywhere. Never show or send “undefined”. |
| High | **API details** | Confirm payloads, status values and amount formats with the backend team, and match the frontend types to them. |
| High | **Error handling** | Show the real error message. Keep loading, empty and error states separate, and clear old data when the selection changes. |
| Medium | **Validation** | Add field-level checks for required fields, amounts and times. Disable buttons while a request is running. |
| Medium | **Missing features and access** | Add edit, delete and summary features only after the API is confirmed. Check role permissions and session expiry. |
| Low | **Mobile and accessibility** | Fix mobile layouts, keyboard support, labels and focus handling. |

## 4. Conclusion

The biggest issues across all five parts are mismatched IDs, unconfirmed API details, and weak error messages and validation. Fixing these first will make event selection and data display reliable. Mobile, accessibility and missing features can follow. Next step: confirm the API details with the backend team, then work through the priorities above.
