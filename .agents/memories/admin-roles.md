# Developer Memory: Admin and Superuser Roles

This document details the admin and superuser authentication model used in the project.

## 1. Admin Role (Users Collection)
- A regular user can be granted administrator privileges within the application.
- This is indicated by the `isAdmin` boolean flag on the user record (in the `users` collection) being set to `true`.
- In the frontend code, admin access is checked by verifying the `isAdmin` boolean flag on the user record: `currentUser?.isAdmin === true`. Hardcoded email checks have been removed from the application.
- Admins bypass tier-based chapter generation limits (e.g., generating more than 10 chapters) and gain access to the Admin Dashboard.

## 2. Superuser Role (PocketBase Server)
- System-level operations (such as saving generation logs and syncing profile updates from secure server routes) require Superuser authentication.
- For newer PocketBase versions (v0.23+), superuser authentication is performed against the `_superusers` collection:
  ```typescript
  await pb.collection('_superusers').authWithPassword(email, password);
  ```
- For legacy PocketBase versions, authentication was handled via the `pb.admins` object:
  ```typescript
  await pb.admins.authWithPassword(email, password);
  ```
- When authenticating in secure node environments, always use a fallback check to ensure compatibility with both versions.
