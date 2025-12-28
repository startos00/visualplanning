# Feature Requirement Document (FRED): Better-Auth Integration

## Feature Name
Better-Auth Integration with Neon Database

## Goal
Replace the current cookie-based session ID system with Better-Auth, a modern authentication library that provides secure user authentication, session management, and support for multiple authentication providers (email/password and OAuth). This will enable proper user accounts, email verification, and OAuth provider integration (Google, GitHub, etc.) while maintaining compatibility with the existing Neon database infrastructure.

## User Story
As a user, I want to securely authenticate using email/password or OAuth providers, so that I can have a persistent account with verified email and access my data across devices.

## Functional Requirements

### 1. Package Installation
- Install `better-auth` package via npm
- Ensure compatibility with existing Next.js 16.1.0 and React 19.2.3 setup

### 2. Database Schema Updates
- Add Better-Auth required tables to both `src/db/schema.ts` and `app/lib/db/schema.ts`:
  - **users table**: Store user account information
    - `id` (text, primary key)
    - `name` (varchar 255, nullable)
    - `email` (varchar 255, not null, unique)
    - `emailVerified` (boolean, default false)
    - `image` (varchar 255, nullable)
    - `createdAt` (timestamp, default now)
    - `updatedAt` (timestamp, default now)
  - **sessions table**: Store user session tokens
    - `id` (text, primary key)
    - `userId` (text, not null, foreign key to users.id with cascade delete)
    - `token` (text, not null, unique)
    - `expiresAt` (timestamp, not null)
    - `ipAddress` (varchar 45, nullable)
    - `userAgent` (varchar 255, nullable)
    - `createdAt` (timestamp, default now)
    - `updatedAt` (timestamp, default now)
  - **accounts table**: Store OAuth provider account linkages
    - `id` (text, primary key)
    - `userId` (text, not null, foreign key to users.id with cascade delete)
    - `accountId` (text, not null)
    - `providerId` (text, not null)
    - `providerType` (text, not null)
    - `accessToken` (text, nullable)
    - `refreshToken` (text, nullable)
    - `expiresAt` (timestamp, nullable)
    - `createdAt` (timestamp, default now)
    - `updatedAt` (timestamp, default now)
  - **verification_tokens table**: Store email verification and password reset tokens
    - `id` (text, primary key)
    - `identifier` (varchar 255, not null)
    - `token` (text, not null, unique)
    - `expiresAt` (timestamp, not null)
    - `createdAt` (timestamp, default now)
    - `updatedAt` (timestamp, default now)

### 3. Database Migration
- Generate SQL migration script for the new tables
- Apply migration to Neon database using manual SQL execution (consistent with current schema management approach)
- Ensure foreign key constraints are properly set up
- Verify indexes are created for performance (email uniqueness, token lookups)

### 4. Better-Auth Configuration
- Create `app/lib/auth.ts` file
- Initialize Better-Auth with Drizzle adapter configured for PostgreSQL
- Connect to existing Neon database instance via `app/lib/db/index.ts`
- Configure authentication providers:
  - Email/Password authentication (enabled by default)
  - OAuth providers (Google, GitHub, etc.) - configuration to be set via environment variables
- Set up session management with secure cookie handling
- Configure email verification flow
- Set appropriate security settings (CSRF protection, secure cookies in production)

### 5. API Route Setup
- Create `app/api/auth/[...all]/route.ts` catch-all route
- Export GET and POST handlers from Better-Auth instance
- Ensure route handles all authentication endpoints:
  - `/api/auth/sign-up` - User registration
  - `/api/auth/sign-in` - User login
  - `/api/auth/sign-out` - User logout
  - `/api/auth/session` - Get current session
  - `/api/auth/verify-email` - Email verification
  - `/api/auth/forgot-password` - Password reset request
  - `/api/auth/reset-password` - Password reset confirmation
  - OAuth provider endpoints (e.g., `/api/auth/google`, `/api/auth/github`)

### 6. Environment Variables
- Document required environment variables:
  - `BETTER_AUTH_SECRET` - Secret key for signing tokens (required)
  - `BETTER_AUTH_URL` - Base URL of the application (required)
  - OAuth provider credentials (optional, for OAuth integration):
    - `BETTER_AUTH_GOOGLE_CLIENT_ID`
    - `BETTER_AUTH_GOOGLE_CLIENT_SECRET`
    - `BETTER_AUTH_GITHUB_CLIENT_ID`
    - `BETTER_AUTH_GITHUB_CLIENT_SECRET`

## Data Requirements

### New Tables
- **users**: Primary user account data
- **sessions**: Active user sessions with tokens
- **accounts**: OAuth provider account linkages
- **verification_tokens**: Email verification and password reset tokens

### Existing Tables Impact
- Current tables (`canvases`, `graph_states`, `abyssal_garden_states`) use `userId` as TEXT field
- These tables will continue to work but will need future migration to reference `users.id` as foreign key
- For MVP: Keep existing `userId` TEXT fields, but new authenticated users will have proper user IDs from Better-Auth

### Migration Strategy
- **Fresh Start Approach**: Existing session-based users will need to sign up again
- No automatic migration of existing session IDs to Better-Auth users
- Existing data associated with old session IDs will remain orphaned (can be cleaned up later)

## User Flow

