# Autonomous Property Manager — Design System

## Purpose of This File

This is the single source of truth for all visual and interaction design decisions.
The agent must read this file before implementing any UI component, page, or layout.

**Do not deviate from these guidelines without explicit instruction.**
The design follows the Purity UI Dashboard template — clean, modern, with a teal accent.

---

## Design Direction

**Aesthetic:** Purity UI Dashboard — Clean, modern SaaS with teal accent color.
Inspired by the Purity UI design system — rounded cards with shadows, teal gradients
on active elements and icons, light/dark mode support with proper contrast.

**Both light and dark mode are supported.** Light mode uses a light gray background
with white cards. Dark mode uses navy backgrounds with dark gray cards.
Users can toggle manually via the sidebar switch.

**Key visual characteristics:**
- Teal (#4FD1C5) as primary/accent color
- Large rounded corners (rounded-2xl for cards)
- Shadow-xl on cards for depth
- Gradient backgrounds on icons and active states (`purity-gradient`)
- Clean typography with gray (#A0AEC0) for labels

---

## 1. Colour System

### Design Token Philosophy
All colours are defined as CSS custom properties in `globals.css`.
The primary color is teal (#4FD1C5) throughout the application.

### Core Colors

```css
/* Primary - Teal (Purity UI signature color) */
--primary: #4FD1C5;
--primary-hover: #38B2AC;
--primary-active: #319795;

/* Gradient */
--gradient-start: #4FD1C5;
--gradient-end: #38B2AC;

/* Light Mode Neutrals */
--background: #F8F9FA;        /* Light gray page background */
--foreground: #2D3748;        /* Dark gray text */
--card: #FFFFFF;              /* White cards */
--muted: #EDF2F7;             /* Muted backgrounds */
--muted-foreground: #A0AEC0;  /* Gray labels and secondary text */

/* Dark Mode Neutrals */
--background: #1A202C;        /* Navy page background */
--foreground: #E2E8F0;        /* Light text */
--card: #2D3748;              /* Dark gray cards */
--muted: #4A5568;             /* Muted backgrounds */
--muted-foreground: #A0AEC0;  /* Gray labels */

/* Borders */
--border: #E2E8F0;            /* Light mode */
--border: #4A5568;            /* Dark mode */

/* Status Colors */
--success: #48BB78;           /* Green */
--warning: #ED8936;           /* Orange */
--destructive: #E53E3E;       /* Red */
--info: #4299E1;              /* Blue */
```

### Purity Gradient Class

```css
.purity-gradient {
  background: linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%);
}
```

Use `.purity-gradient` for:
- Active navigation items in sidebar
- Icon backgrounds in stat cards
- Decorative elements
- User avatar backgrounds

### Status Color Mapping

| Status | Color | Background |
|---|---|---|
| `received` | `#4299E1` (info) | `#BEE3F8` |
| `triaging` | `#ED8936` (warning) | `#FEEBC8` |
| `pending_approval` | `#ED8936` (warning) | `#FEEBC8` |
| `approved` | `#48BB78` (success) | `#C6F6D5` |
| `booked` | `#4FD1C5` (primary) | `#E6FFFA` |
| `resolved` | `#A0AEC0` (muted) | `#EDF2F7` |
| `rejected` | `#E53E3E` (danger) | `#FED7D7` |

---

## 2. Typography

### Font Choice

**Primary Font:** `Helvetica Neue` / System sans-serif
**Monospace:** `Geist Mono` for data, IDs, timestamps

### Type Scale

| Element | Size | Weight | Color |
|---|---|---|---|
| Page title | `text-2xl` | `font-bold` | `#2D3748` / `white` |
| Section heading | `text-lg` | `font-bold` | `#2D3748` / `#E2E8F0` |
| Card title | `text-lg` | `font-bold` | `#2D3748` / `#E2E8F0` |
| Label (uppercase) | `text-xs` | `font-bold uppercase tracking-wide` | `#A0AEC0` |
| Body text | `text-sm` | normal | `#2D3748` / `#E2E8F0` |
| Muted text | `text-sm` | normal | `#A0AEC0` |
| Stat number | `text-2xl` | `font-bold` | `#2D3748` / `white` |
| Change indicator | `text-xs` | `font-bold` | `#48BB78` (up) / `#E53E3E` (down) |

---

## 3. Layout System

### Sidebar

- **Width:** 280px fixed
- **Light mode:** White background (`bg-white`)
- **Dark mode:** Navy background (`bg-[#1A202C]`)
- **Navigation items:** `rounded-2xl px-4 py-3`
- **Active state:** `purity-gradient text-white shadow-lg`
- **Inactive state:** `text-[#A0AEC0] hover:bg-[#F7FAFC]` (light) / `hover:bg-[#2D3748]` (dark)

### Page Structure

```tsx
<div className="min-h-screen bg-background">
  <Sidebar />                              {/* Fixed 280px sidebar */}
  <div className="lg:ml-[280px]">
    <Header />                             {/* Top bar, same bg as sidebar */}
    <main className="min-h-[calc(100vh-80px)] p-6">
      {/* Page content */}
    </main>
  </div>
</div>
```

### Header

- **Height:** 80px (`h-20`)
- **Background:** Same as sidebar (`bg-white` / `bg-[#1A202C]`)
- Contains search input and notification bell

---

## 4. Component Rules

### Cards

```tsx
<Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
  <CardContent className="p-6">
    {/* Content */}
  </CardContent>
</Card>
```

Key properties:
- `rounded-2xl` — Large border radius
- `border-0` — No border (shadow provides separation)
- `shadow-xl` — Strong shadow for depth
- `dark:bg-[#2D3748]` — Dark gray in dark mode

### Stat Cards

```tsx
<Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
          {title}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-bold text-[#2D3748] dark:text-white">
            {value}
          </p>
          <span className="flex items-center text-xs font-bold text-[#48BB78]">
            <TrendingUp className="mr-0.5 h-3 w-3" />
            +12%
          </span>
        </div>
      </div>
      <div className="purity-gradient flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </CardContent>
</Card>
```

### Navigation Items

```tsx
// Active
<Link className="purity-gradient flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30">

// Inactive
<Link className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#A0AEC0] hover:bg-[#F7FAFC] dark:hover:bg-[#2D3748]">
```

### Theme Toggle (Switch Style)

```tsx
<div className="flex items-center justify-between rounded-2xl bg-[#F7FAFC] p-3 dark:bg-[#2D3748]">
  <div className="flex items-center gap-3">
    {isDark ? <Moon className="h-5 w-5 text-[#4FD1C5]" /> : <Sun className="h-5 w-5 text-[#ED8936]" />}
    <span className="text-sm font-semibold">{isDark ? 'Dark' : 'Light'} Mode</span>
  </div>
  <button className={`relative h-7 w-14 rounded-full ${isDark ? 'bg-[#4FD1C5]' : 'bg-[#E2E8F0]'}`}>
    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md ${isDark ? 'left-8' : 'left-1'}`} />
  </button>
</div>
```

### Tables

```tsx
<Table>
  <TableHeader>
    <TableRow className="border-b border-[#E2E8F0] dark:border-[#4A5568]">
      <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
        Column
      </TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="border-b border-[#E2E8F0] dark:border-[#4A5568]">
      <TableCell className="text-sm text-[#A0AEC0]">
        Value
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Badges

```tsx
<Badge className="rounded-lg px-3 py-1 text-xs font-bold bg-success/10 text-success">
  approved
</Badge>
```

### Charts (Recharts)

```tsx
// Area Chart
<AreaChart data={data}>
  <defs>
    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#4FD1C5" stopOpacity={0.4} />
      <stop offset="95%" stopColor="#4FD1C5" stopOpacity={0} />
    </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
  <XAxis tick={{ fill: '#A0AEC0', fontSize: 12 }} />
  <Area stroke="#4FD1C5" strokeWidth={3} fill="url(#colorValue)" />
</AreaChart>

// Bar Chart
<BarChart data={data}>
  <Bar fill="#4FD1C5" radius={[8, 8, 0, 0]} barSize={20} />
</BarChart>
```

---

## 5. Motion & Animation

**Philosophy:** Subtle and purposeful. No decorative animations.

| Situation | Animation | Duration |
|---|---|---|
| Page transition | Fade in | 200ms |
| Card enter | Fade in + slide up | 300ms |
| Button hover | Background transition | 150ms |
| Toggle switch | Transform | 300ms |

```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 6. Do's & Don'ts

### ✅ Always Do

- Use `purity-gradient` for active states and icon backgrounds
- Use `rounded-2xl` for cards, `rounded-xl` for icons
- Use `shadow-xl` on cards (no border needed)
- Use `#A0AEC0` for labels and muted text
- Use `#2D3748` for headings in light mode, `white` in dark mode
- Implement both light and dark mode
- Match header background to sidebar background

### ❌ Never Do

- No borders on cards (shadows provide depth)
- No small border-radius (use `rounded-2xl` or `rounded-xl`)
- No blue as primary (use teal `#4FD1C5`)
- No always-dark sidebar (follows theme)
- No icon-only toggle buttons (use switch style)
- No hardcoded colors in components

---

## 7. Quick Reference

```
Primary Color:    Teal #4FD1C5
Gradient:         linear-gradient(135deg, #4FD1C5, #38B2AC)
Background:       #F8F9FA (light) / #1A202C (dark)
Card:             #FFFFFF (light) / #2D3748 (dark)
Text:             #2D3748 (light) / #E2E8F0 (dark)
Muted:            #A0AEC0
Border:           #E2E8F0 (light) / #4A5568 (dark)

Sidebar:          280px, white/navy, purity-gradient active
Cards:            rounded-2xl, shadow-xl, no border
Icons:            purity-gradient background, rounded-xl
Toggle:           Switch style with visible mode label
Charts:           Recharts, teal fill, gray grid
```