# SimplyAI

SimplyAI is a full-stack SaaS platform that enables businesses to collect structured data through AI-powered questionnaires and automatically generate personalised analytical reports using GPT-4. Administrators configure subscription plans and assign questionnaires to each plan. Users sign up, complete their assigned questionnaires, and receive AI-generated reports based on their responses. The platform supports free and paid tiers, Stripe-powered payments, social OAuth login, and a rich admin panel for managing every aspect of the system. 

## Main Functionalities

**For End Users**
- Register with email/password or via Google and Facebook OAuth
- Choose a free or paid subscription plan at sign-up
- Complete multi-page questionnaires assigned to their plan (built with SurveyJS)
- Receive AI-generated reports based on their answers, containing text summaries, charts, and data tables
- View, track, and re-take questionnaires from a personal dashboard
- Manage their profile, subscription, and account settings

**For Administrators**
- Full admin panel to manage users, subscriptions, and customer details
- Drag-and-drop form builder for creating multi-page questionnaires with conditional logic and image support
- Import questionnaires in bulk from TXT or CSV files
- Subscription plan management — create/edit/delete free and paid plans, configure per-plan questionnaire sequences, retake limits, and progress tracking
- AI prompt template editor — write system prompts, general prompts, and section-specific prompts per plan and questionnaire
- AI report template editor — define text, chart, and table sections using shortcodes that map to questionnaire answers
- ChatGPT integration panel (GPT-4) for generating and previewing reports
- Page editor for managing public-facing website content (home, about, pricing, blog, etc.)
- Payment configuration — choose currency (EUR, USD, GBP, CHF, CAD), set VAT percentage, and configure Stripe keys — all from the admin UI
- Email notification system for registration and subscription events
- Admin dashboard with live statistics (total users, active/completed questionnaires, total reports)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, React Router v6 |
| UI Components | shadcn/ui (Radix UI), Tailwind CSS 3 |
| Forms | SurveyJS (survey-creator-react), React Hook Form, Zod |
| Charts | ApexCharts, Recharts |
| PDF Export | jsPDF, html2canvas |
| State / Data | TanStack React Query |
| Backend | Node.js, Express 4 |
| Database | MySQL (mysql2) |
| Auth | JWT, Passport.js (Google OAuth 2.0, Facebook OAuth) |
| Payments | Stripe (react-stripe-js) |
| AI | OpenAI GPT-4 (via `openai` SDK) |
| Email | Nodemailer |
| File Uploads | Multer |
| Dev Server | Nodemon |

---

## Project Structure

```
simplyai-v3/
├── src/                          # React frontend (Vite)
│   ├── pages/                    # All page components
│   │   ├── admin/                # Admin panel pages
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── FormBuilder.tsx / FormBuilderEditor.tsx
│   │   │   ├── PlansManagement.tsx / PlanEditor.tsx
│   │   │   ├── ChatGPTIntegration.tsx
│   │   │   ├── PromptEditor.tsx / PromptTemplatesManager.tsx
│   │   │   ├── ReportTemplateEditor.tsx / ReportsPage.tsx
│   │   │   ├── PageEditor.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── UsersManagement.tsx / CustomerDetails.tsx
│   │   ├── Dashboard.tsx / UserDashboard.tsx
│   │   ├── Questionnaire.tsx / QuestionnaireSurveyJS.tsx
│   │   ├── Report.tsx
│   │   ├── Pricing.tsx / Payment.tsx
│   │   ├── Login.tsx / Register.tsx
│   │   └── Home.tsx / About.tsx / Blog.tsx / ...
│   ├── components/
│   │   ├── admin/                # Admin-specific components
│   │   ├── chatgpt/              # AI prompt & report components
│   │   ├── dashboard/            # User dashboard components
│   │   ├── form-builder/         # Form builder components
│   │   ├── report-components/    # Report renderer components
│   │   └── ui/                   # shadcn/ui primitives
│   ├── services/                 # API service layer
│   ├── contexts/                 # AuthContext
│   └── config/                   # API base URL, env config
│
├── backend/                      # Express API server
│   ├── index.js                  # Entry point, route registration
│   ├── db.js                     # MySQL connection pool
│   ├── config/
│   │   ├── database.js
│   │   └── passport.js           # Google & Facebook OAuth strategies
│   ├── routes/
│   │   ├── auth.js               # Register, login, logout, OAuth callbacks
│   │   ├── auth-forgot-password.js / auth-reset-password.js
│   │   ├── plans.js              # Subscription plan CRUD
│   │   ├── questionnaires.js     # Questionnaire CRUD
│   │   ├── responses.js          # User questionnaire responses
│   │   ├── ai-integration.js     # GPT-4 report generation
│   │   ├── reports.js            # Report storage & retrieval
│   │   ├── prompt-templates.js   # AI prompt template CRUD
│   │   ├── stripe.js             # Stripe payment intent creation
│   │   ├── payment.js / paymentSettings.js
│   │   ├── admin-working.js      # Admin-only routes
│   │   ├── users.js
│   │   ├── settings.js / appSettings.js
│   │   ├── pages.js              # CMS page content
│   │   ├── imageUpload.js / upload.js
│   │   └── dashboard.js          # Dashboard statistics
│   ├── services/
│   │   └── emailService.js       # Nodemailer email notifications
│   └── utils/
│       └── subscription-helpers.js
│
├── public/                       # Static assets, logo, favicon
├── database_setup.sql            # Database schema reference
├── backend/.env.example          # Backend environment variable template
├── .env                          # Frontend environment variables
├── setup-backend.sh / .bat       # Backend setup scripts
└── start-servers.bat             # Windows quick-start script
```

