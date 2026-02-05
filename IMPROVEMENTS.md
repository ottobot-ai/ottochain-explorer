# Explorer UI Improvements Spec

## Overview
Enhance the OttoChain Explorer with better visualizations, filters, exports, and mobile support.

## 1. State Machine Visualization Enhancements

### File: `src/components/FiberStateViewer.tsx`

**Current:** Basic SVG with rectangles for states and curved lines for transitions.

**Improvements needed:**
- Add zoom controls (+ / - buttons, mouse wheel zoom)
- Add pan/drag to move the diagram
- Highlight the path taken (show visited states in different color)
- Add mini-map for large state machines
- Show transition labels on hover with animation
- Add "fit to view" button
- Color-code states by type (initial=green, final=blue, error=red, current=accent)

### Implementation hints:
- Use CSS transform for zoom: `transform: scale(${zoom})`
- Track pan offset in state: `const [pan, setPan] = useState({ x: 0, y: 0 })`
- Add mouse handlers for drag: `onMouseDown`, `onMouseMove`, `onMouseUp`
- Wrap SVG in a container div with `overflow: hidden`

## 2. More Filters on Fibers Page

### File: `src/components/FibersView.tsx`

**Current filters:** workflowType, status, owner

**Add these filters:**
- Date range (created after, created before)
- State filter (current state dropdown populated from workflowTypes.states)
- Sequence number range (min, max)
- Text search on fiberId
- "Has transitions" toggle (fibers with activity)

### Implementation:
```tsx
// Add to filter state
const [dateFrom, setDateFrom] = useState<string>('');
const [dateTo, setDateTo] = useState<string>('');
const [currentState, setCurrentState] = useState<string>('');
const [seqMin, setSeqMin] = useState<number | null>(null);
const [seqMax, setSeqMax] = useState<number | null>(null);
const [searchQuery, setSearchQuery] = useState<string>('');

// Add filter UI in a collapsible "Advanced Filters" section
```

### Add to GraphQL query variables:
The backend may not support all filters - do client-side filtering for unsupported ones.

## 3. Export Data Features

### Files to modify:
- `src/components/FibersView.tsx` - export fibers list
- `src/components/IdentityView.tsx` - export agents list
- `src/components/ContractsView.tsx` - export contracts list

### Features:
- "Export CSV" button in each view's header
- "Export JSON" button for raw data
- Include all visible/filtered data

### Implementation:
```tsx
// Add utility function in src/lib/export.ts
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(data[0] || {});
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### UI:
Add export buttons to view headers:
```tsx
<div className="flex gap-2">
  <button onClick={() => exportToCSV(data, 'fibers.csv')} className="btn-secondary text-xs">
    📥 CSV
  </button>
  <button onClick={() => exportToJSON(data, 'fibers.json')} className="btn-secondary text-xs">
    📥 JSON
  </button>
</div>
```

## 4. Mobile Responsiveness

### Files to modify:
- `src/App.tsx` - responsive layout
- `src/components/Nav.tsx` - mobile menu
- `src/components/StatsCards.tsx` - stack on mobile
- `src/components/FibersView.tsx` - single column on mobile
- `src/components/IdentityView.tsx` - single column on mobile
- `src/components/ContractsView.tsx` - single column on mobile
- `src/index.css` - add mobile breakpoints if needed

### Nav.tsx changes:
- Add hamburger menu button (visible on mobile)
- Hide nav links by default on mobile
- Show/hide menu on hamburger click
- Add mobile menu overlay

```tsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

// In JSX:
{/* Mobile hamburger */}
<button 
  className="lg:hidden p-2"
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
>
  <span className="text-xl">{mobileMenuOpen ? '✕' : '☰'}</span>
</button>

{/* Desktop nav */}
<div className="hidden lg:flex items-center gap-6">
  {/* existing nav links */}
</div>

{/* Mobile menu overlay */}
{mobileMenuOpen && (
  <div className="lg:hidden fixed inset-0 top-14 bg-[var(--bg)] z-40 p-6">
    <div className="flex flex-col gap-4">
      {/* nav links as full-width buttons */}
    </div>
  </div>
)}
```

### Layout changes:
Use Tailwind responsive classes:
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for card grids
- `flex-col lg:flex-row` for sidebars
- `hidden lg:block` for elements to hide on mobile
- `w-full lg:w-96` for fixed-width sidebars

### StatsCards.tsx:
Change grid from `grid-cols-6` to `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`

### FibersView.tsx:
- Stack fiber list and detail panel on mobile
- Make detail panel full-width overlay or below the list

## Testing

After each change, verify:
1. `npm run build` passes
2. No TypeScript errors
3. UI works on desktop
4. UI works on mobile (use browser dev tools device emulation)

## Priority Order
1. Export features (easiest, high value)
2. Mobile responsiveness (important for demos)
3. More filters (moderate complexity)
4. State machine visualization (most complex)
