# CLAUDE.md — Project Guidelines

## Project Overview

This is a **Next.js** frontend for a multi-tenant education management platform. The codebase follows a feature-based architecture with shared UI components, a CSS custom property design system, and Tailwind CSS v4.

---

## Design System & UI Guidelines

### Core Principles

1. **Mobile-First** — Every layout starts at 320px and scales up. Use `sm:`, `md:`, `lg:` breakpoints to progressively enhance.
2. **Theme-Agnostic** — All colors use CSS custom properties (`var(--surface)`, `var(--text-primary)`, etc.) that adapt to light and dark mode automatically. Never hardcode color values.
3. **Minimal & Professional** — Clean spacing, consistent typography, restrained use of color. No emojis in UI.
4. **Accessible** — Semantic HTML, focus-visible rings, proper contrast ratios, reduced-motion support.

### Color & Theme Tokens

| Token | Usage |
|---|---|
| `bg-surface` | Page background, cards |
| `bg-surface-raised` | Input backgrounds, subtle elevation |
| `bg-surface-overlay` | Hover states, selected items |
| `bg-primary` | Primary actions, active indicators |
| `bg-primary/10` | Primary tinted backgrounds |
| `text-primary` | Headings, body text |
| `text-secondary` | Descriptions, metadata |
| `text-disabled` | Timestamps, muted labels |
| `border` | Card borders, dividers |
| `border-subtle` | Light dividers |

### Semantic Colors

| Color | Variant | Usage |
|---|---|---|
| `success` | `bg-success`, `text-success` | Active states, completed actions |
| `warning` | `bg-warning`, `text-warning` | Pending items, caution |
| `danger` | `bg-danger`, `text-danger` | Destructive actions, errors |
| `info` | `bg-info`, `text-info` | Informational badges |

### Component Patterns

**Cards:**
```tsx
<Card variant="default">  {/* border + surface */}
<Card variant="elevated"> {/* shadow, no border */}
```

**Buttons:**
```tsx
<Button variant="primary">   {/* filled */}
<Button variant="outline">   {/* bordered */}
<Button variant="ghost">     {/* transparent */}
<Button variant="danger">    {/* destructive */}
```

**Badges:**
```tsx
<Badge variant="success" size="sm">Active</Badge>
<Badge variant="warning" size="sm">Pending</Badge>
```

### Layout Conventions

**Mobile Grid:**
```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
```

**Mobile FAB (Floating Action Button):**
```tsx
<div className="fixed bottom-20 right-4 z-40 sm:hidden">
  <button className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform">
    <Plus size={24} />
  </button>
</div>
```

**Touch Targets:** Minimum 44x44px for interactive elements on mobile.

**Spacing:** Use consistent spacing scale — `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px).

### Typography

- **Headings:** `text-xl font-bold text-text-primary` (page titles), `text-sm font-semibold text-text-primary` (section titles)
- **Body:** `text-sm text-text-primary` (primary), `text-xs text-text-secondary` (metadata)
- **Timestamps:** `text-[10px] text-text-disabled`
- **Labels:** `text-[10px] text-text-secondary uppercase tracking-wider`

### Interaction Patterns

**Hover States:** `hover:bg-surface-overlay transition-colors`
**Active/Press:** `active:scale-[0.98] transition-transform`
**Focus:** `focus-visible:outline-2 focus-visible:outline-primary`

### Dark Mode

Dark mode uses the `.dark` class on the root element. All tokens automatically adapt. Never write dark-mode-specific overrides outside of the token system.

---

## Code Conventions

- **Language:** TypeScript (strict)
- **Framework:** Next.js App Router with `"use client"` for interactive components
- **Styling:** Tailwind CSS v4 with CSS custom properties for theming
- **State:** React hooks + Zustand for global state
- **API:** REST services in `src/services/`
- **Components:** Shared UI in `src/components/ui/`, feature components in `src/features/<name>/components/`
- **Pages:** Route pages in `src/app/<role>/<feature>/page.tsx`

### File Naming

- Components: `PascalCase.tsx` (e.g., `LeadForm.tsx`)
- Services: `kebab-case.ts` (e.g., `leads.service.ts`)
- Hooks: `useCamelCase.ts` (e.g., `useLeads.ts`)
- Pages: `page.tsx` (Next.js convention)

### Import Order

1. React / Next.js
2. Third-party libraries
3. `@/components/ui/*`
4. `@/components/layout/*`
5. `@/features/*` / `@/hooks/*`
6. `@/services/*`
7. `@/types/*`
8. Local imports
