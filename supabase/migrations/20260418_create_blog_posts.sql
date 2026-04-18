-- Auto-generated blog posts table for whale reports
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'whale-report',
  tags text[] DEFAULT '{}',
  cover_image text,
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON blog_posts(published) WHERE published = true;
CREATE INDEX idx_blog_posts_created ON blog_posts(created_at DESC);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read blog posts" ON blog_posts FOR SELECT USING (published = true);
CREATE POLICY "Service role full access" ON blog_posts FOR ALL USING (auth.role() = 'service_role');
