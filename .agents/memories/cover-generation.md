# Developer Memory: Book Cover Generation System

This document outlines the design decisions, dependencies, and integration paths for the automated book cover generation system.

## 1. Dependencies and Setup
- **sharp**: Native Node.js image processing library used to resize, crop, and convert raw images to optimized WebP. 
  - **Important**: Must remain under `"dependencies"` (not `"devDependencies"`) in `package.json` because it is required at server startup in production.
- **PocketBase SDK**: Used to fetch the story details (title, genre, description) before sending the cover generation request.
- **OpenRouter Image API**: Dispatches prompt generation requests to `https://openrouter.ai/api/v1/images`.

## 2. Server Integration
- **Router Path**: [src/server/routes/cover.ts](file:///var/home/jmayer/Dev/CEFR-ebook-builder/src/server/routes/cover.ts) mapped to `/api/stories/generate-cover`.
- **Directory Creation**: The server creates `public/covers` dynamically on startup if it does not exist.
  - **Permissions**: The application directory `/opt/cefr/public` must be owned by the user running the server (`ghost-mgr:ghost-mgr`). Ensure [deploy.sh](file:///var/home/jmayer/Dev/CEFR-ebook-builder/deploy.sh) maintains this ownership.
- **Processing Specs**:
  - Resized and cropped to exactly **480x672** (standard book aspect ratio `3:4.2` matching the frontend CSS `aspect-[3/4.2]`).
  - Saved as **WebP** with **80%** quality.
  - Saved directly to `/opt/cefr/public/covers/[storyId].webp`.

## 3. Frontend Integration
- **Reader Sidebar**: Triggered when a user clicks the "Regenerate Cover" button in [src/components/reader/ChapterSidebar.tsx](file:///var/home/jmayer/Dev/CEFR-ebook-builder/src/components/reader/ChapterSidebar.tsx).
- **Reader Display**: The cover is shown in [src/components/ReaderPanel.tsx](file:///var/home/jmayer/Dev/CEFR-ebook-builder/src/components/ReaderPanel.tsx) when reading Chapter 1.
- **SEO Preloading**: [src/hooks/useDocumentMetadata.ts](file:///var/home/jmayer/Dev/CEFR-ebook-builder/src/hooks/useDocumentMetadata.ts) preloads the dynamic cover URL (`/covers/[storyId].webp`) into Open Graph (`og:image`) and Twitter metadata tag definitions for rich link previews.

## 4. Troubleshooting
- **Bad Gateway (502)**: Typically occurs if the Node server crashes on startup. Check `journalctl -u cefr-story-generator` to check for `EACCES` errors (indicating incorrect ownership of `/opt/cefr/public`) or module loading errors.
- **OpenRouter Errors**: Check OpenRouter credit balance and that `COVER_IMAGE_MODEL` is a supported model on OpenRouter that accepts image generation parameters.
