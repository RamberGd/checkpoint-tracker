# CheckPoint Design System — Conventions

CheckPoint is a dark editorial game-tracker UI. Components are exported from `window.CheckPoint` and styled via CSS custom properties from `globals.css`. No provider wrapper is needed.

## Setup

No root provider required. Import components directly:

```jsx
import { EmptyShelf, Reveal, CropMarks, CropModal } from 'checkpoint-frontend';
```

All components assume `globals.css` is loaded (dark background, design tokens). Apply it to the container:

```html
<div style="background: var(--bg); color: var(--ink); font-family: var(--font-body);">
  <!-- components here -->
</div>
```

## Design tokens — use these, never hardcode values

**Palette (oklch):**
| Token | Value | Use |
|---|---|---|
| `--bg` | `oklch(0.07 0 0)` | Page background |
| `--surface` | `oklch(0.13 0.008 330)` | Cards, panels |
| `--primary` | `oklch(0.52 0.155 328)` | Brand purple |
| `--accent` | `oklch(0.75 0.150 68)` | Amber — CTAs, highlights |
| `--ink` | `oklch(0.93 0.012 330)` | Body text |
| `--muted` | `oklch(0.52 0.018 330)` | Secondary text, labels |
| `--rule` | `oklch(0.20 0.005 330)` | Borders, dividers |

**Typography:**
| Token | Value |
|---|---|
| `--font-display` | Barlow Condensed Bold/Black (fallback: sans-serif) |
| `--font-body` | Spectral Regular/SemiBold (fallback: serif) |
| `--font-mono` | Share Tech Mono (fallback: monospace) |
| `--type-display` | `clamp(4rem, 14vw, 9rem)` |
| `--type-headline` | `clamp(2.5rem, 7vw, 5rem)` |
| `--type-subhead` | `clamp(1.25rem, 3vw, 2rem)` |
| `--type-body` | `clamp(1rem, 1.5vw, 1.2rem)` |
| `--type-caption` | `clamp(0.7rem, 1vw, 0.85rem)` |

**Layout:** `--gutter: clamp(2rem, 10vw, 12rem)` — use for page-edge padding.

**Easing:** `--ease-out-expo` and `--ease-out-quart` for transitions.

## Styling idiom

CheckPoint uses **CSS custom properties** (tokens) for all design values — no utility classes. Apply tokens via inline `style` or CSS:

```jsx
// Correct — token-driven
<p style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--type-caption)' }}>
  Caption text
</p>

// Correct — section rule
<div style={{ borderTop: '1px solid var(--rule)', paddingTop: '1.5rem' }}>
```

Labels use `--font-mono` + `text-transform: uppercase` + `letter-spacing: 0.12em`. Body uses `--font-body` italic for secondary/editorial copy. Display headings use `--font-display` with tight `line-height: 1.1`.

## Components

**EmptyShelf** `{ line: string }` — Ghost cover grid (6 placeholder cards) + an italic editorial line. Use in empty list states (played, wishlist, favourites).

**Reveal** `{ children, delay?, variant?, className?, style? }` — Scroll-reveal wrapper. Wraps any content and fades/translates it in when it enters the viewport. `variant="image"` uses blur-in instead of slide. `delay` staggers multiple items. Renders children fully on SSR.

**CropMarks** `{}` — Fixed-position editorial registration marks (bottom-left + bottom-right corners). Decorative branding detail for full-page layouts. No props.

**CropModal** `{ src: string, onApply: (blob: Blob) => void, onCancel: () => void }` — Full-screen avatar crop modal. `src` is an object URL or data URI. Opens immediately when rendered; close by calling `onCancel`.

## Idiomatic composition

```jsx
// Page section with staggered reveal
<section style={{ padding: '4rem var(--gutter)', background: 'var(--bg)' }}>
  <Reveal>
    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--type-headline)', color: 'var(--ink)' }}>
      Your Library
    </h2>
  </Reveal>
  <Reveal delay={80}>
    <EmptyShelf line="Nothing here yet." />
  </Reveal>
</section>
```
