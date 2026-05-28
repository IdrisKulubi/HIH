# Design system

## Theme

Light theme default for staff dashboards. Scene: committee and officers reviewing cases in well-lit offices; readability and calm over drama. Dark mode exists in tokens but is not the primary staff experience.

## Color

**Strategy:** Restrained product UI with module accents.

| Role | Usage |
|------|--------|
| Neutrals | `background`, `muted`, `border` (slate-tinted HSL in `:root`) |
| Programme brand | `--brand-blue` `#1da1db`, `--brand-red` `#c91e26` for marketing and key CTAs |
| A2F officer module | Emerald header `bg-emerald-900`, emerald-100 chips |
| A2F committee module | Hand in Hand brand blue `#1da1db`, light header with SVG mark, `brand-blue/5` surfaces |
| Semantic | Emerald success, amber warning, red destructive |

Avoid pure `#000` / `#fff` on large surfaces; use `foreground` / `background` tokens.

## Typography

- **Sans:** Geist (`--font-geist-sans`) via Next.js layout.
- **Scale:** `text-2xl` page titles, `text-base` card titles, `text-sm` body and table cells, `text-xs` metadata and stat labels.
- **Weight:** `font-bold` / `font-semibold` for hierarchy; avoid display fonts in UI chrome.
- **Line length:** Prose blocks max ~70ch; tables may be full width.

## Spacing and layout

- Page container: `container mx-auto px-4 py-8 space-y-6`.
- Section rhythm: `gap-4` grids for stats, `space-y-4` in cards.
- Sticky top nav: `sticky top-0 z-40` module headers.
- Case review (lg+): two columns with `lg:grid-cols-[1fr_320px]` and sticky side panel.

## Components

- **shadcn/ui:** Card, Table, Button, Badge, Select, Input, Skeleton, Accordion, Progress.
- **Stage pills:** Rounded-full `text-xs font-medium px-2.5 py-1` with paired text/bg classes from shared config.
- **Stat panels:** `rounded-xl` tinted backgrounds (`bg-brand-blue/5`, `bg-muted/50`), not left border stripes.
- **Empty states:** Centered icon (duotone, low opacity), title + helper line.
- **Loading:** Skeleton blocks matching final layout.

## Motion

150–200ms transitions on hover/focus only. No page-load choreography. Ease-out; no bounce.

## Module: Committee dashboard

- Header: white bar, `HandInHandLogo` + programme title, `brand-blue` rule and nav active state.
- Stats: three tinted panels using `brand-blue/5` and neutral muted.
- Filters: search + stage + decision selects in one card.
- Table: hover row, Review action, GAIR readiness column; enterprise chips use `brand-blue/10`.
