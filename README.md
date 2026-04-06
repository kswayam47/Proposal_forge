# Proposal Automation System

A Next.js application for creating, managing, and exporting professional business proposals.

## Features

- Create and manage proposal templates
- AI-powered proposal content generation (in proposal forms)
- Multi-stage proposal workflow
- Export proposals to Word documents
- Share proposals via secure links
- Drag-and-drop task management
- Custom deliverable and task categories

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI / shadcn/ui
- **Rich Text Editor**: TipTap

---

## Deployment Guide

### Prerequisites

- Node.js 18+ or Bun
- A Supabase project
- A Google Gemini API key

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.[PROJECT-ID]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres

# AI Configuration
GEMINI_API_KEY=your-gemini-api-key
```

### Database Setup

Run the following SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  proposal_type TEXT NOT NULL,
  industry TEXT,
  tone TEXT DEFAULT 'professional',
  content JSONB,
  sections JSONB,
  variables JSONB,
  tags TEXT[],
  status TEXT DEFAULT 'draft',
  is_permanent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id),
  title TEXT NOT NULL,
  client_name TEXT,
  client_contact TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  project_name TEXT,
  project_type TEXT,
  start_date DATE,
  end_date DATE,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft',
  current_stage INTEGER DEFAULT 1,
  content JSONB,
  tasks JSONB,
  deliverables JSONB,
  team_members JSONB,
  pricing JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposal shares table
CREATE TABLE IF NOT EXISTS proposal_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task categories table
CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliverable categories table
CREATE TABLE IF NOT EXISTS deliverable_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```
3. Create and configure your `.env` file
4. Run the development server:
   ```bash
   npm run dev
   # or
   bun dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm run start
```

### Deploy to Vercel

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Go to [Vercel](https://vercel.com) and import your project
3. Add your environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
4. Deploy

### Deploy to Other Platforms

#### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t proposal-automation .
docker run -p 3000:3000 --env-file .env proposal-automation
```

#### Railway / Render / Fly.io

These platforms auto-detect Next.js projects. Simply:
1. Connect your Git repository
2. Add environment variables
3. Deploy

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/templates` | GET, POST | List/create templates |
| `/api/templates?id=` | PUT, DELETE | Update/delete template |
| `/api/proposals` | GET, POST | List/create proposals |
| `/api/proposals?id=` | PUT, DELETE | Update/delete proposal |
| `/api/proposal-ai` | POST | Generate AI content for proposals |
| `/api/export-word` | POST | Export proposal to Word document |
| `/api/proposal-shares` | GET, POST | Manage proposal sharing |
| `/api/task-categories` | GET, POST, DELETE | Manage task categories |
| `/api/deliverable-categories` | GET, POST, DELETE | Manage deliverable categories |

---

## Configuration Notes

### Supabase Storage (Optional)

If you want to upload images, create a storage bucket:

1. Go to Supabase Dashboard > Storage
2. Create a new bucket called `proposal-images`
3. Set the bucket to public or configure RLS policies

### Gemini API

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Troubleshooting

### Build Errors

- Ensure all environment variables are set
- Run `npm run lint` to check for code issues
- Run `npx tsc --noEmit` to check TypeScript errors

### Database Connection Issues

- Verify your `DATABASE_URL` uses the session pooler connection string
- Check that your Supabase project is active

### AI Features Not Working

- Verify `GEMINI_API_KEY` is set correctly
- Check API quota limits in Google AI Studio

---

## License

MIT
