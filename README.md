# EcoPawst Starter

This repository provides a minimal scaffold for the EcoPawst MVP using Next.js for the frontend, Express for backend API calls, and Supabase for database/authentication. Tailwind CSS is included for a mobile-first layout.

## Structure

- `client/` – Next.js application.
- `server/` – Express API that handles AI caption generation.
- `db/schema.sql` – Postgres schema for Supabase.

## Development

1. Copy `.env.local.example` inside `client/` and fill in your Supabase credentials.
2. Copy `.env.example` inside `server/` and add your keys.
3. Run `npm install` inside both `client/` and `server/` directories.
4. Start the backend server:
   ```bash
   cd server && npm start
   ```
5. In another terminal, start the Next.js dev server:
   ```bash
   cd client && npm run dev
   ```
6. Open `http://localhost:3000/login` to create or sign in to an account.

## Video Upload Flow

`client/pages/upload.js` shows a simplified approach for uploading a video to Cloudflare Stream. After storing the playback URL in the `posts` table, it calls the `/api/caption` route to trigger OpenAI caption generation.

The backend endpoint (`server/index.js`) receives the request, calls OpenAI, and updates the post with the generated caption in Supabase.

This setup is intentionally minimal to help you extend the platform quickly.

Row-level security policies in `db/schema.sql` ensure pets, posts, and memorials are only accessible by their owners.
The schema also includes a `bug_reports` table so EcoMaintainer can log error reports from the app.

## Routes

- `/login` – sign in or create an account
- `/create-pet` – form to create a new pet profile
- `/upload` – upload a video linked to one of your pets
- `/feed` – view the Zoomie feed of posts
- `/chat` – basic group chat
- `/donate/[group_id]` – donation group page
- `/memorials/[pet_id]` – memorial page for a pet
- `/me` – dashboard showing your pets
- `/pets/[pet_id]` – public pet profile
- `/pets/[pet_id]/gallery` – media gallery for a pet
- `/pawstory/[pet_id]` – timeline of a pet's journey
- `/groups` – list of donation groups
- `/admin` – admin-only panel
- `/admin/bugs` – recent bug reports for admins

## Environment Variables

`client/.env.local.example` and `server/.env.example` list required variables including Supabase keys, Cloudflare token, Cloudflare account ID, and Stripe keys.

Future placeholders are included for planned features like AI pet voice playback and a memory chain.

### Shared Login Across Apps
If you plan to host multiple EcoAlaxy applications, configure Supabase auth to
use a shared cookie domain such as `.ecoalaxy.com` so users stay signed in
across all services.
