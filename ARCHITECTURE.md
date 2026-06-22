# System Architecture: CEFR Language Story Generator

This document details the high-level architecture, client-server boundaries, routing structure, provider-neutral design patterns, and the **Metadata Read Caching and Optimization System** of the CEFR Language Story Generator application.

---

## 1. High-Level Architecture

The application is built on a split Client/Server architecture to isolate heavy logic (like AI prompt building, text-to-speech checks, and glossary exports) from the user interface. It utilizes abstracted data and authentication service layers on the frontend to remain database and authentication provider agnostic, allowing easy porting to alternative backends.

```mermaid
graph TD
    subgraph Client Browser
        App([App.tsx]) --> Browse[BrowsePage.tsx]
        App --> Bookshelf[BookshelfPage.tsx]
        App --> Create[CreatePage.tsx]
        App --> Reader[ReaderPage.tsx]
        App --> Admin[AdminUsersDashboard.tsx]
        
        LocalCache[(localStorage)] <--> App
        App --> IAuth[IAuthService]
        App --> IDB[IDatabaseService]
    end
    
    subgraph Express Server
        Server[server.ts] --> Routes[API Route Routers]
        Routes --> Chapter[generate-chapter]
        Routes --> Outline[generate-outline]
        Routes --> Batch[generate-batch]
        Routes --> Glossary[generate-glossary]
        
        MetadataCache[In-Memory publicStoriesCache] <--> Server
        DiskBackupCache[(.metadata-cache-pb.json)] <--> Server
    end
    
    subgraph Backend Services
        direction TB
        subgraph PocketBase Provider (Default)
            PB_Client[PocketBase Client SDK]
            PocketBase[(PocketBase DB & Auth)]
            PB_Client <--> PocketBase
        end
        
        subgraph Alternative Provider (Abstracted)
            Alt_Client[Alternative Client SDK]
            Alt_DB[(Alternative DB & Auth)]
            Alt_Client <--> Alt_DB
        end
    end

    IAuth -.-> PB_Client
    IAuth -.-> Alt_Client
    IDB -.-> PB_Client
    IDB -.-> Alt_Client
    Server --> PocketBase
    Routes --> LLM[Gemini / OpenRouter API]
```

---

## 2. Abstracted Service Layer Architecture

To avoid coupling to vendor-specific SDKs, the frontend delegates all database and authentication operations to abstract interfaces. PocketBase is the default backend, but the architecture makes it easy to swap or port the system to any other provider by implementing the defined contracts.

