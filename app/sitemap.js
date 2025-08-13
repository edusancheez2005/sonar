export default function sitemap() {
  const base = 'https://www.sonartracker.io'
  return [
    { url: `${base}/`, changeFrequency: 'hourly', priority: 1.0 },
    { url: `${base}/statistics`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/news`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${base}/dashboard`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${base}/ai-advisor`, changeFrequency: 'weekly', priority: 0.4 },
  ]
} 