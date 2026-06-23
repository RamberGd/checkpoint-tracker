# CheckPoint Design Sync Notes

## Setup

- Package name in config: `checkpoint-frontend` (the Next.js app's own `package.json` name is `frontend`; the DS name is set in config)
- Entry: `./app/components/_ds_entry.ts` — manually curated re-export of the 4 synced components (pass via `--entry` flag; no dist/)
- Components are in `app/components/`; excluded 9 app-coupled components (Next.js navigation, auth/search context, animation-only) from the sync via `componentSrcMap`
- `srcDir: app/components` resolves source enrichment paths correctly from the frontend root

## Known render warns

- **CropModal `[RENDER_THIN]`**: the `.overlay` div is `position: fixed; inset: 0` — DOM height measures as 0px (out of flow), but the screenshot confirms the panel renders correctly. Benign — fixed-overlay component.
- **EmptyShelf ghost cards dark-on-dark**: ghost borders use `var(--rule)` on `var(--bg)` background — intentionally subtle per the editorial design language. Not a render error.

## Font note

Fonts (Barlow Condensed, Spectral, Share Tech Mono) are injected at runtime by Next.js via `next/font/google` as CSS custom properties (`--ff-display`, `--ff-body`, `--ff-mono`). These don't ship as `@font-face` in `globals.css`, so the design bundle uses browser-default fallbacks (sans-serif, serif, monospace). Typography proportions and hierarchy are still representative. The 3 "missing tokens" in validate output are these font-family variables — expected, below threshold, non-blocking.

## Re-sync risks

- **`_ds_entry.ts`**: must stay in sync with the 4 chosen components. If components are added to the app, update this file and `componentSrcMap` in config.
- **CSS module class name scoping**: relies on esbuild 0.17+ auto-`local-css` behaviour for `.module.css` files. The scoped names (`.EmptyShelf_shelf` etc.) are esbuild's deterministic output — stable as long as the file names don't change.
- **`CropModal` uses `react-easy-crop`**: if the dep is updated or removed from `frontend/package.json`, the component may fail to bundle.
- **`CropMarks` imports `../../page.module.css`** (relative from `_ds_entry.ts` → `app/components/CropMarks.tsx` → `../page.module.css`): if `page.module.css` is renamed or its crop-mark classes change, the component will silently lose its CSS.
- **No `dist/` or `.d.ts`**: `.d.ts` bodies are synthesised from source via ts-morph — keep TypeScript interfaces explicit; complex generics may produce `any` props in the emitted types.
