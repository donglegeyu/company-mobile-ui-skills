# Company Mobile UI Design Language

> This document is built for AI agents and design tools. It describes the visual language, design tokens, and mobile-specific rules of Company Mobile UI — an enterprise mobile component library based on Ant Design Mobile 5.x with a custom brand theme.

## Quick Facts

| Property | Value |
|---|---|
| Library | `@donglegeyu/company-mobile-ui` |
| Version | 0.1.1 |
| Base | Ant Design Mobile 5.x |
| Brand Primary Color | `#F95914` (vitality orange) |
| Brand Light | `#FFF1E6` (light-orange background) |
| Brand Dark (pressed) | `#E04E0E` |
| Touch Target | 44px (Apple HIG minimum) |
| Border Radius | 6px / 8px / 12px (sm / base / lg) |
| Font Size | 14px (base) |
| Theme System | **CSS variables** (`--adm-color-*`) — NOT React Context |

## Installation

```bash
npm install @donglegeyu/company-mobile-ui
```

Peer dependencies: `antd-mobile >=5.0.0`, `react >=18.0.0`, `react-dom >=18.0.0`.

## Minimal Setup

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MobileThemeProvider, MobileButton } from '@donglegeyu/company-mobile-ui';

createRoot(document.getElementById('root')!).render(
  <MobileThemeProvider>
    <MobileButton color="primary">Brand Button</MobileButton>
  </MobileThemeProvider>
);
```

`import "@donglegeyu/company-mobile-ui"` auto-injects `global.css` which defines all `--adm-color-*` brand variables on `:root`. `MobileThemeProvider` only handles `locale`.

## Critical Rules for AI Agents

1. **NEVER use antd-mobile native components directly.** Always use `MobileXxx` (e.g. `MobileButton`, not `Button`). `import type` from antd-mobile is allowed; `ConfigProvider` is allowed for `locale` only.
2. **NEVER hardcode colors.** Use CSS variables `var(--adm-color-*)` / `var(--mobile-color-*)` or the `mobileDesignRules` constant.
3. **NEVER use `!important`** in component styles. Use inline `style` (naturally higher specificity) or CSS Modules compliant nested selectors.
4. **NEVER use `any` type.** Define explicit TypeScript interfaces.
5. **NEVER use default exports.** Always use named exports.
6. **`ConfigProvider` only takes `locale`.** NEVER pass a `theme` prop (silently ignored in antd-mobile v5).
7. **Mobile hard rules**: tappable ≥ 44×44; safe-area utilities for edge-sticking components; `px` units only; no PC events; tap-highlight off.

## Theme Mechanism — CSS Variables (KEY DIFFERENCE from PC antd)

PC antd uses React Context + a Seed/Map/Alias 3-layer token architecture read at runtime via `theme.useToken()`. **Mobile is completely different:**

1. antd-mobile v5 themes are driven by **CSS variables** (`--adm-color-*`) — no Seed/Map/Alias layers, no context to read
2. `ConfigProvider` **does not support a `theme` prop** — it only handles `locale`
3. Runtime token reads use `var(--adm-color-*)` or the `mobileDesignRules` constant — NOT `theme.useToken()`

Our token system has two layers:

| Layer | Prefix | Source | Usage |
|---|---|---|---|
| Official mapping | `--adm-color-*` / `--adm-radius-*` | Overrides antd-mobile official variables | Drives all antd-mobile component themes |
| Enterprise extension | `--mobile-color-*` / `--mobile-radius-*` | Custom | Business custom scenarios |

## Differences from antd-mobile Default Theme

This is the most important reference table for AI agents — the following CSS variables are overridden, do NOT use antd-mobile defaults:

| CSS Variable | antd-mobile default | Mobile UI | Reason |
|---|---|---|---|
| `--adm-color-primary` | `#1677FF` (blue) | `#F95914` (orange) | Brand identity |
| `--adm-color-wathet` | `#e5f6ff` (light blue) | `#FFF1E6` (light orange) | Brand identity (selected/bg) |
| `--adm-radius-s` | `8px` | `6px` | Mobile radius scale |
| `--adm-radius-m` | `16px` | `8px` | Mobile radius scale |
| `--adm-radius-l` | `20px` | `12px` | Mobile radius scale |

