# CIT ID

## TL;DR

CIT ID is a centralized authentication + permission system for CIT apps.

- Users log in once at `identity.drhscit.org`
- Apps call `/auth/authorize` with a `client_id`
- CIT ID returns user info + app-specific permissions
- Auth is handled via shared-domain HTTP-only cookies

```
┌──────────┐         ┌───────────────────────---┐
│   User   │──logs in──▶  identity.drhscit.org  │
└──────────┘         │       (CIT ID)           │
                     └───────┬───────────────---┘
                             │
                   Cookie set on .drhscit.org
                             │
                             ▼
┌──────────────────┐   GET /auth/authorize    ┌───────────────────────┐
│  inventory.      │─── ?client_id=app_... ──▶│       CIT ID          │
│  drhscit.org     │   (cookie sent along)    │  reads cookie, looks  │
│  (any CIT app)   │◀── user + permissions ───│  up app permissions   │
└──────────────────┘                          └───────────────────────┘
```

---

CIT ID is a centralized identity and permissions system for the CIT department. It gives every CIT app a single place to authenticate users and look up what they're allowed to do, so individual projects don't have to build their own login systems from scratch.

The core idea: CIT ID runs at `identity.drhscit.org` and sets an HTTP-only auth cookie on the shared `drhscit.org` domain. Because browsers attach cookies to any subdomain under the same parent domain, any app running on `*.drhscit.org` (like `inventory.drhscit.org` or `drsu.drhscit.org`) automatically sends that cookie along with its requests. When an app needs to know who's logged in and what they can do, it calls the CIT ID `/auth/authorize` endpoint with its `client_id`, and CIT ID reads the cookie and returns the user's info and permissions scoped to that specific app.

---

## Stack

| Layer | Tech | What it does |
|-------|------|-------------|
| **Backend** | Flask (Python) | REST API, JWT auth, SQLAlchemy ORM, Flask-Mail for verification emails |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS | Admin dashboard, app/permission management UI (shadcn/ui components) |
| **Database** | PostgreSQL (SQLite for local dev) | User accounts, apps, permissions, grants, refresh tokens |
| **Auth** | Flask-JWT-Extended | Access + refresh tokens stored as HTTP-only cookies |

---

## Features

<details>
<summary><strong>Shared-domain cookie authentication</strong></summary>

When a user logs into CIT ID at `identity.drhscit.org`, the server sets JWT cookies with the domain scoped to `.drhscit.org`. Any app hosted on a subdomain of `drhscit.org` will have those cookies sent along by the browser automatically. This is what makes the "single sign-on" work -- the user logs in once, and every CIT app can verify their identity by calling back to CIT ID.

```
 Browser visits identity.drhscit.org/login
                  │
                  ▼
   POST /auth/login  { email, password }
                  │
                  ▼
   Server validates credentials
                  │
                  ▼
   Set-Cookie: access_token=...;  Domain=.drhscit.org; HttpOnly
   Set-Cookie: refresh_token=...; Domain=.drhscit.org; HttpOnly
                  │
                  ▼
   Now ANY request to *.drhscit.org includes these cookies
   ┌─────────────────────────────────────────────────┐
   │  inventory.drhscit.org  ──  cookie sent ✓       │
   │  drsu.drhscit.org       ──  cookie sent ✓       │
   │  potluck.drhscit.org    ──  cookie sent ✓       │
   └─────────────────────────────────────────────────┘
```

**The catch for local development:** This cookie approach means the Vite dev server (React) and the Flask server have to be on the same domain. If Vite runs on `localhost:5173` and Flask runs on `localhost:5000`, cookies will work. But if you try mixing domains (e.g. `localhost` for one and `127.0.0.1` for the other), Chrome will reject the cookies. On school computers, you can't edit the hosts file to map `drhscit.org` to `localhost`, so local development of a *separate* app that talks to a locally-running CIT ID server gets awkward. This is a known limitation of the cookie-based approach -- see "Future" below.

</details>

<details>
<summary><strong>The <code>/auth/authorize</code> endpoint</strong></summary>

This is the most important endpoint for external apps. Here's how it works:

```
┌──────────────────┐                          ┌───────────────────┐
│   External App   │                          │      CIT ID       │
│  (e.g. inventory │                          │  /auth/authorize  │
│  .drhscit.org)   │                          │                   │
└────────┬─────────┘                          └────────┬──────────┘
         │                                             │
         │  GET /auth/authorize?client_id=app_Xk9f...  │
         │  Cookie: access_token=... (auto-attached)   │
         │────────────────────────────────────────────▶│
         │                                             │
         │                        Validate JWT cookie  │
         │                        Look up app by       │
         │                          client_id          │
         │                        Query permissions    │
         │                          for THIS app only  │
         │                                             │
         │  { user: {...}, permissions: [...] }        │
         │◀────────────────────────────────────────────│
         │                                             │
         ▼                                             │
  App decides what                                     │
  the user can do                                      │
  based on permissions                                 │
```

1. An app is registered in CIT ID by a platform admin, and gets a unique `client_id` (e.g. `app_Xk9f2m...`)
2. The app stores that `client_id` in its own environment variables
3. When the app needs to check who's logged in, it makes a request:
   ```
   GET https://identity.drhscit.org/auth/authorize?client_id=app_Xk9f2m...
   ```
   The user's auth cookies are sent along automatically (because shared domain)
4. CIT ID validates the cookie, looks up the user, finds the app matching that `client_id`, and returns **only the permissions relevant to that app**:
   ```json
   {
     "msg": "Authorized",
     "user": {
       "id": 1,
       "email": "student@henricostudents.org",
       "first_name": "John",
       "last_name": "Doe"
     },
     "client_id": "app_Xk9f2m...",
     "permissions": [
       { "name": "read_reports", "description": "Can view reports" },
       { "name": "admin", "description": "Full admin access" }
     ]
   }
   ```

The key design decision: the 1086 Inventory app will never see what permissions a user has on the Potluck app, and vice versa. Each app only gets back its own permissions.

