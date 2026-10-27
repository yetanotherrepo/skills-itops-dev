---
name: "skills.itops.dev"
description: "The itops.dev terminal identity adapted to a readable public skill directory."
colors:
  green: "#00ff41"
  bg: "#000"
  panel: "#071009"
  ink: "#d3e5d7"
  muted: "#94b49d"
  line: "#274930"
  hover: "#0e2414"
  on-primary: "#001807"
  primary-hover: "#a9ffbf"
typography:
  display:
    fontFamily: "\"Courier New\", Courier, monospace"
    fontSize: "clamp(2.5rem, 5.2vw, 4.6rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-.04em"
  detail-display:
    fontFamily: "\"Courier New\", Courier, monospace"
    fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-.04em"
  headline:
    fontFamily: "\"Courier New\", Courier, monospace"
    fontSize: "clamp(1.6rem, 2.8vw, 2.3rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-.035em"
  catalog-title:
    fontFamily: "\"Courier New\", Courier, monospace"
    fontSize: "1.7rem"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-.025em"
  title:
    fontFamily: "\"Courier New\", Courier, monospace"
    fontSize: "1.3rem"
    fontWeight: 400
    lineHeight: 1.15
  body:
    fontFamily: "\"Courier New\", Courier, monospace"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  prose:
    fontFamily: "\"Courier New\", Courier, monospace"
    fontSize: ".95rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "\"Courier New\", Courier, monospace"
    fontSize: ".9rem"
    fontWeight: 700
    lineHeight: 1.4
  metadata:
    fontFamily: "\"Courier New\", Courier, monospace"
    fontSize: ".78rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  square: "0"
spacing:
  compact: "12px"
  field: "16px"
  reading: "20px"
  section-small: "24px"
  action: "30px"
  row: "36px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.green}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "12px 18px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.green}"
  search-field:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "12px 15px"
    width: "275px"
  copy-field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "16px"
    width: "100%"
  catalog-row:
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "36px 0"
  catalog-row-hover:
    backgroundColor: "{colors.panel}"
  count:
    textColor: "{colors.muted}"
    rounded: "{rounded.square}"
    padding: ".2rem .55rem"
  copy-status:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-primary}"
    padding: "14px 20px"
  copy-status-error:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
---

# Design System: skills.itops.dev

## Overview

**Creative North Star: "The itops.dev Terminal"**

The site extends the existing itops.dev terminal identity into a public skill directory. Black is the continuous canvas; vivid green identifies headings, links, primary actions, and the small cursor. Courier New gives navigation, controls, and long instructions one consistent voice.

The presentation is flat and text-led. Quiet green-tinted text and thin dividers support dense reading; the bright accent marks useful actions. The system uses the homepage identity specified in PRODUCT.md and the implementation in web/style.css, web/app.js, and src/render.mjs. This document records that implementation, not a new brand direction.

**Key Characteristics:**
- One monospaced family throughout.
- Black canvas with terminal-green action and heading accents.
- Square controls, thin dividers, and open directory rows.
- Responsive reading columns and explicit source metadata.
- One cursor animation, with a reduced-motion alternative.

## Colors

The palette retains the homepage's bright terminal green while adding quiet green-tinted reading surfaces and text. The frontmatter is the normative value list; names below map directly to its tokens.

### Primary

- **Terminal Green** (`green`): headings, links, filled primary actions, selection, caret, focus outline, and cursor.
- **Light Terminal Green** (`primary-hover`): the primary-action hover state and inline code in source prose.
- **Deep Action Ink** (`on-primary`): text on filled actions and copy feedback.

### Neutral

- **Black Canvas** (`bg`): the page and search field.
- **Reading Panel** (`panel`): copy fields, code blocks, and hovered directory rows.
- **Reading Ink** (`ink`): long text, secondary headline text, source values, and copy-error background.
- **Quiet Green** (`muted`): descriptions, helper text, dates, and technical metadata.
- **Divider Green** (`line`): single-pixel separators and secondary-control borders.
- **Interaction Green** (`hover`): secondary-button hover background.

**The Terminal Accent Rule.** Use terminal green for headings, links, actions, selection, and keyboard focus. Use the quieter ink and muted colors for sustained reading and supporting metadata.

## Typography

**Display Font:** Courier New, with Courier and monospace fallbacks.  
**Body Font:** The same stack.  
**Label/Mono Font:** The same stack; code inherits it.

The shared monospaced face is an inherited identity asset. Headings use regular weight and tighter tracking; buttons and step lead-ins use bold weight. There is no separate display font.

### Hierarchy

- **Display:** the catalog hero uses `display`; its second line switches to reading ink. The detail hero uses the smaller `detail-display` role.
- **Headline:** `headline` serves major page sections. Source prose adjusts headings for reading density.
- **Catalog title:** `catalog-title` leads each directory entry; green links underline on hover.
- **Title:** `title` serves install-option headings and other local headings.
- **Body:** `body` sets the page base; introductions and descriptions have local size adjustments.
- **Prose:** `prose` increases line height for source documents. The reading column is capped at 74ch, with paragraphs and list items capped at 72ch.
- **Label:** `label` serves action buttons; labels remain sentence case.
- **Metadata:** `metadata` supplies skill identifiers and compact source-type text, placed below the title and description.