## Brand Color System

| Token | Value | Usage |
|---|---|---|
| `--adm-color-primary` | `#F95914` | Primary buttons, links, selected states |
| `--mobile-color-primary-hover` | `#E04E0E` | Pressed state for primary elements |
| `--mobile-color-primary-light` | `#FFF1E6` | Light background (selected state / background) |
| `--adm-color-success` | `#00B42A` | Success |
| `--adm-color-warning` | `#FF7D00` | Warning |
| `--adm-color-danger` | `#F53F3F` | Error |
| `--adm-color-yellow` | `#FF9F18` | Yellow |
| `--adm-color-orange` | `#FF6430` | Orange |

## Text Color Spec

| Token | Value | Usage |
|---|---|---|
| `--mobile-color-text-primary` | `#1D2129` | Primary text |
| `--mobile-color-text-secondary` | `rgba(0, 0, 0, 0.65)` | Secondary text |
| `--mobile-color-text-tertiary` | `rgba(0, 0, 0, 0.45)` | Tertiary text / placeholder |
| `--mobile-color-text-disabled` | `rgba(0, 0, 0, 0.25)` | Disabled text |

## mobileDesignRules Constant

For non-CSS contexts (JS logic, inline styles), use the `mobileDesignRules` export:

```tsx
import { mobileDesignRules } from '@donglegeyu/company-mobile-ui';

mobileDesignRules.colors.brand          // '#F95914'
mobileDesignRules.colors.brandLight     // '#FFF1E6'
mobileDesignRules.colors.brandDark      // '#E04E0E'
mobileDesignRules.borderRadius.base     // '8px'
mobileDesignRules.touchTarget           // 44 (Apple HIG min tappable)
mobileDesignRules.safeArea.bottom       // 'env(safe-area-inset-bottom)'
mobileDesignRules.fontSize.base         // '14px'
mobileDesignRules.motion.normal         // '0.2s'
```

`useMobileToken()` returns the same `mobileDesignRules` constant for hook-style consumption.

## Local Theme Override

To change the theme color of a nested subtree, use `generateMobileThemeVars()` to generate a CSS variable object and pass it as a container `style`:

```tsx
import { generateMobileThemeVars, MobileButton } from '@donglegeyu/company-mobile-ui';

export const NestedThemeExample = () => {
  return (
    <div style={generateMobileThemeVars()}>
      <MobileButton color="primary">局部主题色按钮</MobileButton>
    </div>
  );
};
```

NEVER use `<ConfigProvider theme={...}>` for this — it is silently ignored.

## Mobile-Specific Specs

| # | Spec | Token / Utility |
|---|---|---|
| 1 | Tappable target ≥ 44×44 | `--mobile-touch-target` (44px) / `mobileDesignRules.touchTarget` |
| 2 | Safe-area adaptation | `.mobile-safe-area-top` / `.mobile-safe-area-bottom` / `env(safe-area-inset-*)` |
| 3 | `px` units only | project ships `postcss-px-to-viewport-8-plugin`; never mix rem/em/vw |
| 4 | No tap highlight | `-webkit-tap-highlight-color: transparent` (global on body) |

## How AI Agents Should Use This

1. Read `/design.md` (or this file) for the full CSS variable value table
2. Read the differences table to confirm which `--adm-color-*` are overridden (primary orange, wathet light-orange, radius scale)
3. When generating code, read tokens at runtime via `var(--adm-color-*)` / `mobileDesignRules` — never hardcode
4. For local theme overrides use `generateMobileThemeVars()` passed to a container style — NEVER `<ConfigProvider theme={...}>`
