# WorldForge UI Review

An honest assessment of the current interface — what's working, what's holding it back, and what would make it feel like a real product.

---

## What's Working

### Layout & Information Architecture
The sidebar + function bar + workspace pattern is solid. Having two navigation layers (sidebar for context, function bar for quick switching) gives users multiple mental models for finding their way around. The 3-column content grid (list | detail | editor) is a proven pattern for CRUD workspaces and works well here.

### Visual Consistency
The glassmorphism panels, `backdrop-filter: blur()` overlays, and dark gradients create a cohesive atmosphere. Border radii, spacing, and pill badges are consistent throughout. The color system (periwinkle blues, muted golds, soft rose) avoids the harsh neon traps most dark themes fall into.

### TemporalDock Interaction
The collapsible dock that expands on hover is a smart use of progressive disclosure — it keeps temporal controls accessible without consuming permanent screen real estate. The invisible slider over a visual tick track is a nice touch.

### Page Transitions
The Framer Motion `AnimatePresence` with subtle scale + opacity + y-offset creates smooth workspace switches without feeling sluggish (150ms is right).

---

## What Needs Attention

### 1. Typography Is Too Safe
IBM Plex Sans is a fine workhorse, but it flattens the entire interface into a utilitarian tone. A world-building tool should feel evocative — like opening a grimoire or a cartographer's desk. Consider pairing a distinctive display/heading font (something with character — a serif, a slab, or a geometric display face) with IBM Plex Sans as the body. Even just swapping headings to something like Fraunces, Literata, or Playfair Display would immediately add personality.

The `h1`, `h2`, `h3` elements have no global typographic scale. Font sizes are scattered across individual classes (`clamp(1.8rem, 3vw, 2.8rem)`, `1rem`, `0.96rem`, etc.) without a defined hierarchy. Establishing a modular type scale (e.g., `--text-xs` through `--text-3xl`) would make future styling more consistent and intentional.

### 2. Redundant Navigation
The sidebar and function bar display the exact same workspace links with the same labels and descriptions. This means 30%+ of the visible UI above the fold is duplicate navigation. Consider:
- Making the function bar a compact tab strip (icon + label, no descriptions) and reserving verbose descriptions for the sidebar only
- Or removing the function bar entirely and using breadcrumbs or a minimal tab row

### 3. The Overview Page Lacks a Clear Action Hierarchy
The overview displays metrics, readiness, action cards, spotlights, recent additions, and a roadmap — all at roughly equal visual weight. When everything is a panel, nothing is the primary call to action. The "Jump Into a Workspace" cards are the most actionable content, but they're buried alongside passive data.

Consider:
- Making the hero section more compact (the heading "See structure, gaps, and momentum before diving into records" is long for a returning user)
- Elevating the workspace jump cards visually — larger, bolder, maybe with icons or color coding
- Collapsing the roadmap section entirely (it's static and adds no interaction value)

### 4. Forms Are Functional but Flat
The create/edit forms work but feel like admin panels rather than creative tools. Every entity type gets the same layout: stacked labels, full-width inputs, a button at the bottom. For a tool meant to inspire world-building:
- The textarea for "Summary" could use a richer writing experience (character count, markdown preview, or at minimum a placeholder that feels more inspiring than "A short note about the person")
- Consider inline validation feedback rather than relying solely on the global error banner
- The "Effective Tick" field is exposed as a raw number input with no context — most users won't know what tick value to enter. A label like "Exists from world tick" with a hint or link to the timeline would help

### 5. Empty States Could Guide Better
When there's no data, users see muted grey text like "Select a person to view and edit them." This is accurate but doesn't help a new user understand the workflow. Empty states are a huge opportunity:
- Show a visual (illustration, icon, or even just a larger, warmer message)
- Include a direct action button ("Create your first character" rather than just descriptive text)
- The `EntityWorkspacePlaceholder` is a step in the right direction but it still reads like documentation rather than onboarding

### 6. Color Usage Is Monochromatic
Nearly everything is blue-grey. The metric cards hint at color coding (blue, gold, green, rose) but it's barely perceptible — just `box-shadow: inset 0 0 0 1px rgba(...)`. The entity types (People, Places, Items) have no color differentiation. Giving each entity type a subtle signature color would improve scanability and make the workspace feel more alive.

### 7. No Keyboard Navigation Story
There's no visible focus ring styling, no keyboard shortcut hints, and no skip-to-content link. For a desktop Electron app that power users will spend hours in, keyboard navigation is critical. Consider:
- Visible, styled focus indicators (not just browser defaults)
- Keyboard shortcuts for common actions (Cmd+N to create, Cmd+S to save, arrow keys to navigate lists)
- The entity list items should be navigable with arrow keys

### 8. The "Refresh Data" Pattern Feels Manual
There are two "Refresh data" buttons (sidebar and function bar) and a custom event dispatch (`window.dispatchEvent(new Event('app:refreshList'))`). This suggests data isn't flowing reactively. Users shouldn't need to think about refreshing — after a create/update/delete, the UI should automatically reflect the new state. The current pattern where every mutation manually calls `refreshTimeline()` + `loadWorldData()` works, but the explicit refresh buttons suggest the user has learned not to trust the UI's freshness.

### 9. Responsive Breakpoints Need Work
The 1080px breakpoint collapses everything to single-column, which means the 3-column workspace layout (list | detail | editor) suddenly becomes a long vertical scroll. Consider an intermediate breakpoint that preserves list + detail and moves the editor to a modal or drawer. The TemporalDock going from fixed-right to static is also jarring — it loses its entire interaction model.

### 10. Missing Micro-interactions
The UI is static between page transitions. List items don't animate in. Creating a character doesn't celebrate the moment. Deleting doesn't have a fade-out. Small things that would make the tool feel more responsive:
- Staggered list item entrance animations
- Success feedback after create/save (a brief toast, a flash, a checkmark)
- Confirmation dialogs that aren't `window.confirm()` — a native browser dialog in an Electron app breaks the immersion

---

## Quick Wins

| Change | Impact | Effort |
|--------|--------|--------|
| Add a display font for headings | High — instant personality boost | Low |
| Define CSS custom properties for type scale and color palette | Medium — future-proofs all styling | Low |
| Replace `window.confirm()` with an in-app confirmation dialog | Medium — removes browser chrome from Electron | Low |
| Add focus-visible ring styles globally | Medium — accessibility baseline | Low |
| Color-code entity types (People = blue, Places = gold, Items = green) | Medium — improves scanability | Low |
| Deduplicate sidebar/function bar navigation | High — reclaims above-fold space | Medium |
| Add staggered entrance animations to entity lists | Medium — makes the app feel alive | Medium |