At the mobile breakpoint the page base becomes 16px, directory titles become 1.45rem with a 1.25 line height, and detail titles become 2.25rem. The catalog display uses a separate fluid mobile clamp. These are responsive overrides, not additional font families.

**The Single Voice Rule.** Keep the Courier New stack across headings, body text, controls, and code. Distinguish hierarchy through size, weight, spacing, and color.

## Layout

Main content, header, and footer share a centered container: `min(1184px, calc(100% - 96px))`. At 1000px and below, side space becomes 28px; at 680px and below it becomes 20px. These are maximum-width media queries.

The desktop catalog hero pairs a title and introduction in a 1.3:1 grid, with a 4rem gap and generous vertical space. The directory is a divided list rather than a tile grid. Each row allocates a flexible text column and a 125px action column, with 36px vertical padding. Row action widths reduce to 100px at the intermediate breakpoint and 80px on mobile; the title, description, and metadata stay together.

Detail pages use a flexible reading column and a 230px source sidebar, separated by 70px. At the intermediate breakpoint, the sidebar becomes 200px and the gap becomes 35px. At the mobile breakpoint, the hero, introduction, detail layout, header, and footer stack; source metadata moves below the reading content. The directory heading and search also stack, while row actions retain their narrow right column.

Actions wrap in a flex row. Mobile hero actions and install buttons become full-width. Search expands to the available mobile width. Long identifiers and paragraphs wrap; tables keep horizontal scrolling, and code blocks wrap. The implementation mixes rem spacing with explicit pixel spacing; it does not define a single mathematical spacing scale.

## Elevation & Depth

The interface has no box shadows. Thin dividers, open space, panel fills, and hover fills establish separation. Only the catalog hero title carries a faint green text glow (`0 0 14px #00ff411c`). The copy-status message floats through fixed positioning and a filled surface, without a raised shadow.

**The Flat Reading Rule.** Separate content with spacing, thin lines, and green-tinted surfaces. Keep the faint catalog-heading glow out of long-form reading and controls.

## Shapes

Buttons and fields have square corners. Count badges and reading panels use the same rectilinear language, with one-pixel borders. Arrows are compact inline SVG strokes, not text glyph icons. The wordmark's terminal prompt and rectangular cursor belong to the inherited terminal identity.

The cursor measures .54em by 1.05em and blinks with a 1.25-second stepped animation. Reduced-motion preference disables the cursor animation and smooth scrolling. Controls use immediate color and border changes; no transition timing is defined for them.

## Components

### Buttons

Firm rectangular actions. Primary buttons use terminal green with deep action ink; secondary buttons are transparent with green text and a divider-green border. Both use the `label` type role, 12px by 18px padding, and a 48px minimum height. Primary hover uses light terminal green; secondary hover uses the interaction fill and a green border. Keyboard focus uses a two-pixel green outline offset by five pixels. During copying, the button is disabled with .65 opacity and a wait cursor, then restored.

### Inputs / Fields

Search is a black, single-line field with a divider border, green caret, and quiet placeholder. Its desktop width is 275px; the mobile field is full-width with a 48px minimum height. The associated label remains in the markup but is visually hidden below the intermediate breakpoint.

Copy fields use the reading-panel fill, full width, square border, and vertical resizing. Their text is read-only but selectable. The full source text can be opened through a native disclosure. Copy failure opens that disclosure when needed, focuses and selects the text, and gives an explicit manual-copy message.

### Navigation

The header combines the green wordmark, quiet domain suffix, one cursor, and plain text links. Navigation links gain an underline on hover and retain the shared focus outline. Mobile navigation spans the available width below the wordmark. Detail pages add a wrapping breadcrumb. The first keyboard link reveals a skip-to-content control.

### Directory Rows and Count

Rows are open, horizontally divided entries. The green title and description lead; skill identifier and source type sit below. Hover adds the reading-panel fill. The right-side open link has a 44px minimum target height. The count is a small square outlined label, not a filter or selectable chip.

Search filters rows immediately by title, name, and description. A polite live region announces the result count. An empty result offers a secondary reset button, which clears the query and returns focus to search.

### Reading Panels and Disclosures

Source prose uses restrained headings, green links, bordered code panels, a single green rule for blockquotes, and bordered tables. Native disclosures expose the full instruction and manual-copy text. Disclosure summaries have a 44px minimum height and the shared keyboard-focus treatment. There is no separate decorative card component.

### Copy Feedback

A fixed message appears near the lower center of the viewport after a copy attempt. Success uses the primary fill; failure uses reading ink as its background. A polite atomic live region announces the text. Feedback remains for eight seconds and resets after each attempt. The sidecar previews the appearance; the actual copy behavior lives in web/app.js.

## Do's and Don'ts

### Do:

- Do preserve the inherited black, green, Courier, square-control, and cursor identity.
- Do keep titles and descriptions ahead of technical metadata in directory rows.
- Do use visible keyboard focus, readable text contrast, and the existing reduced-motion treatment.
- Do keep source instructions readable and provide the manual-copy fallback when clipboard access fails.
- Do preserve the mobile stacking, full-width primary actions, and wrapping of long source identifiers.

### Don't:

- Don't introduce rounded cards, gradients, or raised box shadows into this flat terminal system.
- Don't extend the heading glow to paragraphs, metadata, or controls.
- Don't add more animated decoration around the single cursor motif.
- Don't treat the sidecar's illustrative tonal ramps as extra production colors.
