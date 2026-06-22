# State Management Notes

## Zustand Stores (src/store/)
- **useAuthStore**: `currentUser`, `authChecking` — global auth state consumed anywhere needed
- **useUIStore**: `isOnline`, `customOpenRouterKey`, `translationTargetLanguage` — persisted to localStorage automatically

## Patterns
- Components consume stores directly via hooks instead of receiving these as props
- `App.tsx` still holds story/library/list-specific state (stories, bookshelf, recentlyRead, vocab, filters, etc.) as local state
- Generation logic remains in `useStoryGeneration` hook
- Future stores could be extracted for: `useStoryStore` (stories, selectedStory), `useStreakStore`, `useLibraryStore` (filters, search, sort)