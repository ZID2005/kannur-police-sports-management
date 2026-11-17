---
name: Kannur Police Sports Portal
colors:
  surface: '#f8f9ff'
  surface-dim: '#d8dadf'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3f9'
  surface-container: '#eceef3'
  surface-container-high: '#e6e8ee'
  surface-container-highest: '#e1e2e8'
  on-surface: '#191c20'
  on-surface-variant: '#424655'
  inverse-surface: '#2e3135'
  inverse-on-surface: '#eff0f6'
  outline: '#727787'
  outline-variant: '#c2c6d8'
  surface-tint: '#0056d2'
  primary: '#0053cd'
  on-primary: '#ffffff'
  primary-container: '#166bfb'
  on-primary-container: '#fefcff'
  inverse-primary: '#b2c5ff'
  secondary: '#476080'
  on-secondary: '#ffffff'
  secondary-container: '#bfd9ff'
  on-secondary-container: '#465f7f'
  tertiary: '#4f5d6e'
  on-tertiary: '#ffffff'
  tertiary-container: '#677687'
  on-tertiary-container: '#fdfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a1'
  secondary-fixed: '#d2e4ff'
  secondary-fixed-dim: '#afc8ee'
  on-secondary-fixed: '#001c38'
  on-secondary-fixed-variant: '#2f4867'
  tertiary-fixed: '#d5e4f8'
  tertiary-fixed-dim: '#b9c8db'
  on-tertiary-fixed: '#0e1d2b'
  on-tertiary-fixed-variant: '#3a4858'
  background: '#f8f9ff'
  on-background: '#191c20'
  surface-variant: '#e1e2e8'
typography:
  title-portal:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  title-portal-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-card:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  body-default:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-medium:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  label-primary:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-meta:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 1.5rem
  gutter-desktop: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a civic yet ultra-modern portal for Kannur City Police officers, personnel, and authorized citizens registering for and booking departmental athletic facilities. The aesthetic merges public sector discipline with the frictionless tranquility of next-generation consumer software.

The visual direction embraces an ultra-minimal "liquid glass" philosophy inspired by high-end ambient interfaces:
- **Atmospheric Calm:** Expansive, serene canvas with airy negative space and soft cool-spectrum atmospheric glows.
- **Translucent Materiality:** Multi-layered frosted glass plates (`backdrop-filter: blur(40px)`) that float weightlessly, featuring micro-fine refractive highlights and ethereal diffuse tint shadows.
- **Precision Typography & Structure:** Hyper-legible typography paired with generously proportioned, organic rounded containers that make departmental interactions feel welcoming, transparent, and effortlessly premium.

## Colors

The palette relies entirely on pristine cool whites, atmospheric ice-blues, and a single high-clarity departmental cobalt blue accent.

- **Canvas & Gradients:** Base background is `#F7F9FC`, overlaid with dual ambient light emitters:
  - Top-Right Radial: `radial-gradient(circle at 85% 15%, #BFD9FF 0%, rgba(191, 217, 255, 0) 55%)`
  - Bottom-Left Radial: `radial-gradient(circle at 15% 85%, #DCEBFF 0%, rgba(220, 235, 255, 0) 50%)`
- **Glass Surfaces:**
  - Standard Plate: `rgba(255, 255, 255, 0.55)`
  - Elevated/Active Plate: `rgba(255, 255, 255, 0.75)`
  - Muted Inset Well: `rgba(255, 255, 255, 0.35)`
- **Borders & Specular Highlights:**
  - Perimeter Rim: `1px solid rgba(255, 255, 255, 0.70)`
  - Top Specular Inset: `inset 0 1px 1px 0 rgba(255, 255, 255, 0.90)`
- **Typography & Icons:**
  - Primary Text: `#111418` (high-contrast off-black)
  - Secondary / Supporting Text: `#6B7280`
  - Subtle / Placeholder: `#9CA3AF`
- **Functional Semantics:**
  - Interactive / Accent: `#1F6FFF`
  - Focus Ring: `rgba(31, 111, 255, 0.35)` with a solid `#1F6FFF` boundary
  - Error / Validation: `#E5484D`
  - Success: `#30A46C`

## Typography

The type hierarchy prioritizes clarity, systematic structure, and optical balance across device widths. The font stack prioritizes Apple system typography (`-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text"`) with `Inter` serving as the fully aligned web fallback.

- **Title Portal:** Used for hero sign-in and welcome headers. Employs tight negative tracking (-0.03em) to establish authoritative presence without feeling heavy.
- **Headline Card:** Sized at 20px / 600 weight for interior registration step headers and card modular sections.
- **Form Body (17px):** All interactive input content and primary body copy resides at 17px to prevent iOS auto-zoom behavior and provide uncompromised readability.
- **Labels & Metas (13px–15px):** Input labels, secondary status notes, and badge copy maintain medium weight to retain contrast against translucent layers.

## Layout & Spacing

The portal uses a fluid, centered single-column or dual-column layout rhythm structured on an 8px/24px base matrix:
- **Card Framing:** The primary registration vessel has a maximum width of `480px` for authentication workflows and `640px` for detailed sports facility registration questionnaires.
- **Desktop Margins & Paddings:** Main cards utilize `40px` (`2.5rem`) internal padding on screens `≥ 768px`, ensuring substantial breathing room around fields and status graphics.
- **Mobile Responsive Shifts:** On screens `< 768px`, card interior padding scales down to `24px` (`1.5rem`), while canvas margins maintain `16px`–`24px` screen separation.
- **Vertical Spacing Rhythm:**
  - Distance between headline groups and input fields: `32px` (`2rem`).
  - Gap between consecutive form fields: `20px` to `24px`.
  - Spacing preceding primary button triggers: `32px`.

