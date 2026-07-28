# CEFR Language Story Generator

An AI-powered application designed to generate, rate, and read personalized graded CEFR-level stories in multiple languages. It features interactive dictionary lookups, vocabulary matching games, reading streak tracking, and multiple AI model support.

---

## 1. Abstracted & Port-Ready Architecture

The application is built on an abstracted **database-neutral and authentication-neutral** service layer. 

- **PocketBase** is the default database and authentication backend used by the application, running both in the client and on the server.
- **Abstract Service Interfaces**: All database and auth operations are decoupled from vendor-specific SDKs using clean interfaces (`IDatabaseService` and `IAuthService`). This makes it exceptionally easy to port the application to another backend provider (such as Supabase, a custom PostgreSQL database, or any other DB/Auth system) by simply implementing these interfaces.

To swap the backend implementation:
1. Implement the `IAuthService` interface defined in [src/services/auth/AuthService.ts](file:///home/jmayer/Dev/CEFR-Language-Story-Generator/src/services/auth/AuthService.ts).
2. Implement the `IDatabaseService` interface defined in [src/services/db/DatabaseService.ts](file:///home/jmayer/Dev/CEFR-Language-Story-Generator/src/services/db/DatabaseService.ts).
3. Update the active provider export in [src/services/auth/index.ts](file:///home/jmayer/Dev/CEFR-Language-Story-Generator/src/services/auth/index.ts) and [src/services/db/index.ts](file:///home/jmayer/Dev/CEFR-Language-Story-Generator/src/services/db/index.ts).

---

## 2. Configuration & Environment Variables

Create a `.env` file in the root directory.

### PocketBase Setup
```env
VITE_POCKETBASE_URL=https://your-pocketbase-domain.com
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=your_admin_password
```

### AI Model & Cover Image configuration (OpenRouter)
```env
# API Key for OpenRouter integration
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional: Model to use for generating book covers (defaults to google/gemini-3.1-flash-lite-image)
COVER_IMAGE_MODEL=google/gemini-3.1-flash-lite-image
```

---

## 3. Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)

### Run Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure your environment**:
   Create a `.env` file based on the details above or rename `.env.example`.

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The app will run locally with hot module reloading.

4. **Verify / Build**:
   To test the production build locally (client + SSR Express server):
   ```bash
   npm run build
   ```

---

## 4. CLI Scripts

The project includes CLI commands to generate book covers in batch:

* **Full Cover Generation Run**:
  Attempts to generate covers for all completed stories that do not yet have one:
  ```bash
  npm run generate-covers
  ```
* **Test Cover Generation Run**:
  Runs generation on up to 2 eligible stories to test the OpenRouter connection and image processing:
  ```bash
  npm run generate-covers:test
  ```

### Copyright Guard Scripts

* **Schema migration** (adds `copyrightFlag*` fields and hardening API rules to the stories collection):
  ```bash
  npm run migrate:copyright-schema
  ```
* **Backfill dry run** (scans existing public stories for copyrighted/fan-fiction content and prints a report without writing anything):
  ```bash
  npm run flag-copyright:dry
  ```
* **Backfill live run** (flags and privatizes suspected stories; reset the metadata cache afterwards):
  ```bash
  npm run flag-copyright
  ```