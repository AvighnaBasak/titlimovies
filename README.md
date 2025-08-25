# TitliMovies

A modern, responsive streaming platform built with Next.js and Tailwind CSS that provides access to movies, TV shows, and anime content with multiple streaming servers and advanced search capabilities.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Development](#development)
- [Build & Deployment](#build--deployment)
- [API Integration](#api-integration)
- [Component Documentation](#component-documentation)
- [Styling Guidelines](#styling-guidelines)
- [Performance Optimizations](#performance-optimizations)
- [Browser Support](#browser-support)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Functionality
- **Multi-content Support**: Stream movies, TV shows, and anime
- **Universal Search**: Intelligent search with real-time suggestions
- **Multiple Streaming Servers**: 3 backup servers for reliability
- **Episode Management**: Season and episode selection for TV shows and anime
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Modern UI**: Glass morphism effects with smooth animations

### Content Discovery
- **Trending Content**: Weekly trending movies, TV shows, and anime
- **Latest Releases**: Recently added content across all categories
- **Coming Soon**: Upcoming releases and new content
- **Similar Content**: AI-powered content recommendations
- **Advanced Filtering**: Category-based content browsing

### User Experience
- **Fast Loading**: Optimized API caching and skeleton loading states
- **Popup Blocking**: Secure iframe implementation with sandbox protection
- **Cross-platform**: Works seamlessly across all devices
- **Accessibility**: WCAG compliant design patterns
- **SEO Optimized**: Server-side rendering with proper meta tags

## Tech Stack

### Frontend
- **Framework**: Next.js 15.5.0 (React 19.1.0)
- **Styling**: Tailwind CSS 4.x with custom design system
- **Fonts**: Inter font family via next/font
- **Icons**: SVG-based icon system
- **State Management**: React Hooks (useState, useEffect)

### Backend & APIs
- **Proxy Server**: Custom Next.js API routes for CORS handling
- **Movie/TV Data**: 2embed.cc API integration
- **Anime Data**: AnimeAPI.skin integration
- **Caching**: Edge caching with stale-while-revalidate strategy

### Development Tools
- **Linting**: ESLint with Next.js configuration
- **Build System**: Turbopack for fast development and builds
- **Package Manager**: npm
- **Version Control**: Git with conventional commits

## Project Structure

```
titlimovies/
├── components/                 # Reusable UI components
│   ├── Footer.js              # Site footer with links
│   ├── MediaCard.js           # Media item display card
│   ├── MediaDetail.js         # Detailed media information
│   ├── MediaGrid.js           # Grid layout for media items
│   ├── Navbar.js              # Navigation header
│   ├── Player.js              # Video player with server selection
│   ├── SearchBar.js           # Universal search component
│   ├── SimilarMedia.js        # Related content recommendations
│   └── ToggleSwitch.js        # Animated category toggle
├── pages/                     # Next.js pages and routing
│   ├── api/                   # API routes
│   │   └── proxy.js           # CORS proxy for external APIs
│   ├── anime/                 # Anime-specific pages
│   │   └── [title].js         # Dynamic anime detail page
│   ├── movie/                 # Movie-specific pages
│   │   └── [id].js            # Dynamic movie detail page
│   ├── search/                # Search functionality
│   │   └── [query].js         # Search results page
│   ├── tv/                    # TV show pages
│   │   └── [id].js            # Dynamic TV show detail page
│   ├── _app.js                # App wrapper with global styles
│   └── index.js               # Homepage with trending content
├── public/                    # Static assets
│   ├── favicon.ico            # Site favicon
│   └── *.svg                  # Icon assets
├── styles/                    # Global styles and CSS
│   └── globals.css            # Tailwind imports and custom CSS
├── eslint.config.mjs          # ESLint configuration
├── next.config.ts             # Next.js configuration
├── package.json               # Dependencies and scripts
├── postcss.config.js          # PostCSS configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

## Installation

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)

### Setup Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/titlimovies.git
   cd titlimovies
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Install Additional Dependencies** (if needed)
   ```bash
   npm install -D tailwindcss@^3.4.0 postcss@^8.4.0 autoprefixer@^10.4.0
   ```

4. **Verify Installation**
   ```bash
   npm run lint
   ```

## Environment Setup

### Development Environment
Create a `.env.local` file in the root directory:

```env
# Development Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API Configuration
NEXT_PUBLIC_API_CACHE_TIME=300
NEXT_PUBLIC_ENABLE_ANALYTICS=false

# Feature Flags
NEXT_PUBLIC_ENABLE_SERVER_SWITCHING=true
NEXT_PUBLIC_MAX_SEARCH_RESULTS=8
```

### Production Environment
```env
# Production Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Performance Settings
NEXT_PUBLIC_API_CACHE_TIME=600
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Security Settings
NEXT_PUBLIC_IFRAME_SANDBOX=true
NEXT_PUBLIC_REFERRER_POLICY=no-referrer
```

## Development

### Available Scripts

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking (if using TypeScript)
npm run type-check
```

### Development Server
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Hot Reloading
The development server supports:
- Hot module replacement for React components
- CSS hot reloading for Tailwind styles
- API route hot reloading for backend changes

## Build & Deployment

### Production Build
```bash
npm run build
npm start
```

### Deployment Platforms

#### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=.next
```

#### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## API Integration

### External APIs Used

#### 2embed.cc API
- **Movies**: `https://api.2embed.cc/movie?imdb_id={id}`
- **TV Shows**: `https://api.2embed.cc/tv?imdb_id={id}`
- **Trending**: `https://api.2embed.cc/trending?time_window=week&page=1`
- **Search**: `https://api.2embed.cc/search?q={query}&page=1`
- **Similar Content**: `https://api.2embed.cc/similar?imdb_id={id}&page=1`

#### AnimeAPI.skin
- **Trending**: `https://animeapi.skin/trending`
- **Latest**: `https://animeapi.skin/new?page={number}`
- **Search**: `https://animeapi.skin/search?q={query}&page={number}`
- **Episodes**: `https://animeapi.skin/episodes?title={title}`

### Proxy Implementation
All API calls go through `/api/proxy` to handle:
- CORS headers
- Rate limiting
- Error handling
- Response caching
- Request optimization

### Streaming Sources

#### Movies & TV Shows
1. **2embed.cc**: Primary streaming source
2. **VidSrc.to**: Alternative reliable source
3. **MultiEmbed.mov**: Backup streaming option

#### Anime
1. **2anime.xyz**: Primary anime streaming
2. **GogoAnime**: Alternative anime source
3. **AniWatch**: Backup anime streaming

## Component Documentation

### Core Components

#### Navbar
```jsx
<Navbar />
```
- Responsive navigation header
- Logo with home link
- Left-aligned branding

#### SearchBar
```jsx
<SearchBar hideTypeSelector={boolean} />
```
- Universal search with suggestions
- Type selector (movies/TV/anime)
- Real-time search suggestions
- Mobile-responsive design

#### MediaCard
```jsx
<MediaCard item={object} type={string} />
```
- Displays media poster and information
- Hover animations and effects
- Responsive grid layout
- Link to detail pages

#### Player
```jsx
<Player 
  imdb_id={string}
  tmdb_id={string}
  type={string}
  season={number}
  episode={number}
  title={string}
  number={number}
/>
```
- Multi-server video player
- Popup blocking with sandbox
- Responsive iframe container
- Server switching functionality

#### ToggleSwitch
```jsx
<ToggleSwitch 
  value={string}
  onChange={function}
  options={array}
/>
```
- Animated sliding toggle
- Smooth transitions
- Multiple option support
- Active state indicators

### Utility Components

#### MediaGrid
- Responsive grid layout
- Loading skeleton states
- Empty state handling
- Optimized for mobile

#### MediaDetail
- Comprehensive media information
- Poster and metadata display
- Genre and cast information
- Release and production details

#### SimilarMedia
- Related content recommendations
- API-driven suggestions
- Grid layout integration
- Type-specific filtering

#### Footer
- Site-wide footer component
- Navigation links
- Legal information
- Social media links

## Styling Guidelines

### Design System

#### Colors
```css
/* Primary Colors */
--gray-950: #030712;
--gray-900: #111827;
--gray-800: #1f2937;

/* Accent Colors */
--blue-600: #2563eb;
--purple-600: #9333ea;
--blue-400: #60a5fa;
--purple-400: #c084fc;

/* Text Colors */
--text-white: #ffffff;
--text-gray-300: #d1d5db;
--text-gray-400: #9ca3af;
```

#### Typography
```css
/* Font Family */
font-family: 'Inter', sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
```

#### Border Radius
```css
--rounded-lg: 0.5rem;
--rounded-xl: 0.75rem;
--rounded-2xl: 1rem;
--rounded-3xl: 1.5rem;
```

#### Shadows
```css
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

### Responsive Breakpoints
```css
/* Mobile First Approach */
sm: 640px   /* Small devices (landscape phones) */
md: 768px   /* Medium devices (tablets) */
lg: 1024px  /* Large devices (laptops) */
xl: 1280px  /* Extra large devices (desktops) */
2xl: 1536px /* 2X large devices (large desktops) */
```

### Animation Guidelines
- Use `transition-all` for smooth state changes
- Duration: 150ms-300ms for micro-interactions
- Easing: `ease-out` for natural movement
- Transform: `scale-105` for hover effects
- Opacity transitions for loading states

## Performance Optimizations

### Image Optimization
- Lazy loading with `loading="lazy"`
- Responsive image sources
- WebP format support
- Fallback image handling

### API Optimization
- Response caching with `stale-while-revalidate`
- Request deduplication
- Parallel API calls for multiple sections
- Error boundary implementation

### Bundle Optimization
- Code splitting by route
- Dynamic imports for heavy components
- Tree shaking for unused code
- CSS purging in production

### Loading Performance
- Skeleton loading states
- Progressive image loading
- Preload critical resources
- Service worker caching

## Browser Support

### Supported Browsers
- Chrome 90+ (Primary target)
- Firefox 88+
- Safari 14+
- Edge 90+
- Opera 76+

### Mobile Support
- iOS Safari 14+
- Chrome Mobile 90+
- Samsung Internet 14+
- Firefox Mobile 88+

### Feature Support
- CSS Grid and Flexbox
- CSS Custom Properties
- ES2020+ JavaScript features
- Web APIs (Fetch, Intersection Observer)
- Modern CSS (backdrop-filter, CSS gradients)

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards
- Use functional components with hooks
- Follow ESLint configuration
- Write descriptive commit messages
- Add comments for complex logic
- Test on multiple devices/browsers

### Pull Request Guidelines
- Provide clear description of changes
- Include screenshots for UI changes
- Update documentation if needed
- Ensure all checks pass
- Request review from maintainers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-party Licenses
- Next.js: MIT License
- React: MIT License
- Tailwind CSS: MIT License
- External APIs: Respective terms of service apply

## Support

### Getting Help
- Check existing issues before creating new ones
- Provide detailed reproduction steps
- Include browser and system information
- Use appropriate issue templates

### Contact
- GitHub Issues: [Create an issue](https://github.com/yourusername/titlimovies/issues)
- Email: support@titlimovies.com
- Documentation: [Wiki](https://github.com/yourusername/titlimovies/wiki)

---

**Note**: This project is for educational purposes. Ensure compliance with content licensing and terms of service of integrated APIs when deploying to production.