## Elevation & Depth

Visual depth avoids opaque elevation models in favor of optical refraction, internal reflections, and ambient blue-tinted drop shadows:

- **Level 1 (Subordinate Insets / Input Trays):**
  - Background: `rgba(255, 255, 255, 0.40)`
  - Backdrop Blur: `20px`
  - Border: `1px solid rgba(255, 255, 255, 0.50)`
  - Shadow: `none` or `inset 0 1px 2px rgba(17, 20, 24, 0.03)`
- **Level 2 (Liquid Glass Main Card):**
  - Background: `rgba(255, 255, 255, 0.55)`
  - Backdrop Blur: `40px`
  - Border: `1px solid rgba(255, 255, 255, 0.70)`
  - Shadows: `0 20px 40px rgba(31, 111, 255, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.90)`
- **Level 3 (Modals / Floating Confirmation Flyouts):**
  - Background: `rgba(255, 255, 255, 0.75)`
  - Backdrop Blur: `50px`
  - Border: `1px solid rgba(255, 255, 255, 0.85)`
  - Shadows: `0 30px 60px rgba(31, 111, 255, 0.12), 0 4px 12px rgba(17, 20, 24, 0.04), inset 0 1px 1px 0 #FFFFFF`

## Shapes

The design system implements a soft, continuous-curve squircle aesthetic tailored to glass optics:
- **Cards & Modal Containers:** Fixed corner radius of `32px` (`rounded-xl` customization) to match modern glass sheet beveling.
- **Input Fields & Text Areas:** Fixed corner radius of `20px`.
- **Interactive Action Buttons:** Fixed corner radius of `22px`.
- **Chips, Category Tags & State Pills:** Fully circular capsule radius of `9999px`.
- **Interactive Control Knobs (Checkboxes/Radios):** `10px` for square checks; full circle (`9999px`) for radios.

## Components

### Buttons
- **Primary Button:**
  - Height: `56px`. Full width inside registration cards or fixed auto-width with `space-xl` lateral padding.
  - Background: Solid `#1F6FFF`.
  - Border Radius: `22px`.
  - Typography: `17px`, weight `600`, color `#FFFFFF`.
  - Shadow: `0 8px 24px rgba(31, 111, 255, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.25)`.
  - Hover / Active: Translates up -1px, shadow deepens to `0 12px 28px rgba(31, 111, 255, 0.35)`. Active scale: `0.985`.
- **Secondary / Glass Button:**
  - Height: `56px`.
  - Background: `rgba(255, 255, 255, 0.60)`.
  - Border: `1px solid rgba(255, 255, 255, 0.80)`.
  - Typography: `17px`, weight `600`, color `#111418`.

### Input Fields & Selectors
- **Height & Dimensions:** Exact `56px` height.
- **Surfaces:** Filled with `rgba(255, 255, 255, 0.50)` over the blurred background, framed by `1px solid rgba(255, 255, 255, 0.65)`.
- **Typography:** `17px` entry text in `#111418`; placeholder styled in `#9CA3AF`.
- **Padding:** Lateral padding of `20px`.
- **Focus State:** Border changes to `#1F6FFF`, backed by an outer glow `0 0 0 4px rgba(31, 111, 255, 0.15)`. Background brightens to `rgba(255, 255, 255, 0.85)`.
- **Error State:** Border shifts to `#E5484D`, focus ring becomes `rgba(229, 72, 77, 0.15)`. Micro-copy appears below in `13px`, `#E5484D`.

### Checkboxes & Radio Buttons
- **Dimensions:** `22px × 22px`.
- **Default State:** `rgba(255, 255, 255, 0.60)` fill with `1.5px solid rgba(17, 20, 24, 0.20)`. Checkbox has `8px` radius; radio is circular.
- **Selected State:** `#1F6FFF` fill with white indicator icon (check glyph or center dot).
- **Alignment:** Vertically centered with label text styled at `15px` (`label-primary`).

### Chips & Facility Badges
- **Height:** `36px` to `40px`.
- **Border Radius:** `9999px` (pill shape).
- **Treatment:** Semi-translucent glass chip (`rgba(255, 255, 255, 0.50)`), `1px solid rgba(255, 255, 255, 0.60)`.
- **Active Selection (e.g., Badminton, Swimming, Track):** Background transforms to `#1F6FFF`, text shifts to pure `#FFFFFF`, accompanied by an ambient `0 6px 16px rgba(31, 111, 255, 0.20)` shadow.

### Cards & Field Containers
- **Main Glass Card:** Radius `32px`, `rgba(255, 255, 255, 0.55)` base, `backdrop-filter: blur(40px)`, `1px solid rgba(255, 255, 255, 0.70)`, diffuse blue ambient shadow `0 20px 40px rgba(31, 111, 255, 0.08)`.
- **Internal Section Grouping:** Inner cards (e.g., terms agreement, facility time slots) utilize `16px`–`20px` radius and lighter glass wells (`rgba(255, 255, 255, 0.35)`).

### Police Badge / Official Insignia Lockup
- Header lockup presents the Kannur City Police crest centered above the glass plate with a soft ambient underglow (`rgba(31, 111, 255, 0.12)`), establishing official authority while preserving interface lightness.