### A. Authentication Abstraction (`IAuthService`)
The authentication layer is defined by the [IAuthService](file:///home/jmayer/Dev/CEFR-Language-Story-Generator/src/services/auth/AuthService.ts) interface.
* **Active Implementation**:
  * [PocketBaseAuthService](file:///home/jmayer/Dev/CEFR-Language-Story-Generator/src/services/auth/PocketBaseAuthService.ts): Uses the PocketBase JS SDK for email-password or OAuth2 authentication.
* **Easy Porting**: To connect a new authentication provider (e.g., Supabase, Auth0, Custom DB), create a new class implementing `IAuthService` and update [src/services/auth/index.ts](file:///home/jmayer/Dev/CEFR-Language-Story-Generator/src/services/auth/index.ts) to export it.

### B. Database Abstraction (`IDatabaseService`)
The database operations (handling stories metadata, bookshelf updates, dictionary lookups, and user streak computations) are defined by the [IDatabaseService](file:///home/jmayer/Dev/CEFR-Language-Story-Generator/src/services/db/DatabaseService.ts) interface.
* **Active Implementation**:
  * [PocketBaseService](file:///home/jmayer/Dev/CEFR-Language-Story-Generator/src/services/db/PocketBaseService.ts): Communicates with the PocketBase server, robustly decoding stringified JSON objects and handling relational updates.
* **Easy Porting**: To use a different database, implement `IDatabaseService` and update the default export in [src/services/db/index.ts](file:///home/jmayer/Dev/CEFR-Language-Story-Generator/src/services/db/index.ts).

---

## 3. Caching & Database Read Optimization

To prevent high read costs on database backends (like PocketBase or alternative databases), the system implements a multi-layered caching policy across the Client and Express Server.

### A. Client-Side Browser Caching
* **Full Story Caching**: When a user selects a story to read, the client checks the browser's `localStorage` (`cefr_story_cache_[id]`). If found and the chapters match, the story loads instantly with **0 database reads**.
* **Single-Doc Fetch**: If the story is not in `localStorage`, the client fetches only that specific story document by ID (`getDoc` / `getOne`) $\rightarrow$ **exactly 1 read** (instead of reading all stories).
* **Recently Read & Streaks**: The client maintains the user's active reading progress in lightweight client states to avoid redundant writes.

### B. Server-Side Metadata Caching
The Express server maintains a lightweight in-memory cache (`storiesMetadataCache`) representing public stories metadata. When a user browses public stories, they hit the `/api/stories/metadata` route, which serves this list instantly from memory with **0 database reads**.

To manage cache updates efficiently, the server uses three mechanisms:

#### 1. File-Based Backup Cache (Cold Start Protection)
To protect against high read spikes when the Express server restarts (e.g. during development hot-reloads), the server persists its in-memory metadata cache to disk:
* **Startup**: The server attempts to load `.metadata-cache-pb.json` from the filesystem. If found $\rightarrow$ **0 database reads**. If not found $\rightarrow$ the server performs a full fetch from the database and saves it.
* **Saves**: Every time the in-memory cache is modified, it is serialized back to the disk file.

#### 2. Incremental Cache Updates ($O(1)$ Complexity)
All database writes go directly from the client to the database. Instead of setting up expensive real-time database listeners, the client signals updates to the server endpoint `/api/stories/metadata?refresh=true`:
* **Creation/Update (`storyId`)**: When a story is created, edited, rated, or made public, the client sends `/api/stories/metadata?refresh=true&storyId=[id]`. The server performs a single document fetch by ID (**1 read**) and merges/inserts it into the cache.
* **Deletion (`deleteId`)**: When a story is deleted or made private, the client sends `/api/stories/metadata?refresh=true&deleteId=[id]`. The server filters the story out in memory with **0 reads**.

#### 3. Bounded Revalidation & Admin Reset Override
* **24-Hour Expiry**: If no changes occur, the server re-validates the cache against the database at most once every 24 hours. To prevent scale issues, this periodic query is limited to the **100 most recent public stories**.
* **Force-All Admin Override**: A **Reset Metadata Cache** button in the Admin Dashboard makes a GET request with `?refresh=true&forceAll=true` to force a full re-fetch of all public documents without a limit to rebuild the cache from scratch.

---

## 4. Guide: Adding or Removing LLM Models

The application uses OpenRouter to communicate with various language models. To add or remove a model, follow the checklist below to update the configurations across the client and server.

### Checklist for Adding a Model

1. **Define the Model Option**
   * Edit [src/constants/models.ts](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/constants/models.ts).
   * Add a new `GeminiModelOption` configuration object to the `GEMINI_MODELS` array.
   * Provide the following parameters:
     * `id`: The exact model identifier on OpenRouter (e.g., `'provider/model-name'`).
     * `name`: The human-readable label shown in selection dropdowns.
     * `inputCost1M` / `outputCost1M`: The OpenRouter API pricing per 1 million tokens (used for credit cost estimations).
     * `category`: `'flash'` (faster/cheaper) or `'pro'` (nuanced/creative).
     * `supportsThinkingLevel`: `true` if it supports reasoning controls via thinking level properties.
     * `supportsThinkingBudget`: `true` if it supports custom reasoning budgets (in tokens).
     * `supportsTemperature`: `true` if the model accepts temperature variation (standard for non-thinking models, or when thinking is disabled).
     * `maxOutputTokens`: Upper limit of completion tokens (usually `8192` or `4096`).

2. **Register Recommendations**
   * Edit [src/components/StoryConfigForm.tsx](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/components/StoryConfigForm.tsx).
   * Inside `MODEL_RECOMMENDATIONS`, add the new model ID with a rating (`'Best'` or `'Good'`) and a list of target languages it performs best in.

3. **Update UI Details and Verdicts**
   * Edit [src/components/creator/ModelSelectionModal.tsx](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/components/creator/ModelSelectionModal.tsx).
   * Inside the `MODEL_DETAILS` dictionary, add a custom description (`verdict`) and its optimized languages to show in the information modal.

4. **Update Provider Categorization (Optional)**
   * Edit `getModelBaseName` in [src/utils/modelUtils.ts](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/utils/modelUtils.ts).
   * Add a keyword check if you want the model to map to a specific provider string (e.g., `'DeepSeek'`, `'Kimi'`, `'Llama'`) instead of falling back to `'GPT'`.

5. **Reasoning Toggle Handling**
   * If the model uses a simplified reasoning toggle (like DeepSeek or Kimi, where it's either fully Enabled or Disabled rather than having multiple detailed levels), update the `isSimpleThinking` check in [src/components/StoryConfigForm.tsx](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/components/StoryConfigForm.tsx) to include its ID/keyword.

### Checklist for Removing a Model

1. **Delete from Definitions**: Remove the model option from `GEMINI_MODELS` in [src/constants/models.ts](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/constants/models.ts).
2. **Remove Recommendations & Details**: Clean up its entry in `MODEL_RECOMMENDATIONS` inside [src/components/StoryConfigForm.tsx](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/components/StoryConfigForm.tsx) and the `MODEL_DETAILS` entry in [src/components/creator/ModelSelectionModal.tsx](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/components/creator/ModelSelectionModal.tsx).
3. **Verify Code References**: Ensure the model is not set as the default model in server route fallbacks (e.g., in [src/server/routes/chapter.ts](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/server/routes/chapter.ts) or [src/utils/creditCalculation.ts](file:///home/jmayer/Documents/Dev/CEFR-Language-Story-Generator/src/utils/creditCalculation.ts)).
