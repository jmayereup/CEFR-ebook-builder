# PocketBase Collection Schema

Maps the existing Firestore data model to PocketBase collections.

> [!IMPORTANT]
> PocketBase stores documents as rows with typed fields.  Complex nested objects (chapters, streaks, vocabulary…) are stored as **JSON fields** — identical to how Firestore embeds them — so the existing app logic requires minimal change.

---

## 1. `users` (Auth Collection)

PocketBase has a built-in **auth** collection called `users`. Extend it with the custom profile fields below.

> [!NOTE]
> PocketBase auto-generates an `id` (15-char CUID) for every record. This becomes the `userId` / `uid` used everywhere in the app.

### Built-in fields (keep defaults)
| Field | PB type | Notes |
|-------|---------|-------|
| `id` | auto | Maps to `user.uid` |
| `email` | email | Auth email |
| `emailVisibility` | bool | Set `true` to expose email |
| `verified` | bool | Email verified flag |
| `name` | text | Maps to `displayName` |
| `avatar` | file | Profile photo (or use `photoUrl` text below) |

### Custom fields to add
| Field | PB type | Required | Notes |
|-------|---------|----------|-------|
| `photoUrl` | url | No | Google OAuth photo URL — easier than uploading a file |
| `isPaid` | bool | Yes | Default `false` |
| `isAdmin` | bool | Yes | Default `false` — toggle in PB Admin UI |
| `savedVocab` | json | Yes | `VocabularyTerm[]` — default `[]` |
| `lookupLimitData` | json | No | `{ count, date }` or `null` |
| `generationLimitData` | json | No | `{ freeModelCount, monthlyCreditsUsed, monthlyCreditsMonth, date }` or `null` |
| `bookshelf` | json | Yes | `string[]` of story IDs — default `[]` |
| `recentlyRead` | json | Yes | `{ storyId, chapterIdx }[]` — default `[]` |
| `streak` | json | No | Full `UserStreakData` object or `null` |

### API Rules
```
// List / Search
@request.auth.id != "" && @request.auth.id = id

// View
@request.auth.id != "" && @request.auth.id = id

// Create  (PocketBase handles this through auth registration)
""

// Update  — own record only, or admin
@request.auth.id != "" && (@request.auth.id = id || @request.auth.record.isAdmin = true)

// Delete  — admin only
@request.auth.record.isAdmin = true
```

---

## 2. `stories`

Stores the full story document including all embedded chapters.

### Fields
| Field | PB type | Required | Notes |
|-------|---------|----------|-------|
| `id` | text | Yes | **Use the existing app-generated ID** (nanoid string) so localStorage cache keys stay valid — set this explicitly on create |
| `title` | text | Yes | |
| `language` | text | Yes | e.g. `"Spanish"` |
| `cefrLevel` | text | Yes | e.g. `"B1"` |
| `genre` | text | Yes | e.g. `"mystery"` |
| `totalChapters` | number | Yes | |
| `chapters` | json | Yes | `Chapter[]` — default `[]` |
| `chaptersCount` | number | No | Derived — update on chapter append |
| `wordCount` | number | No | Derived — update on chapter append |
| `createdAt` | text | Yes | ISO date string (keeps Firestore format) |
| `isCompleted` | bool | Yes | Default `false` |
| `isPublic` | bool | Yes | Default `false` |
| `creatorId` | relation → `users` | Yes | PocketBase relation field |
| `creatorEmail` | text | No | Denormalized for server-side filtering |
| `promptNotes` | text | No | |
| `chapterLength` | number | No | Target words per chapter |
| `outline` | text | No | Long text, the chapter-by-chapter plan |
| `description` | text | No | Short blurb |
| `model` | text | No | OpenRouter model ID |
| `thinkingLevel` | text | No | |
| `thinkingBudget` | number | No | |
| `temperature` | number | No | |
| `translationLanguage` | text | No | |
| `initialTotalChapters` | number | No | |
| `initialCreditsEstimate` | number | No | |
| `creditsCharged` | number | No | Default `0` |
| `regenerationsCount` | number | No | Default `0` |
| `ratings` | json | No | `Record<string, number>` — `{ [userId]: 1-5 }` |
| `storyBible` | json | No | `StoryBible` object |
| `consistencyAudits` | json | No | `ConsistencyAudit[]` |
| `toneRefreshGuidance` | text | No | |

