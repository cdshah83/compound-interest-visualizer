# Scenario Comparison — Design Spec
**Date:** 2026-06-04  
**Status:** Approved

## Overview

A third mode that lets users run two projections side-by-side on a shared chart. Accessed via a third tab in the existing mode toggle. Both scenarios use Calculate mode inputs only (Goal mode + compare would be confusing).

## Mode Toggle

Extends the existing two-tab toggle to three: `Calculate` | `Goal` | `Compare`. Same styling — gold background on active tab.

## Compare Mode Layout

The `.app` CSS grid changes from `360px 1fr` to `1fr 1fr` when in compare mode. Two equal-width panels sit side-by-side above a full-width results area.

**Scenario A panel** — gold accents (`var(--gold)`), same five sliders as Calculate mode. Pre-filled with the current A state.

**Scenario B panel** — green accents (`var(--green)`), same five sliders. Pre-filled with a copy of Scenario A's values when Compare is first activated, so the user only needs to change the one variable they want to test.

Panel titles: `Scenario A` / `Scenario B` (replaces `Your Inputs`).

**Mobile (≤800px):** panels stack vertically — A then B — with results below.

## Stats Row (Compare mode)

Three cards:

| Card | Style | Content |
|---|---|---|
| Scenario A | Gold border + gradient | Final balance for A |
| Scenario B | Green border + gradient | Final balance for B |
| Difference | Default | `B − A`, prefixed `+` or `−`, green if positive, red if negative |

## Chart (Compare mode)

Both projections plotted on the same axes and scale:
- **Scenario A** — gold solid line + gold area fill (existing style)
- **Scenario B** — green dashed line, no area fill (keeps chart readable)
- Legend updated: `Scenario A` / `Scenario B`
- Tooltip shows both values at hovered year: `Year 20 — A: $240K / B: $310K`

## Milestones Table

Hidden in Compare mode — replaced by nothing. The chart and stat cards tell the story without the table adding noise.

## URL

Extends shareable URL. All existing params (`p`, `m`, `r`, `y`, `f`) remain for Scenario A. Scenario B adds prefixed params:

```
?mode=compare&p=10000&m=500&r=7&y=30&f=4&bp=10000&bm=1000&br=7&by=30&bf=4
```

On load, B params fall back to A values if absent.

## State

Two new state variables per B input: `principalB`, `monthlyB`, `rateB`, `yearsB`, `freqB`. Initialized from URL `b*` params; if absent, copied from A values at time of first entering Compare mode.

## Files Changed

- `app/page.tsx` — new B state vars, compare layout, updated stats/chart/URL logic
- `app/globals.css` — `.panel-b` green accent overrides, compare grid layout, `.stat-card.green-highlight`