### Registration Flow (Email/Password)
1. User navigates to sign-up page/form
2. User enters email and password
3. System creates user account in `users` table
4. System sends verification email (if email verification enabled)
5. User receives email and clicks verification link
6. User is redirected back to app with verified status
7. User can now sign in

### Sign-In Flow (Email/Password)
1. User navigates to sign-in page/form
2. User enters email and password
3. System validates credentials
4. System creates session in `sessions` table
5. System sets secure session cookie
6. User is authenticated and redirected to app

### OAuth Sign-In Flow
1. User clicks "Sign in with Google/GitHub" button
2. User is redirected to OAuth provider
3. User authorizes the application
4. OAuth provider redirects back with authorization code
5. System exchanges code for access token
6. System creates/updates user account in `users` table
7. System creates account linkage in `accounts` table
8. System creates session in `sessions` table
9. User is authenticated and redirected to app

### Sign-Out Flow
1. User clicks sign-out button
2. System invalidates session in `sessions` table
3. System clears session cookie
4. User is redirected to sign-in page

## Acceptance Criteria

- **Package Installation**
  - `better-auth` is installed and listed in `package.json` dependencies
  - No dependency conflicts with existing packages

- **Database Schema**
  - All four tables (`users`, `sessions`, `accounts`, `verification_tokens`) are defined in both schema files
  - Tables are created in Neon database via SQL migration
  - Foreign key constraints are properly configured
  - Unique constraints on email and tokens are enforced

- **Better-Auth Configuration**
  - `app/lib/auth.ts` file exists and exports configured Better-Auth instance
  - Drizzle adapter is properly configured with PostgreSQL provider
  - Database connection uses existing `app/lib/db/index.ts` setup
  - Email/password authentication is functional
  - OAuth providers can be configured via environment variables

- **API Routes**
  - `app/api/auth/[...all]/route.ts` exists and exports GET/POST handlers
  - All authentication endpoints respond correctly:
    - Sign-up creates user and returns session
    - Sign-in validates credentials and returns session
    - Sign-out invalidates session
    - Session endpoint returns current user if authenticated
    - Email verification endpoint validates tokens
    - Password reset endpoints function correctly
    - OAuth endpoints redirect and handle callbacks

- **Security**
  - Session tokens are securely generated and stored
  - Cookies are httpOnly and secure in production
  - CSRF protection is enabled
  - Password hashing uses secure algorithm (handled by Better-Auth)
  - Email verification tokens expire after set time

- **Integration**
  - Better-Auth works with existing Neon database connection
  - No breaking changes to existing API routes (`/api/graph`, `/api/abyssal-garden`)
  - Existing session-based code can coexist (will be deprecated later)

## Edge Cases

- **Duplicate Email Registration**
  - System should reject registration with existing email
  - Return clear error message to user

- **Invalid Credentials**
  - Sign-in with wrong password should fail gracefully
  - Return generic error message (don't reveal if email exists)

- **Expired Sessions**
  - Expired sessions should be automatically cleaned up
  - User should be redirected to sign-in when session expires

- **Email Verification**
  - Unverified users should have limited access (if verification required)
  - Verification tokens should expire after reasonable time (e.g., 24 hours)
  - Resending verification email should invalidate old tokens

- **OAuth Provider Failures**
  - Handle OAuth provider errors gracefully
  - Return user to app with error message
  - Don't create partial user accounts

- **Database Connection Issues**
  - Handle Neon database connection failures gracefully
  - Return appropriate error responses
  - Log errors for debugging

- **Concurrent Sign-Ins**
  - Multiple sessions per user should be supported
  - User can sign out from all devices or specific device

- **Token Expiration**
  - Verification tokens expire after set time
  - Password reset tokens expire after set time
  - Expired tokens cannot be reused

## Non-Functional Requirements

### Performance
- Authentication requests should complete in < 500ms
- Database queries should use proper indexes
- Session validation should be fast (cached when possible)

### Security
- All passwords must be hashed (handled by Better-Auth)
- Session tokens must be cryptographically secure
- Cookies must be httpOnly and secure in production
- CSRF protection must be enabled
- Rate limiting should be considered for authentication endpoints

### Reliability
- Database operations should use transactions where appropriate
- Failed authentication attempts should not crash the application
- Error messages should not leak sensitive information

### Compatibility
- Must work with existing Next.js 16.1.0 App Router
- Must work with existing Neon database setup
- Must not break existing API routes
- Should support both server-side and client-side usage

### Documentation
- Environment variables should be documented in `.env.example`
- Setup instructions should be added to `SETUP_GUIDE.md`
- API usage examples should be provided

## Implementation Notes

### Schema File Management
- Both `src/db/schema.ts` and `app/lib/db/schema.ts` will be updated
- Drizzle config points to `src/db/schema.ts`, but app uses `app/lib/db/schema.ts`
- Ensure consistency between both files

### Migration Approach
- Since schema is managed manually via SQL, create SQL migration script
- Run SQL directly in Neon console (consistent with current approach)
- Document migration steps clearly

### Future Considerations
- Consider migrating existing `userId` TEXT fields to foreign keys referencing `users.id`
- Plan for user data migration from old session IDs to Better-Auth user IDs
- Consider adding user profile management features
- Consider adding account deletion functionality
- Consider adding two-factor authentication (2FA) support




