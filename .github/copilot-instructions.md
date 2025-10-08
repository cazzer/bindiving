# Bin Diving - AI Copilot Instructions

## Project Architecture

This is a Next.js 14 product recommendation app built on Netlify Platform, combining multiple AI services and web scraping. The app generates AI-powered product recommendations through a two-stage OpenAI integration:

1. **Chat Completion API** (`/netlify/functions/recommendations/`) - Direct product queries with structured JSON responses
2. **Assistants API** (`/netlify/functions/assistant/` + `/netlify/functions/read-thread/`) - Thread-based conversations for complex queries

## Key Components & Data Flow

### Frontend Architecture

- **Next.js App Router** in `/app/` with RSC patterns
- **Component library** in `/components/` using daisyUI + Tailwind
- **Product display**: `ProductCard` component handles both Amazon resolver images (carousel) and Brave resolver images (single)
- **Client state**: Uses `useState` for API request states, reCAPTCHA integration via `react-google-recaptcha-v3`

### Backend Services (Netlify Functions)

```
/netlify/functions/
├── recommendations/          # Direct OpenAI chat completions
├── assistant/               # OpenAI assistants thread creation
├── read-thread/            # Thread polling + product resolution
└── recommendations/
    ├── amazon-resolver.mts     # Primary product resolver (Amazon PAAPI)
    ├── brave-resolver.mts      # Fallback resolver (Brave Search API)
    ├── cheerio-resolver.mts    # Web scraping fallback
    └── perplexity-resolver.mts # Additional context (currently disabled)
```

### Product Resolution Pipeline

1. **Rate limiting**: Uses `Bottleneck` with `maxConcurrent: 2, minTime: 1000ms`
2. **Fallback chain**: Amazon PAAPI → Brave Search → Cheerio scraping
3. **Error handling**: Invalid products filtered out, graceful degradation with retry logic

## Development Workflow

### Local Development

```bash
# Use Netlify CLI for full functionality (edge functions, blob store)
netlify dev  # NOT npm run dev

# Link to deployed site for runtime parity
netlify link
```

### Environment Variables Required

- `OPEN_AI_KEY` - OpenAI API access
- `BRAVE_API_KEY` - Brave Search API
- `AMAZON_ACCESS_KEY_ID` / `AMAZON_SECRET_ACCESS_KEY` - Amazon PAAPI
- reCAPTCHA keys for bot protection

### Build & Deploy

- **Build command**: `npm run build` (defined in `netlify.toml`)
- **Runtime**: Requires Netlify Next Runtime v5
- **Static assets**: `/public/` with custom noise pattern background

## Code Patterns & Conventions

### API Response Structure

All Netlify functions return standardized responses:

```javascript
{ valid: boolean, message?: string, recommendations?: Product[] }
```

### Product Object Shape

```typescript
{
  product_name: string
  amazon_id: string
  pros: string[]
  cons: string[]
  sources: string[]
  price: string
  image_url?: string
  resolver: 'amazon' | 'brave' | 'cheerio'
}
```

### OpenAI Integration Patterns

- **Chat completions**: Use `response_format: { type: 'json_object' }` for structured output
- **Assistants**: Thread-based with polling for completion status
- **Organization/Project IDs**: Hardcoded in multiple files (search for `org-t125kCvFULIVCLilC1zVFW3r`)

### Error Handling Philosophy

- **User-facing errors**: Conversational, humorous tone (`"probably because too many people are bin diving right now"`)
- **Logging**: Console-based with structured error context
- **Graceful degradation**: Multiple resolver fallbacks, filter invalid products

## Styling & UI Patterns

### Theme Configuration

- **daisyUI theme**: `lofi` with custom primary colors (`#2bdcd2`)
- **Background**: Custom grid pattern with noise texture overlay
- **Responsive**: Mobile-first with `sm:` breakpoints

### Component Patterns

- **Cards**: daisyUI `card` with `md:card-side` responsive layout
- **Images**: `react-image` for fallbacks, `react-responsive-carousel` for Amazon product galleries
- **State indication**: `Digging` component for loading states

## Testing & Quality

### Available Scripts

- `npm run lint` - ESLint with Next.js config
- Tests are minimal - focus on manual testing with actual API integrations

When working on this codebase, prioritize understanding the product resolution pipeline and API rate limiting, as these are the most complex and failure-prone areas.
