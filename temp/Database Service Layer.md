# Service Layer Walkthrough

## What was built

A provider-agnostic service layer that decouples the frontend from Firebase/Firestore, making it easy to swap to another backend (e.g. PocketBase, Supabase) by changing two factory files.

---

## New files

```
src/services/
  types.ts                        ← IUser interface + re-exported domain types
  auth/
    AuthService.ts                ← IAuthService interface
    FirebaseAuthService.ts        ← Firebase implementation (wraps lib/auth.ts)
    index.ts                      ← Factory + convenience re-exports
  db/
    DatabaseService.ts            ← IDatabaseService interface (25+ methods)
    FirestoreService.ts           ← Firestore implementation (wraps lib/firestore.ts)
    index.ts                      ← Factory + named re-exports
```

## Updated consumer imports (13 files)

All imports were redirected from `src/lib/auth` / `src/lib/firestore` → `src/services/auth` / `src/services/db`:

| File | Changed from |
|------|-------------|
| `src/store/authStore.ts` | `any` → `IUser \| null` for `currentUser` |
| `src/App.tsx` | `lib/auth`, `lib/firestore` |
| `src/hooks/useUserData.ts` | `lib/firestore` |
| `src/hooks/useLibrary.ts` | `lib/firestore` |
| `src/hooks/useStreak.ts` | `lib/auth` (db), `lib/firestore` |
| `src/hooks/useActiveStory.ts` | `lib/firestore` |
| `src/hooks/useUrlRouting.ts` | `lib/firestore` |
| `src/pages/CreatePage.tsx` | `lib/firestore` (type only) |
| `src/pages/BookshelfPage.tsx` | `lib/firestore` (type only) |
| `src/components/ReaderPanel.tsx` | `lib/firestore` |
| `src/components/reader/ChapterSidebar.tsx` | `lib/firestore` |
| `src/components/library/StreakDashboardCard.tsx` | `lib/firestore` (type only) |
| `src/components/AdminUsersDashboard.tsx` | `lib/auth` |

## Key design decisions

- **Zero logic moves** — `lib/auth.ts` and `lib/firestore.ts` remain unchanged as implementation details consumed by the service classes.
- **Backward-compatible exports** — the service `index.ts` files re-export identically-named functions, so no call-site logic changed — only import paths.
- **Admin detection** — the `FirebaseAuthService.syncUserProfile` now reads `isAdmin: boolean` from the user document instead of matching a hard-coded email address. New accounts default to `isAdmin: false`.
- **Debounced lookup-limit** — `saveUserLookupLimitDebounced` (previously exported from `lib/firestore` and called directly in `App.tsx`) is now owned by `FirestoreService` and re-exported through `services/db`.

## Validation

- `tsc --noEmit` passes with zero errors ✅
- Zero remaining `lib/auth` or `lib/firestore` imports in consumer code ✅

## How to add a new provider (e.g. PocketBase)

1. Create `src/services/auth/PocketBaseAuthService.ts` implementing `IAuthService`.
2. Create `src/services/db/PocketBaseService.ts` implementing `IDatabaseService`.
3. In `src/services/auth/index.ts` replace:
   ```ts
   const authService: IAuthService = new FirebaseAuthService();
   ```
   with:
   ```ts
   const authService: IAuthService = new PocketBaseAuthService();
   ```
4. In `src/services/db/index.ts` replace:
   ```ts
   const dbService: IDatabaseService = new FirestoreService();
   ```
   with:
   ```ts
   const dbService: IDatabaseService = new PocketBaseService();
   ```

No other files need to change.
