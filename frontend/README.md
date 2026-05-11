# Spiro Rwanda Digital Platform - Frontend

A comprehensive web portal for managing electric mobility operations in Rwanda, featuring multi-role authentication and dedicated interfaces for Riders, Station Operators, Technicians, and Administrators.

## Features

### Public Portal
- Landing page with company information
- About Us, Services, and Contact pages
- Multi-role login system
- Responsive design with Spiro branding

### Rider Portal (8 Pages)
- Dashboard with quick stats and actions
- Station finder with real-time availability
- Battery swap request system
- Swap history tracking
- Payment and wallet management
- Subscription plan management
- Profile settings
- Support ticket system

### Station Operator Portal (7 Pages)
- Operational dashboard
- Battery inventory management
- Swap processing interface
- Reservation management
- Maintenance request system
- Station analytics
- Profile management

### Technician Portal (5 Pages)
- Task dashboard
- Maintenance task management
- Battery diagnostics tools
- Work history log
- Profile settings

### Admin Portal (7 Pages)
- System-wide dashboard
- User management (CRUD)
- Station network management
- Battery fleet oversight
- Financial reports
- Comprehensive analytics
- System configuration

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix UI primitives)
- **Routing**: React Router v6
- **State Management**: 
  - React Context (Auth)
  - TanStack Query (Server state)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Color Scheme

Based on Spiro brand identity:
- **Primary Blue**: `#3D4C9F` - Main brand color
- **Accent Yellow**: `#FFE500` - Highlights and CTAs
- **Success Green**: `#10B981` - Positive actions
- **Warning Orange**: `#F59E0B` - Alerts
- **Error Red**: `#EF4444` - Errors

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn UI components
│   │   ├── layout/          # Layout components (Navbar, Footer, Dashboard)
│   │   ├── rider/           # Rider-specific components
│   │   ├── operator/        # Operator-specific components
│   │   ├── technician/      # Technician-specific components
│   │   └── admin/           # Admin-specific components
│   ├── pages/
│   │   ├── public/          # Public pages (Landing, Login, About, etc.)
│   │   ├── rider/           # Rider portal pages
│   │   ├── operator/        # Operator portal pages
│   │   ├── technician/      # Technician portal pages
│   │   └── admin/           # Admin portal pages
│   ├── contexts/            # React contexts (Auth, Theme)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities (API client, helpers)
│   ├── services/            # API service functions
│   ├── types/               # TypeScript type definitions
│   ├── App.tsx              # Main app component with routing
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── .env                     # Environment variables
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Backend API running on `http://localhost:5000`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env to set VITE_API_URL if different from default
```

3. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## API Integration

The frontend connects to the backend API through the configured `VITE_API_URL`. All API calls include:
- Automatic JWT token injection
- Request/response interceptors
- Error handling with automatic logout on 401
- Retry logic for failed requests

### Authentication Flow

1. User logs in with email, password, and role selection
2. Backend returns JWT token and user object
3. Token stored in localStorage
4. Token included in all subsequent API requests
5. Automatic redirect to role-specific dashboard

### Role-Based Routing

Protected routes automatically verify:
- User is authenticated
- User has required role permissions
- Redirects to login if not authenticated
- Redirects to unauthorized page if wrong role

## Responsive Design

The application is fully responsive with breakpoints:
- Mobile: 320px+
- Tablet: 768px+
- Desktop: 1024px+
- Large Desktop: 1440px+

### Mobile Optimizations
- Collapsible navigation
- Touch-friendly buttons (44x44px minimum)
- Optimized tables (card view on mobile)
- Fast loading on 3G networks

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader compatible
- Focus indicators on all interactive elements
- Semantic HTML5
- ARIA labels where needed
- Reduced motion support

## Development Guidelines

### Adding New Pages

1. Create page component in appropriate portal folder
2. Add route in `App.tsx`
3. Update navigation in `DashboardLayout.tsx` if needed
4. Follow existing patterns for consistency

### Component Guidelines

- Use Shadcn UI components for consistency
- Follow Tailwind utility-first approach
- Keep components small and focused
- Use TypeScript for type safety
- Export named components

### Styling Guidelines

- Use Tailwind classes, avoid custom CSS
- Follow spacing scale (4px base unit)
- Use design tokens from tailwind.config.js
- Maintain color consistency with brand
- Ensure responsive design

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] Real-time WebSocket integration for live updates
- [ ] Map integration (Leaflet/Mapbox) for station finder
- [ ] Chart visualizations (Recharts) for analytics
- [ ] Kinyarwanda language support (i18next)
- [ ] Progressive Web App (PWA) capabilities
- [ ] Offline mode with service workers
- [ ] Push notifications
- [ ] Advanced filtering and search
- [ ] Export functionality (PDF/CSV)
- [ ] Dark mode support

## Contributing

1. Follow the existing code style
2. Write meaningful commit messages
3. Test on multiple screen sizes
4. Ensure accessibility compliance
5. Update documentation as needed

## License

Copyright © 2026 Spiro Rwanda. All rights reserved.
