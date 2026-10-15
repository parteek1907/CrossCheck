# Design System & UI/UX Constitution

<!-- stitch:design-schema 1 -->
<!-- impeccable:design-schema 1 -->

## Design Philosophy & Tone
- **Anti-Slop Craftsmanship**: Zero generic bootstrap/tailwind defaults, no clunky cookie-cutter templates, no purple neon glow clichés.
- **Fluid & Physical**: Micro-interactions grounded in Apple Human Interface Guidelines and Emil Kowalski design engineering principles.
- **Typography-First**: Curated modern font pairings with balanced scale, optical sizing, and deliberate tabular numbers.

## Color Palette & Visual System
- **Surfaces**: Layered depth using subtle elevation, frosted glass materials (`backdrop-filter: blur()`), and calibrated border highlights.
- **Neutral Core**: Tailored dark/light tonal scales with neutral-to-warm contrast.
- **Accents**: Intentional, purpose-driven accent tones avoiding rainbow gradients.

## Interaction & Motion Standards
- Spring physics for modals, sheets, dropdowns, and toggles.
- Animate only composite properties (`transform`, `opacity`) to guarantee 60/120fps smooth performance.
- Safe-area insets (`h-dvh`, safe-area padding) for fluid mobile and desktop parity.

## Component Architecture
- Accessible primitives with full keyboard focus states, ARIA landmarks, and screen reader labels.
- Clean composition patterns avoiding boolean prop explosion.
