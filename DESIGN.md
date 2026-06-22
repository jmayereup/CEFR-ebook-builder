# Styling Design Guidelines: CEFR Language Story Generator

This document details the unified design system, structural styling conventions, typography hierarchies, and print media rules for the CEFR Language Story Generator application.

---

## 1. Design Tokens & Color Palette

The primary brand colors align with an organic **monochrome dark slate** and **mint green** theme. Mapped design tokens are declared in [index.css](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/index.css) under `:root` and exposed globally.

To maintain consistency and prevent hardcoded colors in React components, the Tailwind v4 theme block maps to these variables:

```css
@theme {
  --color-tj-primary: var(--tj-primary-color);
  --color-tj-primary-hover: var(--tj-primary-hover);
  --color-tj-primary-light: var(--tj-primary-light);
  --color-tj-primary-border: var(--tj-primary-border);
  --color-tj-success: var(--tj-success-color);
  --color-tj-success-light: var(--tj-success-light);
  --color-tj-error: var(--tj-error-color);
  --color-tj-error-light: var(--tj-error-light);
  --color-tj-tertiary: var(--tj-tertiary-color);
  --color-tj-text-main: var(--tj-text-main);
  --color-tj-text-muted: var(--tj-text-muted);
  --color-tj-bg-main: var(--tj-bg-main);
  --color-tj-bg-card: var(--tj-bg-card);
  --color-tj-bg-recessed: var(--tj-bg-recessed);
  --color-tj-border-main: var(--tj-border-main);
  --color-tj-forest: var(--tj-brand-forest);
  --color-tj-mint: var(--tj-brand-mint);
  --color-tj-mint-dark: var(--tj-brand-mint-dark);
}
```

*Implementation Instruction:* When building or editing UI components, developers must use the custom color variables (e.g. `bg-tj-primary` or `text-tj-forest`) instead of utility values like `bg-stone-850` or `text-teal-900`.

---

## 2. Natively Supported Dark Mode

Dark mode mappings are handled dynamically at the CSS level inside `.dark` selector blocks in [index.css](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/index.css):

```css
.dark {
  --tj-text-main: #f2f1ec;
  --tj-text-muted: #c8c6c5;
  --tj-bg-main: #1b1c19;
  --tj-bg-card: #30312e;
  --tj-bg-recessed: #121310;
  --tj-border-main: #444748;
  --tj-primary-color: #fbf9f4;
  --tj-primary-hover: #e4e2dd;
  --tj-primary-light: #30312e;
  --tj-primary-border: #444748;
  --tj-success-color: #b8ccba;
  --tj-success-light: #394b3d;
  --tj-error-color: #ffdbcf;
  --tj-error-light: #683b2b;
  --tj-tertiary-color: #f8b7a2;
  --tj-brand-forest: #fbf9f4;
  --tj-brand-mint: #394b3d;
  --tj-brand-mint-dark: #b8ccba;
}
```

*Rule:* Keep selectors clean. Mapped variables change values automatically under the `.dark` class hierarchy. Avoid using duplicate dark selectors in HTML classes (e.g. use `bg-tj-bg-card` instead of `bg-white dark:bg-zinc-800`).

---

## 3. Bilingual Typography & Script Overrides

The reader page displays stories in Latin and non-Latin scripts. To ensure proper readability and kerning:
* **UI Elements / English Passages**: Render using sans-serif configurations (`Inter`, `system-ui`).
* **Literature / Book Content**: Render using premium serif text structures (`EB Garamond`, `Lora`).
* **Non-Latin Script Overrides**: Specific CSS rules override font selections based on HTML `:lang()` attributes:

```css
/* Korean */
:lang(ko), [lang="ko"] {
  --font-sans: "Noto Sans KR", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Noto Serif KR", "Lora", ui-serif, Georgia, Cambria, serif;
}

/* Chinese */
:lang(zh), [lang="zh"] {
  --font-sans: "Noto Sans SC", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Noto Serif SC", "Lora", ui-serif, Georgia, Cambria, serif;
}

/* Thai */
:lang(th), [lang="th"] {
  --font-sans: "Noto Sans Thai", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Krub", "Lora", ui-serif, Georgia, Cambria, serif;
}

/* Japanese */
:lang(ja), [lang="ja"] {
  --font-sans: "Noto Sans JP", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Noto Serif JP", "Lora", ui-serif, Georgia, Cambria, serif;
}
```

---

## 4. Print Layout Isolation

Printing is isolated to output clean chapter contents without side navigation panels, toolbars, or theme switches:
* **Interactive Element Exclusion**: The navigation bar, buttons, select menus, input boxes, side settings panel, and background wrappers are set to `display: none !important` under `@media print`.
* **Reader Layout Expansion**: Main layout grids (`.lg:col-span-3`) collapse column limits and expand to 100% viewport width.
* **Colors and Borders**: Drop shadows are removed, background sheets are transparentized, and margins are set to 0.