---

## Prerequisites

- Node.js 18+
- npm or bun
- MySQL 8+
- A Stripe account (for payments)
- An OpenAI API key (for GPT-4 report generation)
- Google and/or Facebook OAuth app credentials (for social login, optional)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Hasi6558/simplyai-v3.git
cd simplyai-v3
```

### 2. Set up the MySQL database

Create a MySQL database and a user, then note the connection details.

The backend auto-runs any required table creation on first use. You can also reference `database_setup.sql` for schema details.

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=simolyai
DB_PORT=3306

# JWT
JWT_SECRET=your_jwt_secret_here

# Server
PORT=4000
FRONTEND_URL=http://localhost:8081

# OpenAI
OPENAI_API_KEY=sk-...

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Facebook OAuth (optional)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# Stripe (can also be configured in the Admin > Settings UI)
STRIPE_SECRET_KEY=sk_test_...
```

### 4. Install backend dependencies and start

```bash
cd backend
npm install
npm run dev
```

The backend runs on `http://localhost:4000`.

### 5. Configure the frontend

Back in the project root, create or edit `.env`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 6. Install frontend dependencies and start

```bash
# from project root
npm install
npm run dev
```

The frontend runs on `http://localhost:8081`.

### 7. Create the first admin user

```bash
cd backend
node create-admin.js
```

Then log in at `http://localhost:8081/admin/login`.

---

## Scripts

### Frontend (root)

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

### Backend (`backend/`)

| Script | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start production server |

---

## API Overview

All API routes are prefixed with `/api`.

### Authentication — `/api/auth`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/register` | Register with email/password (free or paid plan) |
| `POST` | `/register-with-plan` | Register and immediately assign a free plan |
| `POST` | `/login` | Email/password login → JWT token |
| `POST` | `/logout` | Logout |
| `GET` | `/me` | Get current authenticated user |
| `POST` | `/forgot-password` | Request password reset email |
| `POST` | `/reset-password` | Reset password with token |
| `GET` | `/google` | Initiate Google OAuth |
| `GET` | `/google/callback` | Google OAuth callback |
| `GET` | `/facebook` | Initiate Facebook OAuth |
| `GET` | `/facebook/callback` | Facebook OAuth callback |
| `POST` | `/register/google` | Complete registration after Google OAuth |
| `POST` | `/register/facebook` | Complete registration after Facebook OAuth |

### Subscription Plans — `/api/plans`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | List all active plans |
| `GET` | `/admin/all` | List all plans including inactive (admin) |
| `GET` | `/:id` | Get a single plan |
| `POST` | `/` | Create a plan |
| `PUT` | `/:id` | Update a plan |
| `DELETE` | `/:id` | Delete a plan |
| `GET/POST` | `/:id/settings` | Get or save plan behaviour settings |
| `GET/PUT` | `/:id/questionnaires` | Get or update questionnaires assigned to a plan |

### Questionnaires — `/api/questionnaires`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | List questionnaires |
| `POST` | `/` | Create questionnaire |
| `PUT` | `/:id` | Update questionnaire |
| `DELETE` | `/:id` | Delete questionnaire |

### AI Report Generation — `/api/ai`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/generate` | Generate a GPT-4 report from questionnaire responses |

### Reports — `/api/reports`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | List reports |
| `GET` | `/:id` | Get a report |

