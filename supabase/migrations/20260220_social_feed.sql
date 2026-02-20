-- Social Posts table — stores tweets/posts from LunarCrush
CREATE TABLE IF NOT EXISTS social_posts (
  id              BIGSERIAL PRIMARY KEY,
  post_id         TEXT NOT NULL,
  post_type       TEXT DEFAULT 'tweet',
  network         TEXT DEFAULT 'twitter',
  creator_id      TEXT,
  creator_name    TEXT,
  creator_screen_name TEXT,
  creator_followers INTEGER DEFAULT 0,
  creator_image   TEXT,
  title           TEXT,
  body            TEXT,
  url             TEXT,
  image           TEXT,
  sentiment       REAL,
  interactions    INTEGER DEFAULT 0,
  likes           INTEGER DEFAULT 0,
  retweets        INTEGER DEFAULT 0,
  replies         INTEGER DEFAULT 0,
  category        TEXT,
  tickers_mentioned JSONB,
  published_at    TIMESTAMPTZ,
  ingested_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, network)
);

CREATE INDEX IF NOT EXISTS idx_social_posts_published ON social_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_category ON social_posts(category);
CREATE INDEX IF NOT EXISTS idx_social_posts_creator ON social_posts(creator_screen_name);
CREATE INDEX IF NOT EXISTS idx_social_posts_interactions ON social_posts(interactions DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_ingested ON social_posts(ingested_at DESC);

-- Social Creators table — top crypto influencers/traders
CREATE TABLE IF NOT EXISTS social_creators (
  id              BIGSERIAL PRIMARY KEY,
  creator_id      TEXT NOT NULL,
  network         TEXT DEFAULT 'twitter',
  screen_name     TEXT,
  display_name    TEXT,
  followers       INTEGER DEFAULT 0,
  interactions_24h INTEGER DEFAULT 0,
  posts_24h       INTEGER DEFAULT 0,
  rank            INTEGER,
  profile_image   TEXT,
  galaxy_score    REAL,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, network)
);

CREATE INDEX IF NOT EXISTS idx_social_creators_interactions ON social_creators(interactions_24h DESC);
CREATE INDEX IF NOT EXISTS idx_social_creators_followers ON social_creators(followers DESC);
CREATE INDEX IF NOT EXISTS idx_social_creators_screen ON social_creators(screen_name);

-- AI Summaries table — LunarCrush AI "what's up" per topic
CREATE TABLE IF NOT EXISTS social_ai_summaries (
  id              BIGSERIAL PRIMARY KEY,
  topic           TEXT NOT NULL,
  summary         TEXT NOT NULL,
  generated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_ai_topic ON social_ai_summaries(topic, generated_at DESC);

-- RLS
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read social_posts" ON social_posts FOR SELECT USING (true);
CREATE POLICY "Service insert social_posts" ON social_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update social_posts" ON social_posts FOR UPDATE USING (true);

CREATE POLICY "Public read social_creators" ON social_creators FOR SELECT USING (true);
CREATE POLICY "Service insert social_creators" ON social_creators FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update social_creators" ON social_creators FOR UPDATE USING (true);

CREATE POLICY "Public read social_ai_summaries" ON social_ai_summaries FOR SELECT USING (true);
CREATE POLICY "Service insert social_ai_summaries" ON social_ai_summaries FOR INSERT WITH CHECK (true);
