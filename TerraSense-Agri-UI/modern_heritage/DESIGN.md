---
name: Modern Heritage
colors:
  surface: '#fff8f3'
  surface-dim: '#e5d8ca'
  surface-bright: '#fff8f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1e3'
  surface-container: '#f9ecde'
  surface-container-high: '#f3e6d8'
  surface-container-highest: '#eee0d2'
  on-surface: '#211b12'
  on-surface-variant: '#414845'
  inverse-surface: '#362f26'
  inverse-on-surface: '#fcefe0'
  outline: '#727974'
  outline-variant: '#c1c8c3'
  surface-tint: '#466558'
  primary: '#163429'
  on-primary: '#ffffff'
  primary-container: '#2d4b3f'
  on-primary-container: '#99baab'
  inverse-primary: '#adcebe'
  secondary: '#9e4223'
  on-secondary: '#ffffff'
  secondary-container: '#fe8c67'
  on-secondary-container: '#742407'
  tertiary: '#322f27'
  on-tertiary: '#ffffff'
  tertiary-container: '#48453c'
  on-tertiary-container: '#b8b2a7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c8eada'
  primary-fixed-dim: '#adcebe'
  on-primary-fixed: '#012016'
  on-primary-fixed-variant: '#2f4d41'
  secondary-fixed: '#ffdbd0'
  secondary-fixed-dim: '#ffb59e'
  on-secondary-fixed: '#3a0b00'
  on-secondary-fixed-variant: '#7e2b0e'
  tertiary-fixed: '#e8e2d6'
  tertiary-fixed-dim: '#ccc6ba'
  on-tertiary-fixed: '#1e1b14'
  on-tertiary-fixed-variant: '#4a463e'
  background: '#fff8f3'
  on-background: '#211b12'
  surface-variant: '#eee0d2'
  deep-moss: '#2D4B3F'
  burnt-terracotta: '#C35E3D'
  warm-parchment: '#F4EDE1'
  slate-soil: '#4A4238'
  sage-accent: '#8A9A5B'
  linen-light: '#FAF9F6'
  sunset-gold: '#E4A853'
typography:
  display-hero:
    fontFamily: DM Serif Display
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: DM Serif Display
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: DM Serif Display
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.3'
  stat-value:
    fontFamily: DM Serif Display
    fontSize: 28px
    fontWeight: '400'
    lineHeight: '1.1'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.08em
  button:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system embodies the **Modern Heritage** and **Earthy Precision** aesthetic, positioning itself as a high-end scientific tool for the modern agriculturalist. It strikes a sophisticated balance between traditional agrarian wisdom and cutting-edge data science. 

The visual style is **Corporate / Modern** with **Glassmorphism** influences. It utilizes a grounded, organic color palette to evoke trust and a connection to the land, while employing crisp, technical layouts to demonstrate precision. The interface should feel like a premium, physical instrument—reliable, tactile, and authoritative. Key characteristics include heavy whitespace, high-contrast serif typography for data, and semi-transparent layers that suggest depth without sacrificing clarity.

## Colors

The palette is rooted in the natural world, using deep, desaturated tones to create a professional and calm environment. 

- **Primary (Deep Moss):** Used for primary brand elements, navigation, and high-level structural accents. It represents growth and stability.
- **Secondary (Burnt Terracotta):** An earthy accent used for calls to action, critical indicators, and highlights. It draws the eye to essential data points.
- **Tertiary (Warm Parchment):** The foundation for surfaces and backgrounds, providing a softer, more sophisticated alternative to pure white.
- **Neutral (Slate Soil):** Used for primary text and subtle borders, ensuring high legibility while maintaining the organic theme.

Color is used functionally: **Sage** indicates healthy analysis counts, while **Sunset** is reserved for elevation and topographical data. Gradients transition from **Warm Parchment** to **Linen Light** to create soft, atmospheric depths in headers.

## Typography

