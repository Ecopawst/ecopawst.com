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
Tables `groups`, `group_members`, and `chat_messages` power the group chat system.
Posts and chat messages include an `is_pet_speaking` flag so guardians can post in their pet's voice.
Each pet record has a `speak_as_default` option to remember if it should be selected automatically when chatting or posting.

## Routes

- `/login` – sign in or create an account
- `/create-pet` – form to create a new pet profile
- `/upload` – upload a video linked to one of your pets
- `/feed` – view the Zoomie feed of posts
- `/chat` – list chat groups
- `/chat/[group_id]` – group messaging view
- `/donate/[group_id]` – donation group page
- `/memorials/[pet_id]` – memorial page for a pet
- `/me` – dashboard showing your pets
- `/pets/[pet_id]` – public pet profile
- `/pets/[pet_id]/gallery` – media gallery for a pet
- `/pawstory/[pet_id]` – timeline of a pet's journey
- `/groups` – list of public groups
- `/groups/create` – create a new group
- `/groups/[group_id]` – group detail and chat
- `/admin` – admin-only panel
- `/admin/bugs` – recent bug reports for admins

## Environment Variables

`client/.env.local.example` and `server/.env.example` list required variables including Supabase keys, Cloudflare token, Cloudflare account ID, and Stripe keys.

Future placeholders are included for planned features like AI pet voice playback and a memory chain.

### Shared Login Across Apps
If you plan to host multiple EcoAlaxy applications, configure Supabase auth to
use a shared cookie domain so users stay signed in across all services. Set
`NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN` in `.env.local` to your domain (for example
`\.ecoalaxy.com`) and the client will pass it to the Supabase SDK.
