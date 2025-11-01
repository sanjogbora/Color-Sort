# HueSort Design System

## Typography

### Fonts
- **Body Text**: Plus Jakarta Sans (sans-serif)
  - Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)
  - Used for: All body text, buttons, labels, descriptions
  
- **Headings**: Caudex (serif)
  - Weights: 400 (regular), 700 (bold)
  - Used for: App title, section headings, major labels

### Usage
```tsx
// Body text (default)
<p className="text-sm">Regular body text</p>

// Headings
<h1 className="text-xl font-bold font-serif">HueSort</h1>
<h2 className="text-2xl font-semibold font-serif">Section Title</h2>
```

## Logo & Branding

### Logo Design
- **Shape**: Equilateral triangle pointing upward
- **Colors**: 
  - Left half: Pink (#ec4899)
  - Right half: Yellow (#fbbf24)
- **Border**: Dark slate (#1e293b) with 1.5px stroke
- **Symbolism**: 
  - Triangle represents sorting/organization
  - Pink to Yellow gradient represents the color spectrum
  - Split design shows the transition between hues

### Logo Sizes
- **App Header**: 40x40px
- **Favicon**: 64x64px

### Logo Component
```tsx
import { AppLogo } from './components/Icons';

<AppLogo className="w-10 h-10" />
```

## Color Palette

### Brand Colors
- **Pink**: #ec4899 (left half of logo)
- **Yellow**: #fbbf24 (right half of logo)

### UI Colors
- **Background**: Slate-900 (#0f172a)
- **Surface**: Slate-800 (#1e293b)
- **Border**: Slate-700 (#334155)
- **Text Primary**: White (#ffffff)
- **Text Secondary**: Slate-300 (#cbd5e1)
- **Text Muted**: Slate-400 (#94a3b8)
- **Accent**: Sky-500 (#0ea5e9)

## Implementation

### Google Fonts Import
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Caudex:wght@400;700&display=swap" rel="stylesheet">
```

### Tailwind Config
```javascript
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['Caudex', 'serif'],
      }
    }
  }
}
```

## Files
- **Logo Component**: `components/Icons.tsx` (AppLogo)
- **Favicon**: `public/favicon.svg`
- **Font Configuration**: `index.html`

## Design Principles
1. **Clarity**: Plus Jakarta Sans provides excellent readability
2. **Elegance**: Caudex serif adds sophistication to headings
3. **Brand Identity**: Pink-yellow triangle is memorable and represents color sorting
4. **Consistency**: All typography follows the two-font system
