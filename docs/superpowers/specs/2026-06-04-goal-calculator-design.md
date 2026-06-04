# Goal Calculator — Design Spec
**Date:** 2026-06-04  
**Status:** Approved

## Overview

A reverse-mode calculator that answers "how much do I need to save monthly to reach a target balance?" Accessed via a tab toggle at the top of the control panel. The results area (chart + table) remains unchanged — it shows the growth projection for the calculated monthly amount.

## Mode Toggle

Two tabs at the top of the control panel: `Calculate` | `Goal`. Gold background on the active tab, same style as the existing compound-frequency toggle. Mode is stored in React state and encoded in the URL as `mode=goal` / `mode=calc` (extends the existing shareable URL feature). Defaults to `calc` if param is absent.

## Goal Mode — Inputs

The Monthly Contribution slider is removed. Replaced by:

| Slider | Range | Step | Default |
|---|---|---|---|
| Target Balance | $50,000 – $5,000,000 | $10,000 | $500,000 |

All other sliders remain: Initial Investment, Annual Return, Time Horizon, Compound Frequency.

## Goal Mode — Output

An answer card at the bottom of the control panel (below a `<div className="divider" />`):

```
SAVE MONTHLY
$1,247
to reach $500,000 in 30 years
```

Styled as a highlight card: gold border, gradient background, top-edge gold line — matching the "Final Balance" stat card style.

**Edge case:** If `principal >= target`, show:
```
$0 / month
Your initial investment already covers this goal.
```

## Math

New pure function `calcGoal(target, principal, rate, years, freq)`:

```
g = (1 + r/n)^(n×years)          // growth factor, where r = rate/100, n = freq
monthly = (target − principal × g) × (r/n) / ((g − 1) × (12/n))
```

Special case when `rate === 0`:
```
monthly = (target − principal) / (years × 12)
```

Result is clamped to `Math.max(0, monthly)`.

The calculated `monthly` is passed into the existing `calcData()` function unchanged — so the chart and table automatically reflect the goal scenario.

## URL Integration

Extends the shareable URL spec. New param `mode` added to the `replaceState` call:
- `?mode=goal&p=10000&r=7&y=30&f=4&target=500000`
- `?mode=calc&p=10000&m=500&r=7&y=30&f=4` (default, `mode=calc` optional)

`target` param (integer, 50000–5000000) added alongside existing params.

## Files Changed

- `app/page.tsx` only — new `calcGoal()` function, `mode` and `target` state vars, conditional panel render, URL param additions.