> [!IMPORTANT]
> **Custom ID strategy** — PocketBase normally auto-generates IDs. To preserve your existing app-generated IDs (used as localStorage cache keys like `cefr_story_cache_<id>`), create the record using the PocketBase API with `id` set explicitly:
> ```ts
> pb.collection('stories').create({ id: story.id, ...fields })
> ```
> PocketBase accepts a custom `id` if you provide one at creation time.

### API Rules
```
// List public stories (browse page)
isPublic = true || @request.auth.id = creatorId

// View
isPublic = true || @request.auth.id = creatorId

// Create — must be authenticated
@request.auth.id != ""

// Update — creator or admin
@request.auth.id != "" && (@request.auth.id = creatorId || @request.auth.record.isAdmin = true)

// Delete — creator or admin
@request.auth.id != "" && (@request.auth.id = creatorId || @request.auth.record.isAdmin = true)
```

---

## 3. `generation_logs`

Admin-only diagnostic log of failed AI generation calls (written by the Express server, not the client).

### Fields
| Field | PB type | Required | Notes |
|-------|---------|----------|-------|
| `userId` | text | No | UID of the user who triggered the request |
| `userEmail` | text | No | Denormalized for display |
| `action` | text | Yes | e.g. `"generate-chapter"` |
| `model` | text | No | OpenRouter model ID |
| `errorMessage` | text | No | Long text |
| `timestamp` | text | Yes | ISO date string |
| `duration` | number | No | Milliseconds |
| `promptLength` | number | No | Characters |

### API Rules
```
// List / View — admin only
@request.auth.record.isAdmin = true

// Create — server writes only (use a service token / admin key)
""   // leave open but protect with server-side auth header

// Update / Delete — never
false
```

---

## Firestore → PocketBase Field Mapping Summary

| Firestore concept | PocketBase equivalent |
|---|---|
| Document ID (`doc.id`) | `record.id` (use custom ID on create for stories) |
| `users/{uid}` document | `users` auth record |
| `stories/{id}` document | `stories` record |
| Nested object field | `json` field |
| `arrayUnion` (consistency audits) | Read → push → write the `json` field |
| `ratings.${userId}` dynamic key | `json` field with the whole ratings object |
| `onSnapshot` listener | PocketBase real-time: `pb.collection('stories').subscribe('*', fn)` |
| Security rules file | Per-collection API Rules in PB Admin UI |
| Firebase Admin SDK (server) | PocketBase JS SDK with an **admin token** |

---

## Notable Differences to Handle in `PocketBaseService`

1. **`fetchStoriesMetadata`** — the Express server cache (`/api/stories/metadata`) can be replaced with a direct PocketBase query for public stories with `fields` projection (only fetch non-chapter fields):
   ```ts
   pb.collection('stories').getList(1, 100, {
     filter: 'isPublic = true',
     fields: 'id,title,language,cefrLevel,genre,totalChapters,chaptersCount,wordCount,createdAt,isCompleted,creatorId,creatorEmail,ratings,description',
     sort: '-createdAt',
   })
   ```

2. **`rateStory`** — PocketBase has no `FieldValue.increment` or partial-key update. Read the record → merge the rating → write back:
   ```ts
   const record = await pb.collection('stories').getOne(storyId, { fields: 'ratings' });
   const ratings = { ...(record.ratings ?? {}), [userId]: rating };
   await pb.collection('stories').update(storyId, { ratings });
   ```

3. **Streak logic** — All streak mutation methods read the `streak` JSON field, mutate it in memory, and write it back in one `update`. This is equivalent to what the Firestore implementation does.

4. **`addConsistencyAudit`** — No `arrayUnion`. Read `consistencyAudits` array, push the new audit, write back.

5. **Auth** — PocketBase uses email/password or OAuth2 flows. The `PocketBaseAuthService.signIn()` would call `pb.collection('users').authWithOAuth2({ provider: 'google' })`.

6. **`syncUserProfile`** — On first login, create a new `users` record (PB handles this automatically via OAuth registration). On subsequent logins, patch the `name` and `photoUrl` fields.
