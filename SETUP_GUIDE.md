# Simple Setup Guide

## What You Have

1. **Neon** = Your database (like a filing cabinet for data)
2. **Drizzle** = Tool that helps your code talk to the database
3. **Manual SQL** = You write SQL commands yourself (what your boyfriend suggested)

## The Simple Answer

✅ **Your boyfriend is RIGHT** - manual SQL works perfectly fine!

You can use manual SQL with Neon + Drizzle. Here's how:

## Step-by-Step Setup

### Step 1: Get Your Database Connection String

1. Go to https://console.neon.tech/
2. Sign in
3. Create a project (or use existing one)
4. Copy the connection string (looks like: `postgresql://user:password@host/dbname`)

### Step 2: Add Connection String to Your Project

1. Create a file called `.env.local` in your project root
2. Add these required environment variables:
   ```
   DATABASE_URL=your_connection_string_here
   BETTER_AUTH_SECRET=your-secret-key-here
   BETTER_AUTH_URL=http://localhost:3000
   ```
3. Replace `your_connection_string_here` with the string from Neon
4. Generate a secret key for `BETTER_AUTH_SECRET` (you can use: `openssl rand -base64 32`)
5. Set `BETTER_AUTH_URL` to your application URL (use `http://localhost:3000` for local development)

**PDF summarisation (AI provider)** (add ONE of these):
```
# Option A: Anthropic (default)
ANTHROPIC_API_KEY=your_anthropic_key_here

# Option B: Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_key_here
PDF_SUMMARISER_PROVIDER=google
# Optional (defaults to gemini-3-flash-preview when provider=google)
PDF_SUMMARISER_MODEL=gemini-3-flash-preview
```

**PDF uploads (Vercel Blob)**:
1. In your Vercel dashboard, open your project → **Storage** → **Blob** (create a Blob store if you don’t have one yet).
2. Create a **Read/Write token**.
3. Add it to `.env.local`:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

**Optional OAuth Providers** (add these if you want Google/GitHub sign-in):
```
BETTER_AUTH_GOOGLE_CLIENT_ID=your-google-client-id
BETTER_AUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
BETTER_AUTH_GITHUB_CLIENT_ID=your-github-client-id
BETTER_AUTH_GITHUB_CLIENT_SECRET=your-github-client-secret
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

### Step 3: Create Tables in Neon (Manual SQL)

1. Go to Neon console → SQL Editor
2. Open `schema.sql` file in your project
3. Copy ALL the SQL code
4. Paste it into Neon's SQL Editor
5. Click "Run" or press Ctrl+Enter

**That's it!** Your tables are now created.

**Note:** The `schema.sql` file includes Better-Auth tables (`users`, `sessions`, `accounts`, `verification_tokens`) needed for authentication.

### Step 4: Test It Works

Your code in `app/actions.ts` will now work because:
- Tables exist ✅
- Connection string is set ✅
- Code is ready ✅

## What Each File Does

- `schema.sql` = SQL commands to create tables (run this in Neon)
- `app/lib/db/schema.ts` = TypeScript definitions (helps your code understand the tables)
- `app/actions.ts` = Your functions that save/load data

## Important Notes

- ✅ Manual SQL is SAFE and STABLE
- ✅ You control exactly what happens
- ✅ No automatic migrations = no surprises
- ✅ Works perfectly with Neon + Drizzle

## Authentication Setup

The project uses Better-Auth for authentication. After setting up the database:

1. **Sign Up**: Visit `/login` to create a new account
2. **Sign In**: Use your email and password to sign in
3. **OAuth** (optional): Configure Google/GitHub OAuth credentials in `.env.local` if you want social sign-in

The authentication system is configured in `app/lib/auth.ts` and handles:
- Email/password authentication
- Session management
- OAuth providers (Google, GitHub) - if configured

## If Something Breaks

1. Check `.env.local` has all required variables:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL`
2. Check tables exist in Neon (look in Neon console)
3. Check you ran the SQL from `schema.sql`
4. Verify Better-Auth tables (`users`, `sessions`, `accounts`, `verification_tokens`) exist

That's it! You're good to go.

