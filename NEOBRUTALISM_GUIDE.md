# EcoTrack NeoBrutalism Design System

## Overview
EcoTrack now features a complete NeoBrutalism UI design system that emphasizes vibrant colors, thick borders (4px), strong shadows (8px), and a raw digital aesthetic inspired by modern neobrutalist design principles.

## Key Design Principles

### 1. **Vibrant Color Palette**
- **Primary Brand Color**: Lime green (#BFFF00) for CTAs, accents, and brand elements
- **Category Colors**: Distinct colors for each travel category (teal, olive, coral, mustard)
- **Dark Background**: Charcoal gray (#2D2D2D) for contrast
- **High Contrast**: Pure black (#000000) borders and shadows on bright backgrounds
- **No Gradients**: Flat, solid colors only

### 2. **Typography**
- **Headings**: All caps, bold, wide letter spacing
- **Body Text**: Monospace font (JetBrains Mono) for technical feel
- **Hierarchy**: Size and weight create clear information hierarchy

### 3. **Layout Elements**
- **Thick Borders**: 4px pure black borders on all interactive elements
- **Brutal Shadows**: 8px offset shadows in pure black (#000000)
- **Sharp Corners**: No rounded corners (except where functionally necessary)
- **Grid-based**: Clean, structured layouts
- **Visual Hierarchy**: Bold colors and size create clear information structure

### 4. **Interactive Elements**
- **Hover Effects**: Elements translate and shadow changes
- **Button States**: Clear visual feedback with shadow animations
- **Focus States**: Bold, obvious focus indicators

## Component Library

### Colors
```css
/* Core Colors */
--neo-black: #000000
--neo-dark-bg: #2D2D2D
--neo-white: #FFFFFF

/* Primary Brand Colors */
--neo-lime: #BFFF00        /* Primary vibrant green for CTAs and accents */

/* Category Colors (from design) */
--neo-teal: #00BCD4         /* Low Carbon category */
--neo-olive: #697B42        /* Public Transport category */
--neo-forest: #3D7D5C       /* Alternative green category */
--neo-coral: #FF6B4A        /* Bike Friendly category */
--neo-mustard: #E5A82D      /* Walkable Cities category */

/* Additional Accent Colors */
--neo-cyan: #00E5FF
--neo-red: #FF3D3D
--neo-blue: #4A90E2
--neo-orange: #FF8C42
--neo-purple: #A855F7
--neo-gray: #6B7280

/* Eco-Brutal Variants */
--eco-brutal-primary: #BFFF00      /* Lime green */
--eco-brutal-secondary: #E5A82D    /* Mustard */
--eco-brutal-accent: #00BCD4       /* Teal */
--eco-brutal-dark: #2D2D2D
--eco-brutal-darker: #1A1A1A
```

### CSS Classes

#### Buttons
- `.btn-brutal` - Base button styling with 4px borders and 8px shadows
- `.btn-primary` - Lime green primary button (vibrant brand color)
- `.btn-secondary` - Mustard yellow secondary button
- `.btn-accent` - Teal accent button
- `.btn-danger` - Red danger button

#### Cards
- `.card-brutal` - Basic white card with black border and shadow
- `.card-green` - Lime green themed card
- `.card-yellow` - Mustard yellow themed card
- `.card-teal` - Teal themed card
- `.card-olive` - Olive green themed card (public transport)
- `.card-coral` - Coral themed card (bike friendly)
- `.card-cyan` - Cyan themed card
- `.card-blue` - Blue themed card

#### Typography
- `.heading-brutal` - Bold, uppercase headings
- `.text-brutal` - Monospace, bold text

#### Status Indicators
- `.status-success` - Green success message
- `.status-warning` - Yellow warning message
- `.status-error` - Red error message
- `.status-info` - Cyan info message

#### Inputs
- `.input-brutal` - Form inputs with brutal styling

#### Animations
- `.hover-glitch` - Glitch effect on hover
- `.bounce-brutal` - Bouncing animation

## Pages Updated

### 1. **Home Page** (`app/page.tsx`)
- NeoBrutalism header with glitch effects
- Colorful service status warnings
- Bold typography and layout

### 2. **Dashboard** (`app/dashboard/page.tsx`)
- Colorful stat cards
- Bold welcome message
- NeoBrutalism action cards

### 3. **Profile Page** (`app/profile/page.tsx`)
- Brutal form styling
- Colorful section cards
- Enhanced input fields

### 4. **Design System Page** (`app/design-system/page.tsx`)
- Complete component showcase
- Color palette display
- Interactive examples

## Components Updated

### 1. **Header** (`components/Header.tsx`)
- Black background with colorful navigation
- Brutal logo design
- Enhanced user section

### 2. **TripPlanner** (`components/TripPlanner.tsx`)
- Brutal form styling
- Colorful input labels
- Enhanced submit button

### 3. **RouteResults** (`components/RouteResults.tsx`)
- Colorful loading states
- Brutal status messages
- Enhanced layout sections

### 4. **RouteCard** (`components/RouteCard.tsx`)
- Colorful stat cards
- Brutal typography
- Enhanced hover effects

### 5. **Button & Card Components**
- Updated base styling
- NeoBrutalism design patterns
- Consistent interaction states

## Accessibility Considerations

- **High Contrast**: Black text on bright backgrounds ensures readability
- **Clear Focus States**: Bold focus indicators for keyboard navigation
- **Consistent Patterns**: Predictable interaction patterns
- **Semantic HTML**: Proper heading hierarchy and form labels

## Performance Features

- **CSS-only Animations**: No JavaScript animations for better performance
- **Minimal Dependencies**: Uses Tailwind CSS utility classes
- **Optimized Fonts**: Google Fonts with display=swap

## Usage Examples

### Creating a New Brutal Card
```jsx
<div className="card-green">
  <h2 className="heading-brutal text-2xl mb-4">CARD TITLE</h2>
  <p className="text-brutal">Card content with brutal styling</p>
</div>
```

### Adding a Brutal Button
```jsx
<button className="btn-primary">
  CLICK ME
</button>
```

### Status Messages
```jsx
<div className="status-success">
  SUCCESS MESSAGE
</div>
```

## Browser Support

- **Modern Browsers**: Full support for CSS Grid, Flexbox, and custom properties
- **Fallbacks**: Graceful degradation for older browsers
- **Mobile Responsive**: Works on all screen sizes

## Future Enhancements

1. **Dark Mode**: Alternative color scheme with neon colors on dark backgrounds
2. **More Animations**: Additional glitch and brutal animation effects
3. **Component Variants**: More color combinations and sizes
4. **Accessibility Improvements**: Enhanced screen reader support

Visit `/design-system` to see all components in action!