This design system uses a high-contrast typographic pairing to reinforce the "Modern Heritage" theme. 

**DM Serif Display** is the "Heritage" element. It is used for hero headings, card titles, and critical data values. Its traditional, scholarly appearance lends an air of authority and permanence to the data.

**Plus Jakarta Sans** is the "Precision" element. It handles all UI controls, body text, and metadata. Its clean, geometric forms ensure maximum legibility on digital screens. 

Use **label-caps** for micro-copy and table headers to create a disciplined, technical feel. High-emphasis data points (like Hectares or Soil pH) should use **stat-value** to make the numbers feel like ornaments of the design.

## Layout & Spacing

The layout follows a strict **4px/8px rhythmic scale** to ensure mathematical precision. 

- **Grid Model:** A 12-column fluid grid for desktop with 24px gutters. Dashboard stats utilize a 4-column sub-grid (`repeat(4, 1fr)`). 
- **Desktop:** Generous 40px external margins to allow the "Modern Heritage" aesthetic to breathe.
- **Tablet:** Transitions to a 2-column layout for major cards, maintaining 24px padding.
- **Mobile:** Single-column reflow for cards and vertical stacking for banners. Margins reduce to 16px.

Internal component spacing (padding) should be generous: 22px for primary cards and 28px-32px for promotional banners. This creates a premium, spacious feel that avoids the "clutter" often associated with technical tools.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layers** and **Glassmorphism**.

1.  **Surfaces:** The base background is **Warm Parchment**. Content sits on **Linen Light** cards or semi-transparent **Glass Panels** (using backdrop-filter: blur(12px) and a low-opacity white tint).
2.  **Outlines:** Most elements are defined by 1px borders in **Slate Soil** (at 10-15% opacity) rather than shadows. 
3.  **Interaction:** Shadows are reserved for interaction. On hover, cards use a `var(--shadow-elevated)`—a soft, diffused ambient shadow tinted with **Deep Moss**—and a subtle `translateY(-3px)` movement to indicate "lift."
4.  **Accents:** Depth is also communicated through vertical/horizontal accent borders (e.g., 3px Moss Green top-border) which act as a "crown" for important containers.

## Shapes

The shape language is **Rounded**, balancing organic curves with technical structure. 

- **Primary Containers (Cards, Banners):** Use `rounded-lg` (16px) to feel friendly and modern.
- **Interactive Elements (Buttons, Inputs):** Use `rounded-md` (8px) for a more precise, functional look.
- **Data Accents (Icon boxes):** Use `rounded-sm` (4px) to maintain a sharp, scientific appearance for small UI elements.

**Botanical Sketch Borders:** On premium card components, borders should not be perfectly uniform. Incorporate subtle "sketch" details—such as slightly overlapping corners or a variable stroke weight—to mimic high-end botanical field notes.

## Components

- **Buttons:** Primary buttons use **Deep Moss** with white text and `rounded-md`. Secondary buttons use **Warm Parchment** with a 1px **Slate Soil** border.
- **Glass Cards:** Use a semi-transparent background with a 1px border. For agricultural data, add a 4px colored accent border on the left or top (e.g., **Sage** for growth data, **Terracotta** for alerts).
- **Inputs:** Clean, 1px bordered boxes using **Plus Jakarta Sans**. Focus states should switch the border to **Deep Moss** with a soft outer glow.
- **Chips/Badges:** Small, pill-shaped elements with low-saturation backgrounds derived from the brand palette (e.g., a very light Sage background for "Active" status).
- **Data Visualization:** High-contrast charts using the full accent palette (**Terracotta, Sage, Sunset**). Grid lines in charts should be very faint **Slate Soil** to maintain a clean, scientific look.
- **Lists:** Recent activity items use **Linen Light** surfaces with `14px 16px` padding and clear vertical dividers.
- **Icons:** Use Phosphor Icons in "Light" or "Duotone" weights. Icon backgrounds should be circular or `rounded-sm` using the **Linen** color.