If no `client_id` is passed, the endpoint just returns the user object (useful for CIT ID's own frontend).

**Authorized redirect URIs** are defined in the schema (`redirect_uris` field on `CreateAppSchema`) but are **not currently enforced** in the authorize flow. This is planned for next year -- it would let CIT ID validate that an authorization request is actually coming from a registered origin before responding.

</details>

<details>
<summary><strong>App creation and permission management</strong></summary>

```
  Platform Admin creates app
         │
         ▼
  App registered (name, link, client_id generated)
         │
         ▼
  Admin assigns owner (e.g. student project lead)
         │
         ▼
  Owner defines permissions (e.g. "admin", "editor", "viewer")
         │
         ▼
  Owner grants permissions to users (by picker or email list)
         │
         ▼
  External app calls /auth/authorize?client_id=...
  and gets back that user's permissions for this app
```

**Platform admins** (teachers, department leads -- anyone with the `app_admin` flag) can:
- **Create apps** -- each representing a separate CIT project that will use CIT ID. The app gets a name, an optional link, and a generated `client_id`.
- **Assign ownership** -- the admin can set the `owner_id` to a student project lead. Later, ownership can be shifted (e.g. teacher creates the app, assigns a student as owner, then transfers to the client when development is done). Only platform admins can reassign owners.
- **Delete apps** and **edit app metadata** (name, link, owner).

**App owners** (and platform admins) can:
- **Define permissions** for their app (e.g. `admin`, `read_reports`, `editor` -- whatever makes sense for that app)
- **Grant permissions to users** in several ways:
  - Pick users from a table of all registered users and assign a permission
  - Paste a space/comma/semicolon-separated list of emails to bulk-assign a permission
  - Grant by user IDs in bulk
- **Revoke permissions** from users
- **View the client_id** (treated like an integration secret, not shown in normal listings)

</details>

<details>
<summary><strong>JWT authentication with refresh tokens</strong></summary>

Authentication uses two JWTs, both stored as HTTP-only cookies (JavaScript on the page can't read them directly):

- **Access token** -- short-lived (15 minutes). Sent with every API request. When it expires, the frontend silently refreshes it.
- **Refresh token** -- longer-lived (30 days). Used only to get a new access token.

Here's the full auth flow in `auth.py`:

```
┌─────────────────────────────────────────────────────────────────┐
│                        REGISTRATION                             │
│                                                                 │
│  POST /auth/register  { email, password, first_name, last_name }│
│         │                                                       │
│         ▼                                                       │
│  Create user (email_verified = false)                           │
│         │                                                       │
│         ▼                                                       │
│  Send verification email (JWT link, expires 15 min)             │
│         │                                                       │
│         ▼                                                       │
│  GET /auth/verify_email/<token>                                 │
│         │                                                       │
│         ▼                                                       │
│  email_verified = true  →  redirect to /login                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          LOGIN                                  │
│                                                                 │
│  POST /auth/login  { email, password }                          │
│         │                                                       │
│         ▼                                                       │
│  Validate credentials + check email_verified                    │
│         │                                                       │
│         ▼                                                       │
│  Create access_token (15 min) + refresh_token (30 days)         │
│  Store refresh token jti in RefreshToken table                  │
│         │                                                       │
│         ▼                                                       │
│  Set both as HttpOnly cookies on response                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    REFRESH (silent)                              │
│                                                                 │
│  Frontend makes API call  →  gets 401 (access token expired)    │
│         │                                                       │
│         ▼                                                       │
│  Axios interceptor catches 401                                  │
│         │                                                       │
│         ▼                                                       │
│  POST /auth/refresh  (refresh cookie sent automatically)        │
│         │                                                       │
│         ▼                                                       │
│  Server checks jti in DB: exists and not revoked?               │
│         │                                                       │
│     yes ▼                        no ▼                           │
│  New access_token cookie     401 → clear cookies → login page   │
│         │                                                       │
│         ▼                                                       │
│  Retry original request with new access cookie                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         LOGOUT                                  │
│                                                                 │
│  POST /auth/logout                                              │
│         │                                                       │
│         ▼                                                       │
│  Mark refresh token as revoked = True in DB                     │
│         │                                                       │
│         ▼                                                       │
│  Clear all JWT cookies                                          │
│  (token_in_blocklist_loader rejects this jti from now on)       │
└─────────────────────────────────────────────────────────────────┘
```

Step by step:

1. **Login** (`POST /auth/login`): validates email/password, checks that the email is verified. If good, creates both tokens, stores the refresh token's `jti` (unique ID) in the `RefreshToken` table, and sets both as cookies on the response.
2. **Refresh** (`POST /auth/refresh`): reads the refresh cookie, looks up its `jti` in the database to make sure it hasn't been revoked. If valid, issues a new access token cookie. The refresh token itself stays the same.
3. **Logout** (`POST /auth/logout`): marks the refresh token as `revoked = True` in the database and clears both cookies. The `token_in_blocklist_loader` hook in `app.py` checks every incoming token against this revocation list, so a logged-out refresh token is permanently dead.
4. **Frontend auto-refresh**: the Axios interceptor in `axios.ts` catches 401 responses on the main `api` client, calls `POST /auth/refresh` to get a fresh access cookie, then retries the original request. This is transparent to the rest of the frontend code.

</details>

<details>
<summary><strong>Email verification</strong></summary>

When a user registers, they get a verification email with a time-limited JWT link (15 minutes). Clicking it hits `GET /auth/verify_email/<token>`, which flips `email_verified` to true and redirects to the login page. Until verified, login is blocked -- and if someone tries to log in with an unverified email, CIT ID auto-sends a new verification email.

```
  Register
     │
     ▼
  User created (email_verified = false)
     │
     ▼
  Verification email sent (link expires in 15 min)
     │
     ▼
  User clicks link  →  GET /auth/verify_email/<token>
     │
     ▼
  email_verified = true  →  redirect to /login
     │
     ▼
  User can now log in
```

</details>

<details>
<summary><strong>User management (platform admins)</strong></summary>

Platform admins can view all registered users in a searchable, sortable table and toggle the `app_admin` flag on any user. There's a safety check: you can't remove the last platform admin.

</details>

---

## How an external app uses CIT ID

Here's the short version of what a developer building a CIT app needs to do:

1. A platform admin registers the app on CIT ID and gives you the `client_id`
2. Store `client_id` in your app's environment (e.g. `CITID_CLIENT_ID="app_Xk9f2m..."`)
3. When you need to authenticate a user, make a server-side or client-side GET request to:
   ```
   GET https://identity.drhscit.org/auth/authorize?client_id=YOUR_CLIENT_ID
   ```
   Make sure cookies are included in the request (`withCredentials: true` in Axios, `credentials: 'include'` in fetch)
4. CIT ID returns the user object and their permissions for your app
5. Your app handles its own authorization logic based on those permissions

If the user isn't logged in (no valid cookie), the authorize endpoint returns a 401, and you should redirect them to `identity.drhscit.org/login`.

> **Note:** External apps will also need to handle access-token refresh logic (the access cookie expires every 15 minutes). Right now each app would have to implement that themselves. In a future version this will be provided as boilerplate code or a shared library so apps don't have to reinvent it -- see [Future](#future).

---

## Database schema (see `backend/models.py`)

Five main tables power the permissions and audit system:

- **`Users`** -- email, hashed password, name, `app_admin` flag, `email_verified` flag
- **`Apps`** -- name, link, `client_id` (auto-generated `app_` + random token), `owner_id` (FK to Users)
- **`Permissions`** -- name, description, `app_id` (FK to Apps). Names are unique per app.
- **`UserPermissions`** -- the join table: `user_id` + `app_id` + `permission_id`. This is the source of truth for "who can do what on which app."
- **`AuditLog`** -- API-level audit records for sensitive actions (actor, action, target, details, timestamp).

There's also a **`RefreshToken`** table that stores each refresh token's `jti` and a `revoked` boolean for the logout/blocklist system.

---

## Backend files

| File | What it does |
|------|-------------|
| **`app.py`** | Flask application factory. Initializes the database, JWT manager, mail, CORS. Registers the three blueprints (`auth`, `apps`, `admin`). Serves the built React app from `frontend/dist`. Has the `/profile` route and the token blocklist hook. |
| **`auth.py`** | Auth blueprint (`/auth/*`). Registration, email verification, login, refresh, logout, and the `/authorize` endpoint that external apps call. |
| **`apps.py`** | Apps blueprint (`/apps/*`). CRUD for apps, permission definitions, and all the grant/revoke endpoints (single, bulk by ID, bulk by email). |
| **`admin_views.py`** | Admin blueprint (`/admin/*`). Lists all users and lets platform admins toggle the `app_admin` flag. |
| **`models.py`** | SQLAlchemy models: `Users`, `RefreshToken`, `Apps`, `Permissions`, `UserPermissions`, `AuditLog`. |
| **`schemas.py`** | Marshmallow validation schemas for every form/request body (register, login, create app, create permission, grant, revoke, etc.). Each schema has a corresponding `validate_*` function that returns `(data, None)` or `(None, error_response)`. |
| **`config.py`** | Loads `.env` from the repo root. JWT settings (cookie location, expiration, domain), database URI, mail server config. |
| **`utils/email.py`** | Thin wrapper around Flask-Mail. One function: `send_email(to, subject, html_body)`. |
| **`utils/audit.py`** | Shared helper for API-level audit writes (`add_audit_log`) used by auth, app management, and admin mutation endpoints. |

---

## Frontend files

### Pages

| File | What it does |
|------|-------------|
| **`App.tsx`** | Layout shell -- sidebar, header, and an `<Outlet />` for child routes. |
| **`Login.tsx`** | Login form. Supports an optional `callbackUrl` query param so external apps can redirect here and bounce users back after login. If the email isn't verified, redirects to the verify-pending page. |
| **`Register.tsx`** | Registration form (name, email, password). After success, redirects to verify-pending. |
| **`VerifyPending.tsx`** | "Check your inbox" screen with a resend button. |
| **`Dashboard.tsx`** | Landing page after login. Shows a table of apps the user has access to and which permissions they hold on each. |
| **`Apps.tsx`** | App management page. Platform admins see all apps and can create new ones (with owner selection). App owners see their own apps. Creating an app shows a one-time dialog with the `client_id`. |
| **`AppAccess.tsx`** | Per-app detail page. Define permissions, grant them to users (by picker table or by email list), view who has what, reveal the `client_id`, edit metadata, delete the app. |
| **`UserManagement.tsx`** | Platform admin only. Searchable/sortable user roster with checkboxes to toggle `app_admin`. |

### Services (`services/`)

| File | What it does |
|------|-------------|
| **`axios.ts`** | Two Axios instances (`api` and `refreshApi`). `api` has a 401 interceptor that auto-calls `/auth/refresh` and retries. Both use `withCredentials: true` for cookies. |
| **`auth.ts`** | API calls for register, login, logout, refresh, resend verification. |
| **`apps.ts`** | API calls for everything app-related: create/update/delete apps, permissions CRUD, grant by email, grant bulk, get user directory. |
| **`admin.ts`** | API calls for the admin user list and toggling `app_admin`. |
| **`user.ts`** | `getProfile()` -- called by `AuthContext` on page load to check login state. |

### Context

- **`AuthContext.tsx`** -- React context that wraps the entire app. Calls `/profile` on mount to populate auth state (email, name, admin flag). Provides `useAuth()` and `useProtectedRoute()` hooks. Protected routes redirect to `/login` if not authenticated.

### Components

- **Sidebar & navigation**: `app-sidebar.tsx`, `nav-main.tsx`, `nav-secondary.tsx`, `nav-user.tsx`, `site-header.tsx` -- collapsible sidebar with Dashboard/Apps/User Management links (User Management only shows for admins), user dropdown with logout.
- **App access components** (`components/app-access/`): `AppAccessPermissions.tsx`, `AppAccessGrantToUsers.tsx`, `AppAccessUsersPermissionTable.tsx`, `AppAccessEditModal.tsx` -- the pieces that make up the per-app management page.
- **UI primitives** (`components/ui/`): shadcn/ui components -- `button`, `card`, `dialog`, `input`, `table`, `select`, `tabs`, `sidebar`, `badge`, `skeleton`, `sonner` (toasts), etc.

---

## Running locally

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Make sure ../.env exists (copy from .env.example)
python app.py
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in your `.env` to point at the Flask server (e.g. `http://localhost:5000`). Both servers must be on the same domain for cookies to work -- if Vite is on `localhost:5173`, Flask should be on `localhost:5000` (same domain, different ports is fine). If you try to run one on `localhost` and the other on `127.0.0.1`, or mix custom domains, Chrome will reject the cookies.

For production-style testing, build the frontend (`npm run build` in `frontend/`) and let Flask serve it directly -- the Flask app already points its `static_folder` at `frontend/dist`.

---

## Configuration (`.env`)

Copy `.env.example` to `.env` at the repo root.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLAlchemy connection string. Defaults to SQLite if not set. Use `postgresql://...` for production. |
| `JWT_SECRET_KEY` | Signs all JWTs. Change from the dev default before deploying. |
| `SECRET_KEY` | Flask's secret key (session signing fallback). |
| `SERVER_NAME` | Flask's `SERVER_NAME` -- needed for URL generation and cookie scoping. |
| `COOKIE_DOMAIN` | The domain JWT cookies are set on (e.g. `.drhscit.org` so all subdomains can read them). |
| `MAIL_USERNAME` | Gmail address for sending verification emails. |
| `MAIL_PASSWORD` | Gmail app password. |
| `MAIL_DEFAULT_SENDER` | "From" address on emails (usually same as `MAIL_USERNAME`). |
| `VITE_API_BASE_URL` | The URL the React frontend uses to call the Flask API. |

---

## Deployment

CIT ID hasn't been deployed to production yet. The intended setup:

- Flask serves the built React frontend from `frontend/dist` and the API from the same origin (`identity.drhscit.org`)
- PostgreSQL database
- `COOKIE_DOMAIN` set to `.drhscit.org` so cookies are shared across all subdomains
- HTTPS enabled, with `JWT_COOKIE_SECURE = True` and CSRF protection turned on
- CORS origins updated to only allow the real production domains

---

## Future

This is a working prototype and proof of concept, here's things that still need to happen and what we would do if we were building v2:

- **Move away from setting cookies directly.** The shared-cookie approach works but causes real friction for local development -- HTTP-only cookies are hard to work around, and school computers can't edit their hosts file to fake `drhscit.org` pointing at localhost. A better model: CIT ID just returns the user's permissions for a given app via the authorize endpoint, and the actual cookie-setting logic lives in a shared library or boilerplate code that each app copies in. That way each app manages its own session cookies on its own domain.
- **Authorized redirect URIs.** The schema already accepts `redirect_uris` when creating an app, but they're not enforced yet. This would let CIT ID verify that an authorization request is coming from a legitimate origin before responding.
- **Forgot password.** Not implemented yet.
- **Audit logs.** API-level audit logging is now implemented in backend routes via a shared helper and `AuditLog` table. Database-level row-change triggers (e.g., PostgreSQL triggers) are still a longer-term goal.
- **Security hardening.** Right now `JWT_COOKIE_SECURE` is false and CSRF protection is disabled in `config.py` — fine for local dev, not okay for production. Before deploying: enable `JWT_COOKIE_SECURE = True` (requires HTTPS), turn on `JWT_COOKIE_CSRF_PROTECT`, and enforce HTTPS across the board. Rate limiting on auth endpoints (login, register, refresh) should also be added to prevent brute-force attacks.
- **Hosting.** Didn't get to it this time around. The idea is to use a GitHub Action that builds the React frontend, SSHs into the web server, and updates the code in place. Docker is another option worth exploring.
