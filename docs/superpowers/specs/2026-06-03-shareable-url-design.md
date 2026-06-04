# Shareable URL — Design Spec
**Date:** 2026-06-03  
**Status:** Approved

## Overview

Encode all five calculator inputs into URL query params so users can share their exact projection by copying the browser address bar. The URL updates silently as sliders move — no button, no UI chrome.

## URL Format

```
?p=10000&m=500&r=7&y=30&f=4
```

| Param | State var | Type | Valid range |
|---|---|---|---|
| `p` | `principal` | integer | 1000–500000 |
| `m` | `monthly` | integer | 0–5000 |
| `r` | `rate` | float | 1–20 |
| `y` | `years` | integer | 1–50 |
| `f` | `compoundFreq` | integer | 1, 4, or 12 |

## Behaviour

**On load:** Read all five params from `window.location.search`. For each param, parse as number and validate it falls within the slider's allowed range. Use the parsed value if valid; fall back to the existing default if missing or invalid. This means partial URLs work fine — e.g. only `?r=10` will load with rate=10 and all other defaults.

**On change:** A single `useEffect` with `[principal, monthly, rate, years, compoundFreq]` as dependencies builds the query string and calls `window.history.replaceState(null, '', '?' + params)`. No page reload, no router navigation, no scroll jump.

## Implementation Notes

- Use `useSearchParams()` from `next/navigation` to read params — SSR-safe, no hydration mismatch, no flash of default values. Requires the component (or its parent) to be wrapped in `<Suspense>`.
- Initialize each `useState` with `Number(searchParams.get('p')) || 10000` style expressions — computed once on mount from the live search params.
- `replaceState` not `pushState` — sharing shouldn't pollute the browser history stack with every slider tick.
- Wrap `<Home />` in a `<Suspense fallback={null}>` in a thin parent component to satisfy Next.js App Router's `useSearchParams` requirement.

## Files Changed

- `app/page.tsx` only — ~20 lines added, no new files or dependencies.
