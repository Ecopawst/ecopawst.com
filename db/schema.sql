-- Database schema for EcoPawst MVP

-- Users table: guardians and admins
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL CHECK (role IN ('guardian','admin')),
    avatar_url text,
    banned boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Pets table
CREATE TABLE pets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    breed text,
    age integer,
    rescue_story text,
    profile_image_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Posts table (video uploads with captions)
CREATE TABLE posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id uuid REFERENCES pets(id) ON DELETE CASCADE,
    video_url text NOT NULL,
    caption text,
    tag text,
    flagged boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Memorial pages for pets that passed
CREATE TABLE memorials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id uuid REFERENCES pets(id) ON DELETE CASCADE,
    tribute text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memorial_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
    comment text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Donation groups
CREATE TABLE donation_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    target_amount numeric,
    raised_amount numeric DEFAULT 0,
    price_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    members uuid[] DEFAULT ARRAY[]::uuid[]
);

CREATE TABLE chats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid REFERENCES chat_groups(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES users(id),
    message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Row level security policies
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage their pets" ON pets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage their posts" ON posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pets p WHERE p.id = pet_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM pets p WHERE p.id = pet_id AND p.user_id = auth.uid())
  );

ALTER TABLE memorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage memorials" ON memorials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pets p WHERE p.id = pet_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM pets p WHERE p.id = pet_id AND p.user_id = auth.uid())
  );

CREATE TABLE bugs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text,
    message text,
    stack text,
    context jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow bug insert" ON bugs FOR INSERT WITH CHECK (true);
CREATE POLICY "admin view bugs" ON bugs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

CREATE TABLE bug_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    type text,
    message text,
    stack text,
    context jsonb,
    resolved boolean DEFAULT false
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow bug insert" ON bug_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "admin view bugs" ON bug_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
