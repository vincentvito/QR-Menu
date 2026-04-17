QRmenucrafter — Design Spec
Color Palette (default: Pistachio × Persimmon)
Role Hex Usage
Ink #1A1E17 Primary text, primary buttons, phone bezel, footer bg
Paper #F6F2E7 Page background (warm cream)
Paper-2 #EFE8D4 Alt section bg (slightly darker cream)
Pistachio #C8E06A Primary accent — hero blob, highlights, tags, QR bg
Pistachio-deep #9DB84A Pistachio hover/shadow
Persimmon #E8552B Secondary accent — underline squiggle, price chips, CTAs
Persimmon-deep #C43E18 Persimmon hover
Cream-line #D9CFB4 Hairline borders, dividers
Muted #6B6B5E Secondary text
Alt palettes (if you want variants)
Plum × Honey: Ink #1F1424, Paper #F4EFE3, accent #B591D6, secondary #E8A84A
Espresso × Amber: Ink #2A1F17, Paper #F1E8D4, accent #D4A55A, secondary #7A4A2A
Typography
Stack (Google Fonts):

<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
Body / UI / Display: 'DM Sans', ui-sans-serif, system-ui, sans-serif
Italic accent words only (e.g. "table", "scan"): 'Instrument Serif', serif — set font-style: italic
Scale
Element	Size	Weight	Line-height	Letter-spacing
H1 hero	clamp(44px, 6.2vw, 86px)	600	1.02	-0.02em
H2 section	clamp(36px, 4.4vw, 60px)	600	1.05	-0.02em
H3 card title	22–26px	600	1.2	-0.01em
Eyebrow / kicker	12px	500	1	0.14em uppercase
Body	15–17px	400	1.55	0
Small / meta	13px	500	1.4	0
Button	15px	500	1	-0.005em
Spacing & Radii
Spacing scale (8pt base): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px

Section rhythm
Section vertical padding: 96px top & bottom (desktop), 64px mobile
Section horizontal padding: clamp(20px, 5vw, 80px)
Max content width: 1240px, centered
Gap between section title and content: 48px
Gap between cards in a grid: 24px
Component padding
Card: 28px (small) / 36px (large)
Button: 14px 24px (pill) — see below
Phone inner padding: 20px
Input: 14px 18px
Radii
Pill buttons: 999px
Cards: 24px
Large hero card / phone: 36px
Small tag/chip: 8px
Circular step number: 999px (48×48)
Buttons
Primary (dark)
background: #1A1E17;
color: #F6F2E7;
padding: 14px 26px;
border-radius: 999px;
font-weight: 500;
font-size: 15px;
box-shadow: 0 2px 0 #0a0c08;
transition: transform 120ms ease, box-shadow 120ms ease;
Hover: transform: translateY(-1px); box-shadow: 0 4px 0 #0a0c08;

Secondary (pistachio)
Same shape, background: #C8E06A; color: #1A1E17; box-shadow: 0 2px 0 #9DB84A;

Ghost
background: transparent; color: #1A1E17; border: 1.5px solid #1A1E17; (no shadow)

Gap between stacked buttons: 12px. Icon-in-button gap: 8px.

Other system details
Shadows: only soft + offset. 0 10px 30px -12px rgba(26,30,23,0.18) for cards. Pill buttons use the 2px offset-shadow trick above, not blur.
Borders: 1px solid #D9CFB4 for hairlines (card outlines, dividers). Never pure black borders.
Squiggle underline under the accent word in H1: hand-drawn SVG path in Persimmon, 4px stroke, stroke-linecap: round.
Organic blobs: behind hero + footer CTA, SVG paths filled with Pistachio at opacity: 1, sized ~600–800px, positioned absolute behind content with z-index: -1.
Kicker format: › SECTION NAME — uppercase, 12px, 0.14em tracking, muted color, with a › glyph prefix.
