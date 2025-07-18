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
    speak_as_default boolean DEFAULT false,
    is_legacy boolean DEFAULT false,
    is_memorialized boolean DEFAULT false,
    date_of_passing date,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Posts table (video uploads with captions)
CREATE TABLE posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id uuid REFERENCES pets(id) ON DELETE CASCADE,
    group_id uuid REFERENCES groups(id),
    video_url text NOT NULL,
    caption text,
    tag text,
    is_pinned boolean DEFAULT false,
    pin_type text CHECK (pin_type IN ('zoomie','pawstory')),
    is_pet_speaking boolean DEFAULT false,
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

CREATE TABLE pawflowers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    memorial_id uuid REFERENCES memorials(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id),
    message text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE pawflowers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read pawflowers" ON pawflowers FOR SELECT USING (true);
CREATE POLICY "insert pawflower" ON pawflowers FOR INSERT WITH CHECK (auth.uid() = user_id);

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

-- Social groups for chats and shared posts
CREATE TABLE groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    is_public boolean DEFAULT true,
    is_cause boolean DEFAULT false,
    is_donation_group boolean DEFAULT false,
    donation_group_id uuid REFERENCES donation_groups(id),
    pinned_post_id uuid REFERENCES posts(id),
    creator_id uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id),
    pet_id uuid REFERENCES pets(id),
    joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX group_members_unique ON group_members(group_id, user_id);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read groups" ON groups FOR SELECT USING (true);
CREATE POLICY "creator manage group" ON groups FOR UPDATE USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "logged in create group" ON groups FOR INSERT WITH CHECK (auth.uid() = creator_id);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view" ON group_members FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.is_public));
CREATE POLICY "join group" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id),
    pet_id uuid REFERENCES pets(id),
    is_pet_speaking boolean DEFAULT false,
    message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group members access messages" ON chat_messages
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id AND
    (pet_id IS NULL OR EXISTS (SELECT 1 FROM pets p WHERE p.id = pet_id AND p.user_id = auth.uid()))
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


CREATE TABLE donations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_group_id uuid REFERENCES donation_groups(id) ON DELETE CASCADE,
    donor_email text,
    donor_name text,
    amount numeric,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read donations" ON donations FOR SELECT USING (true);
CREATE POLICY "allow insert donations" ON donations FOR INSERT WITH CHECK (true);


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
