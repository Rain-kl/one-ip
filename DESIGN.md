---
name: One Ping
description: A restrained network signal desk for split-route and IP diagnostics.
colors:
  signal-green: "#087f5b"
  paper-cool: "#f3f6f4"
  ink: "#121916"
  surface: "#ffffff"
  fog: "#edf2ef"
  rule: "#d6dfda"
  secondary-ink: "#56635c"
  information: "#176979"
  warning: "#c78000"
  danger: "#c13946"
  night: "#0b100e"
  night-surface: "#111815"
  night-signal: "#3fd39c"
typography:
  display:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
  body:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "Geist Variable, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.45
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.signal-green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "32px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
    height: "28px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: One Ping

## Overview

**Creative North Star: "The Signal Desk"**

One Ping is a quiet network operations surface: cool paper, precise rules, compact evidence, and green reserved for verified signal. The original blue IP mark identifies the product; the interface itself remains restrained so changing IP, location, latency, and risk data are easy to compare.

The design favors unframed page hierarchy followed by bounded diagnostic panels. It avoids decorative glow, glass, oversized type, and promotional composition. Uncertainty remains visible instead of being styled into confidence.

**Key Characteristics:**

- Dense, scan-first diagnostic panels with clear row alignment.
- Cool neutral surfaces with sparse signal green, amber, cyan, and red.
- An 8px maximum component radius and restrained ambient depth.
- The original IP mark paired with a compact brand lockup.
- Light and dark modes that preserve the same information hierarchy.

## Colors

The palette is neutral first; color is evidence, state, or interaction rather than decoration.

### Primary

- **Signal Green** (`#087f5b`; dark `#3fd39c`): active navigation, healthy results, primary addresses, focus, and measured success.

### Secondary

- **Information Teal** (`#176979`): alternate network paths and informational states.
- **Measured Amber** (`#c78000`): latency or evidence that needs attention but is not a failure.
- **Incident Red** (`#c13946`): confirmed failures, incidents, and detected risk flags.

### Neutral

- **Cool Paper** (`#f3f6f4`): light page background.
- **Clear Surface** (`#ffffff`): panels and popovers.
- **Network Ink** (`#121916`): primary text.
- **Route Fog** (`#edf2ef`): compact rows and subdued controls.
- **Rule Gray** (`#d6dfda`): boundaries and dividers.
- **Night Rack** (`#0b100e`) and **Night Surface** (`#111815`): dark-mode page and panels.

**The Evidence Color Rule.** Green, amber, cyan, and red must correspond to an actual state or action. They are not section decoration.

## Typography

**Display Font:** Geist Variable (with system sans fallback)

**Body Font:** Geist Variable (with system sans fallback)

**Character:** Compact and contemporary, with tabular data given room to scan. Weight and size establish hierarchy; letter spacing stays at zero.

### Hierarchy

- **Display** (720, 28px, 1.2): the page's single working title; 23px on narrow screens.
- **Headline** (700, 21px, 1.3): public IP values and important result values.
- **Title** (600, 16px, 1.35): panel and section titles.
- **Body** (400, 13px, 1.6): explanations, locations, and normal interface copy.
- **Label** (650, 11px, 1.45): status, metadata, and compact field names.

**The Data First Rule.** IP addresses, scores, locations, and operators may gain weight; explanatory prose stays quieter than the evidence.

## Layout

The desktop shell is centered at a maximum width of 1180px with 24px horizontal padding. Primary content uses 12px gaps; closely related facts use 4-8px gaps. The page title is unframed. Diagnostic cards begin immediately below it and use auto-fit columns so real result count determines the layout.

At 768px and below, the shell uses 14px horizontal padding, cards become a single column, and primary navigation becomes a fixed five-item bottom bar. Dense tables reflow into stacked result rows. At 390px the document must have no horizontal overflow.

## Elevation & Depth

Depth is ambient and secondary to borders. Cards use a one-pixel rule plus a low, soft shadow (`0 8px 28px rgb(17 35 27 / 5%)`); dark mode uses `0 12px 32px rgb(0 0 0 / 20%)`. Fixed mobile navigation receives a slightly stronger soft shadow to separate it from scrolling data.

**The Flat Evidence Rule.** No hard offset shadow, colored glow, or decorative glass. A panel is lifted only enough to remain legible against the page.

## Shapes

Cards, buttons, fields, and the logo frame stop at an 8px radius. Compact flags and status cells use 6px. Round shapes are reserved for binary indicators, avatar-like marks, and icon-only controls where the circle has a familiar interaction meaning.

## Components

### Buttons

- **Shape:** compact 6-8px corners with a stable 28-32px height.
- **Primary:** signal green with high-contrast text; use for an unambiguous main command.
- **Outline / Ghost:** neutral surface or transparent background; hover shifts tonally and focus uses the signal ring.
- **Icon buttons:** use Lucide icons, an accessible name, and a stable square footprint.

### Chips

- **Style:** pale tonal background, compact 6px corners, 10-11px label text.
- **State:** colors describe source type or measured status; unknown data remains neutral.

### Cards / Containers

- **Corner Style:** 8px.
- **Background:** clear surface in light mode, night surface in dark mode.
- **Shadow Strategy:** one-pixel rule plus ambient-low shadow.
- **Internal Padding:** 12-16px, with ruled separators between distinct evidence groups.

### Navigation

Desktop navigation is a single ruled row with the bilingual mark at left, text tabs in the middle, and utilities at right. The active tab uses signal green and a thin underline. Mobile navigation is an opaque, bounded bottom bar with five icon-and-label destinations; it must never resize as labels or states change.

### Exit Dossier

The exit dossier gives the public IP and reputation score the strongest numerical hierarchy, then places location and ISP/ASN beneath it. A subtle green or information-teal one-pixel boundary distinguishes route types without using a side stripe.

### Claude IP Assessment

On desktop, trust score, attributes, and risk flags occupy three ruled columns. On mobile, the same evidence stacks in reading order. Every score and flag names Net.Coffee as its source and never claims to be Claude's official account-risk decision.

## Do's and Don'ts

### Do:

- **Do** put live IP, location, ISP, ASN, latency, and source attribution ahead of explanatory copy.
- **Do** reserve state colors for measured or returned results.
- **Do** preserve explicit loading, unknown, unavailable, detected, and clear states.
- **Do** keep desktop and mobile information order equivalent even when the layout reflows.

### Don't:

- **Don't** fabricate example IPs, unlock claims, native-IP labels, safety verdicts, or latency values in the product UI.
- **Don't** use gradients, glass, large decorative type, colored side stripes, or nested cards as a substitute for hierarchy.
- **Don't** treat missing risk data as a clean result.
- **Don't** hide the One Ping name or IP mark behind generic tool branding.
