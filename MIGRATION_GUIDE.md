# Migration Guide: LocalStorage to Postgres Database

This guide explains how to migrate from LocalStorage to a Postgres database using Neon and Drizzle ORM.

## Prerequisites

1. **Neon Database Account**: Sign up at https://neon.tech/
2. **Node.js**: Version 18 or higher
3. **npm**: For package management

## Installation

Install the required dependencies:

```bash
npm install drizzle-orm @neondatabase/serverless drizzle-kit
```

## Database Setup

1. **Create a Neon Database**:
   - Go to https://console.neon.tech/
   - Create a new project
   - Copy your connection string

2. **Set Environment Variable**:
   - Create a `.env.local` file in the project root
   - Add your Neon connection string:
     ```
     DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
     ```

## Database Migration

**IMPORTANT**: This project uses manual SQL migrations. Run the SQL from `schema.sql` directly in your Neon console.

1. **Open Neon Console**:
   - Go to https://console.neon.tech/
   - Select your project
   - Open the SQL Editor

2. **Run the Schema SQL**:
   - Copy the entire contents of `schema.sql`
   - Paste into the SQL Editor
   - Execute the SQL

   This will create all necessary tables including:
   - `users`, `sessions`, `accounts` (Better-Auth tables)
   - `graph_states` (Canvas state)
   - `abyssal_garden_states` (Abyssal Garden state)
   - `pdf_summaries` (PDF summaries)
   - `highlights` (PDF highlights and manual snippets/notes)
   - `bookshelves` (Snippet categories)

3. **Verify Tables Created**:
   - Check that all tables exist in your database
   - Ensure indexes are created properly

3. **View Database** (Optional):
   ```bash
   npm run db:studio
   ```
   This opens Drizzle Studio to view and edit your database.

## Architecture Changes

### Session Management

The app now uses cookie-based session management:
- Each user gets a unique session ID stored in cookies
- Session IDs are used to identify users in the database
- Sessions persist for 1 year

### API Routes

New API routes handle database operations:

- **`/api/graph`**: 
  - `GET`: Load graph state
  - `POST`: Save graph state
  - `DELETE`: Clear graph state

- **`/api/abyssal-garden`**:
  - `GET`: Load abyssal garden state
  - `PUT`: Update specific fields (swallowedCount, currency, inventory, etc.)

### State Management

- **Graph State**: Stored in `graph_states` table
- **Abyssal Garden State**: Stored in `abyssal_garden_states` table

Both tables use composite primary keys (`id` + `userId`) to ensure each user has their own state.

### Client-Side Changes

- `storage.ts`: Now uses async API calls instead of LocalStorage
- `abyssalGarden.ts`: Uses a state cache that syncs with the database
- `abyssalGardenState.ts`: New module managing abyssal garden state cache

## Data Migration

If you have existing LocalStorage data, you can migrate it:

1. Export your LocalStorage data (use browser DevTools)
2. Create a migration script to import the data into the database
3. The app will automatically load from the database on first use

## Troubleshooting

### Database Connection Issues

- Verify your `DATABASE_URL` is correct
- Check that your Neon database is active
- Ensure SSL mode is set correctly (`?sslmode=require`)

### Migration Errors

- Make sure you've run `npm run db:generate` first
- Check that your database schema matches the code
- Use `npm run db:push` to sync schema without migrations

### Session Issues

- Clear browser cookies if sessions aren't working
- Check that cookies are enabled in your browser
- Verify the session cookie is being set (check browser DevTools)

## Development

During development, you can:

- Use `npm run db:studio` to view/edit database directly
- Check API routes in `app/api/` for database operations
- View database schema in `app/lib/db/schema.ts`

## Production Deployment

1. Set `DATABASE_URL` in your production environment
2. Run migrations: `npm run db:push`
3. Ensure cookies work with your domain (check CORS settings)
4. Consider enabling `httpOnly` cookies for better security (update `app/lib/db/session.ts`)

