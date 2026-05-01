---
name: Simple Design System
description: Universal design-system guidelines — minimal, clean UI with Inter/JetBrains Mono, specific color tokens, 4-base spacing, WCAG 2.2 AA
type: skill
trigger: Building UI components, choosing colors/typography, designing layouts, writing CSS/styling, creating design tokens, discussing accessibility
---

# Simple Design System

Expert design-system guidance for Simple design. Practical, implementation-ready rules for engineers and designers.

---

## Foundations

### Visual Style

Minimal, clean. Preserve visual hierarchy. Prefer semantic tokens over raw values.

### Typography

| Scale | Size |
|-------|------|
| xs    | 12px |
| sm    | 14px |
| base  | 16px |
| lg    | 20px |
| xl    | 24px |
| 2xl   | 32px |

| Role    | Font           |
|---------|----------------|
| Primary | Inter          |
| Display | Inter          |
| Mono    | JetBrains Mono |

Weights: 100, 200, 300, 400, 500, 600, 700, 800, 900.

### Color Tokens

| Token     | Value   |
|-----------|---------|
| primary   | #3B82F6 |
| secondary | #8B5CF6 |
| success   | #16A34A |
| warning   | #D97706 |
| danger    | #DC2626 |
| surface   | #FFFFFF |
| text      | #111827 |

Palette families: primary, neutral, success, warning, danger.

### Spacing Scale

4 / 8 / 12 / 16 / 24 / 32 (px). Use consistently — no arbitrary values.

---

## Component Families

### Interactive Controls
buttons, inputs, forms, selects/comboboxes, checkboxes/radios/switches, textareas, date/time pickers, file uploaders

### Data Display
cards, tables, data lists, data grids, charts, stats/metrics, badges/chips, avatars

### Navigation
breadcrumbs, pagination, steppers, tabs, navigation, sidebars, top bars/headers, command palette

### Overlays
modals, drawers/sheets, tooltips, popovers/menus

### Feedback
progress indicators, skeletons, alerts/toasts, notifications center, empty states

### Composition
accordions, carousels, search, onboarding, authentication screens, settings pages, documentation layouts, feedback components, pricing blocks, data visualization wrappers

---

## Component Rule Requirements

Every component specification must define:

### Required States
default, hover, focus-visible, active, disabled, loading, error — as relevant to the component.

### Interaction Behavior
Describe for keyboard, pointer, and touch separately.

### Token Usage
State spacing, typography, and color-token usage explicitly. No raw hex values in component specs — always reference tokens.

### Responsive Behavior
Include edge cases: long labels, empty states, overflow, truncation.

---

## Accessibility

**Standard:** WCAG 2.2 AA compliance is non-negotiable.

### Requirements
- Keyboard-first interactions on all interactive components
- Visible focus states (`focus-visible`) on every focusable element
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- All interactive elements must have accessible names
- ARIA roles and properties where native semantics are insufficient
- Every accessibility statement must be testable in implementation

### When Aesthetics Conflict with Accessibility
Flag the conflict explicitly, then **prioritize accessibility**.

---

## Writing Tone

Concise, confident, helpful. Labels and microcopy follow the same standard.

---

## Rules

### Do
- Prefer semantic tokens over raw values
- Preserve visual hierarchy
- Keep interaction states explicit
- Pair every do-rule with at least one concrete don't-example
- If introducing a new pattern, include migration guidance for existing components

### Don't
- Avoid low-contrast text
- Avoid inconsistent spacing rhythm
- Avoid ambiguous labels
- No rule should depend on ambiguous adjectives alone — anchor each rule to a token, threshold, or example

---

## Guideline Authoring Workflow

1. **Restate** the design intent in one sentence before proposing rules
2. **Define tokens** and foundational constraints before component-level guidance
3. **Specify component anatomy** — states, variants, interaction behavior
4. **Accessibility acceptance criteria** — testable, not aspirational
5. **Content and tone** — writing expectations with examples
6. **Anti-patterns** and migration notes for existing inconsistent UI
7. **QA checklist** executable in code review

---

## Required Output Structure

When generating design-system guidance, always use:

1. Context and goals
2. Design tokens and foundations
3. Component-level rules (anatomy, variants, states, responsive behavior)
4. Accessibility requirements and testable acceptance criteria
5. Content and tone standards with examples
6. Anti-patterns and prohibited implementations
7. QA checklist

---

## Constraint Language

- **"must"** — non-negotiable rules
- **"should"** — strong recommendations
- Every do-rule needs at least one concrete don't-example
- New patterns require migration guidance for existing components

---

## Quality Gates

- No ambiguous adjectives without a token, threshold, or example anchor
- Every accessibility statement must be testable
- System consistency over one-off local optimizations
- Conflicts between aesthetics and accessibility → accessibility wins
