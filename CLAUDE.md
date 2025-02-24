# AACD Dashboard Development Guide

## Build Commands
- `npm run dev` - Start development server (with turbopack)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma migrate dev` - Run database migrations
- `npx prisma generate` - Generate Prisma client

## Code Style Guidelines
- **TypeScript**: Use strict type checking with interfaces/types for all data
- **Imports**: Organize imports by external, then internal, then relative paths
- **Components**: Server components by default, client components when needed
- **State Management**: URL parameters for shareable state; minimal client-side state
- **Data Fetching**: Server components for data operations with Prisma queries
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Error Handling**: Type-safe error objects with consistent structure
- **Styling**: TailwindCSS with consistent spacing and responsive design
- **Component Design**: Follow "props down, events up" pattern with type-safe interfaces
- **Tables**: Use appropriate table pattern (static vs server) based on complexity

## Project Patterns
- URL-based state management for filters (date_range, min_amount, max_amount)
- Server-side rendering with minimal client JavaScript
- React Server Components with strategic client components
- Follow established report filter patterns for consistency