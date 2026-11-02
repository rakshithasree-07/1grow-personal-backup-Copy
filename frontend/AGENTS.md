<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Agent Guidelines

## UI/UX Design Rules

### Mobile-First Design

- Start every layout for 320px viewport width
- Use Tailwind responsive prefixes: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Mobile grids: `grid-cols-2 gap-3` → `sm:grid-cols-4 sm:gap-4`
- Stack elements vertically on mobile, side-by-side on desktop
- Minimum touch target: 44x44px for buttons and interactive elements

### No Emojis in UI

- Never use emojis in buttons, labels, badges, headings, or body text
- Use Lucide React icons instead for visual indicators
- Icons should be 14-24px, consistent with the icon system

### Highlight Key Terms

- Use `font-medium` or `font-semibold` for key terms within sentences
- Use semantic color tokens: `text-primary` for emphasis, `text-secondary` for supporting text
- Badge variants for status: `success`, `warning`, `danger`, `info`, `brand`

### Clean UI Patterns

- Cards: `<Card variant="default">` with `rounded-[var(--radius-md)]`
- Spacing: Use `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px)
- Borders: `border border-border` for cards, `border-border-subtle` for dividers
- Shadows: `shadow-[var(--shadow-1)]` for subtle elevation, `shadow-[var(--shadow-2)]` for cards

### Dark & Light Theme Support

- All colors via CSS custom properties — never hardcode hex/rgb values
- Surface colors: `bg-surface`, `bg-surface-raised`, `bg-surface-overlay`
- Text colors: `text-text-primary`, `text-text-secondary`, `text-text-disabled`
- Border colors: `border-border`, `border-border-subtle`
- Semantic: `bg-success`, `bg-warning`, `bg-danger`, `bg-info` with light variants

### Component Patterns

**Floating Action Button (Mobile):**
```tsx
<div className="fixed bottom-20 right-4 z-40 sm:hidden">
  <button className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform">
    <Plus size={24} />
  </button>
</div>
```

**Card with Actions:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
    <Button variant="ghost" size="xs">View All</Button>
  </CardHeader>
  <CardBody className="pt-0">
    {/* Content */}
  </CardBody>
</Card>
```

**Status Badge:**
```tsx
<Badge size="sm" variant={status === "ACTIVE" ? "success" : "warning"}>
  {status}
</Badge>
```

**Interactive States:**
- Hover: `hover:bg-surface-overlay transition-colors`
- Active/Press: `active:scale-[0.98] transition-transform`
- Focus: `focus-visible:outline-2 focus-visible:outline-primary`

### Responsive Table Alternative

On mobile, replace tables with card-based lists:
```tsx
{/* Desktop: Table */}
<div className="hidden sm:block">
  <Table columns={columns} data={data} />
</div>

{/* Mobile: Cards */}
<div className="sm:hidden space-y-3">
  {data.map((item) => (
    <div key={item.id} className="rounded-[var(--radius-md)] border border-border p-4">
      {/* Card content */}
    </div>
  ))}
</div>
```

### Search & Filter Pattern

```tsx
{/* Mobile: Collapsible filters */}
<div className="flex gap-2">
  <div className="flex-1">
    <SearchBar placeholder="Search..." />
  </div>
  <Button variant={showFilters ? "primary" : "outline"} size="sm">
    <SlidersHorizontal size={16} />
  </Button>
</div>
{showFilters && (
  <div className="pt-3 border-t border-border">
    <FilterBar filters={filters} />
  </div>
)}
```

## Code Quality Rules

- Use TypeScript strict mode
- Prefer `const` over `let`
- Destructure props in function parameters
- Early returns for error/empty states
- Consistent error handling with toast notifications
- No console.log in production code
- Export components as named exports from feature directories