### Payments — `/api/stripe` and `/api/payment`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/stripe/create-payment-intent` | Create a Stripe payment intent |
| `GET` | `/payment-settings` | Get currency, VAT %, and Stripe public key |

### Other endpoints

| Prefix | Description |
|---|---|
| `/api/admin` | Admin user and data management |
| `/api/users` | User profile management |
| `/api/responses` | Questionnaire response submission and retrieval |
| `/api/prompt-templates` | CRUD for AI prompt templates per plan/questionnaire |
| `/api/settings` | Application settings (colours, branding, payment config) |
| `/api/pages` | CMS page content |
| `/api/upload` / `/api/upload` | File and image upload |
| `/api/dashboard` | Dashboard statistics |

---

## Authentication Flow

**Email / Password**
1. User registers → JWT issued → stored in `localStorage`
2. On login, JWT is returned and attached as `Authorization: Bearer <token>` on subsequent requests
3. Password reset uses a tokenised email link

**OAuth (Google / Facebook)**
1. User clicks social login → redirected to provider
2. On callback, if new user → redirected to `/pricing` with profile data pre-filled
3. User selects a plan → account created → JWT issued → redirected to dashboard
4. Existing user → last activity updated → JWT issued → redirected to dashboard

---

## AI Report Generation Flow

1. Admin creates a questionnaire and assigns it to a plan
2. Admin writes a prompt template for that plan + questionnaire combination (system prompt, general prompt, section definitions with shortcodes)
3. User completes the questionnaire
4. Frontend calls `POST /api/ai/generate` with the user's responses and their plan ID
5. Backend fetches the matching prompt template from the database
6. Backend resolves any referenced questionnaires (cross-questionnaire context)
7. A structured prompt is assembled and sent to GPT-4
8. GPT-4 returns a JSON payload with text, chart, and table sections
9. The report is saved to the database and rendered in the frontend using dynamic report components

---

## Subscription & Payment Flow

1. User selects a plan on the Pricing page
2. **Free plan** → account created immediately, welcome email sent
3. **Paid plan** → temporary registration stored, user redirected to Payment page
4. Payment page loads Stripe configuration dynamically from the database (currency, VAT, keys)
5. User completes Stripe Checkout
6. On payment success → full account created, subscription activated, confirmation email sent

---

## Admin Panel Routes

| Path | Description |
|---|---|
| `/admin` | Dashboard — stats overview |
| `/admin/users` | User management |
| `/admin/users/:id` | Customer detail view |
| `/admin/plans` | Subscription plans list |
| `/admin/plans/create` | Create new plan |
| `/admin/plans/edit/:id` | Edit plan |
| `/admin/plans/:planId/prompts` | Prompt templates for a plan |
| `/admin/plans/:planId/prompts/new` | New prompt template |
| `/admin/plans/:planId/prompts/edit/:promptId` | Edit prompt template |
| `/admin/plans/:planId/reports` | Report template editor |
| `/admin/form-builder` | Questionnaire list |
| `/admin/form-builder/:action/:id?` | Create/edit questionnaire |
| `/admin/chatgpt` | ChatGPT integration settings |
| `/admin/page-editor` | CMS page editor |
| `/admin/reports` | All generated reports |
| `/admin/settings` | App settings (branding, payments, currency) |

---

## Environment Variables Reference

### Frontend (`.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | MySQL database name |
| `DB_PORT` | MySQL port (default: `3306`) |
| `JWT_SECRET` | Secret key for JWT signing |
| `PORT` | Backend server port (default: `4000`) |
| `FRONTEND_URL` | Frontend origin for OAuth redirects |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 |
| `STRIPE_SECRET_KEY` | Stripe secret key (can also be set via Admin UI) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `FACEBOOK_APP_ID` | Facebook OAuth app ID |
| `FACEBOOK_APP_SECRET` | Facebook OAuth app secret |

> Payment configuration (currency, VAT, Stripe keys) can also be managed entirely through **Admin > Settings > Payments** — no restart required.

---

## Social Login Setup

See [`docs/SOCIAL_LOGIN_SETUP.md`](docs/SOCIAL_LOGIN_SETUP.md) for full instructions on configuring Google and Facebook OAuth credentials.

---

## Questionnaire Import

Questionnaires can be bulk-imported from `.txt` or `.csv` files via the Form Builder. See [`docs/QUESTIONNAIRE_IMPORT.md`](docs/QUESTIONNAIRE_IMPORT.md) for the file format specification.

---

## License

Private — all rights reserved.
