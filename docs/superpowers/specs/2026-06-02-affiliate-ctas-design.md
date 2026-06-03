# Affiliate CTAs — Design Spec
**Date:** 2026-06-02  
**Status:** Approved

## Overview

Add an affiliate CTA section to the compound interest visualizer between the stats row and the growth chart. The section shows three investment platform cards with contextual copy that uses the user's live projected balance.

## Placement

Between `<div class="stats-row">` and `<div class="chart-container">` in `app/page.tsx`.

## Component

A single `<div class="affiliate-cta">` block containing:

1. **Contextual headline** — `"Start building your {fmtFull(final)} — pick a platform"` — updates live as sliders change.
2. **Three platform cards** side by side, each with:
   - Platform name (gold, bold)
   - "Best for" tagline (muted)
   - Feature hook (green)
   - "Open account →" CTA button (gold-outlined)
   - `href` linking to affiliate URL, `target="_blank" rel="noopener noreferrer"`
3. **Disclosure line** — `"Affiliate links — we may earn a commission at no cost to you"` in muted small text below the cards.

### Platform content

| Platform | Tag | Hook | Affiliate URL (placeholder) |
|---|---|---|---|
| Robinhood | Best for beginners | Free stock on signup | `#robinhood` |
| M1 Finance | Best for auto-investing | Automatic rebalancing | `#m1` |
| Public.com | Best for transparency | No payment for order flow | `#public` |

URLs are `#` placeholders — swap in real affiliate links after signing up for each program:
- Robinhood: robinhood.com/us/en/affiliates
- M1 Finance: m1.com/affiliates
- Public: public.com/affiliates

## Styling

Matches existing design system:
- Container: `var(--surface)` background, `1px solid var(--border)` border, `16px` border-radius, `1.8rem` padding — same as `.chart-container`
- Cards: `var(--surface2)` background, gold border on hover, same `14px` border-radius as `.stat-card`
- CTA button: `var(--gold-dim)` background, `var(--gold)` border, `var(--gold-light)` text
- Disclosure: `0.7rem` font size, `var(--muted)` color, centered below cards
- Animation: `fadeUp 0.5s 0.08s ease both` — slots between stat-card and chart-container delays

## Files Changed

- `app/page.tsx` — add `AffiliateCTA` JSX block
- `app/globals.css` — add `.affiliate-cta`, `.affiliate-card`, `.affiliate-btn` styles
