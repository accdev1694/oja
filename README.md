# Oja

> Budget-First Shopping Confidence - A mobile-first PWA that gives shoppers control over their spending before, during, and after shopping trips.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

Open [http://localhost:3009](http://localhost:3009) to view the app.

## Tech Stack

| Layer      | Technology                                 |
| ---------- | ------------------------------------------ |
| Framework  | Next.js 16 (App Router)                    |
| Platform   | Progressive Web App (PWA)                  |
| Language   | TypeScript (strict mode)                   |
| Styling    | Tailwind CSS                               |
| State      | Zustand (client) + TanStack Query (server) |
| Animations | Framer Motion                              |
| Icons      | Phosphor Icons                             |
| Backend    | Supabase (Postgres + Auth + Realtime)      |
| PWA        | Serwist (Service Worker)                   |
| OCR        | Tesseract.js                               |
| AI         | Google Gemini 1.5 Flash                    |
| Payments   | Stripe                                     |

## Development

### Prerequisites

- Node.js 20+
- npm 10+
- Git

### Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required values:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `STRIPE_SECRET_KEY` - Your Stripe secret key
   - `GEMINI_API_KEY` - Your Google Gemini API key

See `.env.example` for all available variables and documentation.

### Available Scripts

```bash
# Development
npm run dev              # Start dev server on port 3009
npm run build            # Production build
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run type-check       # Run TypeScript type checking

# Testing
npm test                 # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run E2E tests with UI mode
```

### Code Quality

This project uses:

- **ESLint** - Linting with Next.js recommended rules
- **Prettier** - Code formatting
- **TypeScript** - Strict type checking
- **Husky** - Git hooks for pre-commit linting

Pre-commit hooks automatically run lint-staged to lint and format staged files.

### Project Structure

```
oja/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   └── health/        # Health check endpoint
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   └── ui/                # Design system components
│   ├── lib/
│   │   ├── db/                # Dexie.js offline database
│   │   ├── query/             # TanStack Query setup
│   │   ├── stores/            # Zustand stores
│   │   └── supabase/          # Supabase clients
│   └── types/                 # TypeScript type definitions
├── tests/
│   └── e2e/                   # Playwright E2E tests
├── public/                    # Static assets
└── _bmad-output/              # BMAD development artifacts
```

## Testing

### Unit Tests (Jest)

Unit tests are located next to the code they test (`*.test.ts` or `__tests__/`).

```bash
npm test                  # Run all tests
npm run test:coverage     # Generate coverage report
```

### E2E Tests (Playwright)

E2E tests are in `tests/e2e/`.

```bash
npm run test:e2e          # Run headless
npm run test:e2e:ui       # Run with UI for debugging
```

## CI/CD

### GitHub Actions

The CI pipeline (`.github/workflows/ci.yml`) runs on every PR and push to main:

1. **Smoke Stage** - Linting, type checking, format check
2. **Unit Tests** - Jest with coverage
3. **Build** - Production build verification
4. **E2E Tests** - Playwright tests (4 parallel shards)
5. **Quality Gates** - Security audit, code duplication check

### Vercel Deployment

- **Preview**: Automatic deployments for PRs
- **Production**: Automatic deployment on merge to main

## API Endpoints

### Health Check

```
GET /api/health
```

Returns service health status:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-25T10:00:00.000Z",
  "version": "0.1.0",
  "environment": "development",
  "services": {
    "database": "unknown",
    "cache": "unknown"
  }
}
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass: `npm test && npm run test:e2e`
4. Ensure code quality: `npm run lint && npm run type-check`
5. Submit a PR

## Troubleshooting

### Common Issues

**ESLint errors on relative imports**

Use the `@/` alias for imports:

```typescript
// Bad
import { Button } from '../components/ui/Button';

// Good
import { Button } from '@/components/ui/Button';
```

**Type errors after adding new files**

Run `npm run type-check` to verify TypeScript configuration.

**Husky hooks not running**

Ensure Git hooks are installed:

```bash
npm run prepare
```

**E2E tests failing locally**

Install Playwright browsers:

```bash
npx playwright install
```

## License

Private - All rights reserved.
