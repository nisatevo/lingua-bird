# LinguaBird

LinguaBird is an interactive language-learning platform designed to make learning languages engaging, structured, and accessible.

## Table of Contents

* [Folder Structure](#folder-structure)
* [Getting Started](#getting-started)
* [Tech Stack](#tech-stack)
* [Contributing](#contributing)
* [Acknowledgements](#acknowledgements)
* [Learn More](#learn-more)
* [Deploy on Vercel](#deploy-on-vercel)

## Folder Structure

```text
LinguaBird/
  |- actions/
  |-- challenge-progress.ts
  |-- user-progress.ts
  |-- user-subscription.ts
  |- app/
  |-- (auth)/
  |-- (main)/
  |-- (marketing)/
  |-- admin/
  |-- api/
  |-- lesson/
  |-- apple-icon.png
  |-- favicon.ico
  |-- globals.css
  |-- icon1.png
  |-- icon2.png
  |-- layout.tsx
  |- components/
  |-- modals/
  |-- ui/
  |-- banner.tsx
  |-- feed-wrapper.tsx
  |-- mobile-header.tsx
  |-- mobile-sidebar.tsx
  |-- promo.tsx
  |-- quests.tsx
  |-- sidebar-item.tsx
  |-- sidebar.tsx
  |-- sticky-wrapper.tsx
  |-- user-progress.tsx
  |- config/
  |-- index.ts
  |- db/
  |-- drizzle.ts
  |-- queries.ts
  |-- schema.ts
  |- lib/
  |-- admin.ts
  |-- stripe.ts
  |-- utils.ts
  |- public/
  |- scripts/
  |-- prod.ts
  |- store/
  |-- use-exit-modal.ts
  |-- use-hearts-modal.ts
  |-- use-practice-modal.ts
  |- .gitignore
  |- .prettierrc.json
  |- components.json
  |- constants.ts
  |- drizzle.config.ts
  |- environment.d.ts
  |- eslint.config.mjs
  |- next.config.ts
  |- package.json
  |- pnpm-lock.yaml
  |- pnpm-workspace.yaml
  |- postcss.config.js
  |- proxy.ts
  |- tailwind.config.ts
  |- tsconfig.json
  |- vercel.ts
```

## Getting Started

### Prerequisites

Make sure the following are installed on your computer:

* Git
* Node.js
* pnpm

### 1. Clone the Repository

Clone the LinguaBird repository to your local computer.

```bash
git clone <your-repository-url>
cd LinguaBird
```

### 2. Create the Environment File

Create a `.env` file in the root directory of the project.

```env
# Disable Next.js telemetry
NEXT_TELEMETRY_DISABLED=1

# Clerk authentication keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Neon database
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/lingo?sslmode=require"

# Stripe
STRIPE_API_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Public application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk admin user IDs
# Multiple IDs can be separated by commas
CLERK_ADMIN_USER_IDS=
```

### 3. Configure Clerk

Create or access your Clerk account and obtain the following authentication keys:

* `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
* `CLERK_SECRET_KEY`

Add these values to your `.env` file.

### 4. Configure the Database

LinguaBird uses PostgreSQL through Neon.

Create a PostgreSQL database and obtain its connection URL.

Replace the following placeholders with your actual database credentials:

```text
<user>
<password>
<host>
<port>
```

The connection URL should follow this format:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/lingo?sslmode=require"
```

### 5. Configure Stripe

If Stripe functionality is enabled in your installation, obtain the required Stripe credentials and add them to the `.env` file:

```env
STRIPE_API_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Keep these credentials private and never commit them to GitHub.

### 6. Configure the Application URL

For local development, use:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

When deploying the application, replace this with your deployed application URL.

### 7. Configure Admin Users

Add the Clerk user ID of each administrator to:

```env
CLERK_ADMIN_USER_IDS=
```

For multiple administrators, separate the user IDs with commas.

Example:

```env
CLERK_ADMIN_USER_IDS=user_123,user_456,user_789
```

### 8. Install Dependencies

Install all project dependencies using pnpm:

```bash
pnpm install
```

### 9. Initialize the Database

Push the database schema and seed the database:

```bash
pnpm run db:push && pnpm run db:prod
```

The seed script populates the database with the required challenge data.

### 10. Start the Development Server

Start LinguaBird in development mode:

```bash
pnpm dev
```

The application will normally be available at:

```text
http://localhost:3000
```

## Tech Stack

LinguaBird is built using the following technologies:

* Next.js
* React
* TypeScript
* Tailwind CSS
* PostgreSQL
* Drizzle ORM
* Clerk
* Stripe
* Vercel
* React Admin
* Zustand
* Radix UI

## Environment Variables

The following environment variables may be required for the application:

| Variable                            | Purpose                                |
| ----------------------------------- | -------------------------------------- |
| `NEXT_TELEMETRY_DISABLED`           | Disables Next.js telemetry             |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public authentication key        |
| `CLERK_SECRET_KEY`                  | Clerk server-side authentication key   |
| `DATABASE_URL`                      | PostgreSQL database connection         |
| `STRIPE_API_SECRET_KEY`             | Stripe API authentication              |
| `STRIPE_WEBHOOK_SECRET`             | Stripe webhook verification            |
| `NEXT_PUBLIC_APP_URL`               | Public application URL                 |
| `CLERK_ADMIN_USER_IDS`              | IDs of users with administrator access |

**Important:** Never commit your `.env` file or expose API keys, database credentials, authentication secrets, or webhook secrets publicly.

## Contributing

Contributions and improvements are welcome.

If you find a bug or have an idea for improving LinguaBird:

1. Create a fork of the repository.
2. Create a new branch for your changes.
3. Make your changes.
4. Test the application.
5. Commit your changes.
6. Create a pull request.

## Acknowledgements

LinguaBird was developed using various open-source libraries, frameworks, and resources.

Special thanks to the resources and technologies that contributed to the project:

* Code with Antonio
* Kenney Assets
* Freesound
* ElevenLabs
* Flagpack

## Learn More

To learn more about the technologies used in LinguaBird, refer to their official documentation:

* Next.js
* React
* TypeScript
* Tailwind CSS
* PostgreSQL
* Drizzle ORM
* Clerk
* Stripe

## Deploy on Vercel

LinguaBird can be deployed using Vercel.

Before deploying, make sure all required environment variables are configured in the Vercel project settings.

After deployment, update:

```env
NEXT_PUBLIC_APP_URL
```

to the URL of your deployed application.

## License

This project is provided for educational and development purposes.

---

**LinguaBird** — Learn languages. Build skills. Keep growing.
