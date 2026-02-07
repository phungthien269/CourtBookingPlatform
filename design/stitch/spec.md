# Design System Specification

Extracted from Stitch Project ID: `16588612912665674172`

## Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#0ddff2` | Primary actions, links, active states |
| `--color-primary-hover` | `#0bc5d6` | Hover state for primary |
| `--color-primary-light` | `#e0f7fa` | Backgrounds, badges |
| `--color-bg-light` | `#f8fafc` | Page background (light theme) |
| `--color-bg-dark` | `#0f172a` | Page background (admin dark theme) |
| `--color-surface` | `#ffffff` | Card backgrounds |
| `--color-surface-dark` | `#1e293b` | Card backgrounds (dark) |
| `--color-text` | `#0f172a` | Primary text (light) |
| `--color-text-dark` | `#f8fafc` | Primary text (dark) |
| `--color-text-muted` | `#64748b` | Secondary text |
| `--color-success` | `#22c55e` | Confirmed, active states |
| `--color-warning` | `#f59e0b` | Pending, attention |
| `--color-error` | `#ef4444` | Cancelled, errors |
| `--color-border` | `#e2e8f0` | Borders (light) |
| `--color-border-dark` | `#334155` | Borders (dark) |

## Typography

| Token | Value |
|-------|-------|
| `--font-heading` | `'Lexend', sans-serif` |
| `--font-body` | `'Public Sans', sans-serif` |

### Scale

| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| `text-xs` | 12px | 16px | Badges, labels |
| `text-sm` | 14px | 20px | Secondary text |
| `text-base` | 16px | 24px | Body text |
| `text-lg` | 18px | 28px | Subheadings |
| `text-xl` | 20px | 28px | Card titles |
| `text-2xl` | 24px | 32px | Page subtitles |
| `text-3xl` | 30px | 36px | Page titles |
| `text-4xl` | 36px | 40px | Hero headings |

## Spacing

Base unit: 4px

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small elements |
| `--radius-md` | 8px | Default (buttons, inputs, cards) |
| `--radius-lg` | 12px | Modals, large cards |
| `--radius-xl` | 16px | Hero sections |
| `--radius-full` | 9999px | Avatars, badges |

## Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` |

## Component Patterns

### Buttons
- Primary: `bg-primary text-white rounded-md px-4 py-2`
- Secondary: `bg-white border border-gray-300 text-gray-700 rounded-md px-4 py-2`
- Ghost: `text-primary hover:bg-primary-light rounded-md px-4 py-2`

### Cards
- Light: `bg-white rounded-lg shadow-md p-6`
- Dark: `bg-surface-dark rounded-lg shadow-md p-6`

### Inputs
- Default: `border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-primary`

### Badges
- Success: `bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full`
- Warning: `bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full`
- Error: `bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full`

## Navigation

### Public Layout
- Floating navbar with logo left, nav links center, auth buttons right
- Footer with hotline/support contact

### User Layout
- Top navbar with logo, Home, My Bookings, profile dropdown
- No sidebar

### Manager Layout
- Left sidebar (collapsible) with: Dashboard, Quản lý sân, Lịch hoạt động, Thống kê, Gia hạn, Tin nhắn
- Top bar with venue name, notifications, profile

### Admin Layout (Dark Theme)
- Left sidebar with: Dashboard, Quản lý Manager, Duyệt sân, Quản lý User, Nhật ký, Cấu hình
- Top bar with admin name, notifications
