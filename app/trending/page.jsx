/**
 * /trending — what whales moved into and out of in the last 24 h (server-
 * rendered from the dashboard's net-flow snapshot, regenerated every 60 s),
 * then price movers and what is trending on X, all as cards.
 */
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { loadWhaleRotation } from '@/lib/trending/whaleRotation'
import { Page, Container, PageTitle, TitleText } from './primitives'
import WhaleRotationPanel from './WhaleRotationPanel'
import MoversPanel from './MoversPanel'
import SentimentPanel from './SentimentPanel'

export const revalidate = 60

export default async function TrendingPage() {
  const rotation = await loadWhaleRotation(supabaseAdmin).catch((err) => {
    console.error('[trending] whale rotation failed:', err?.message || err)
    return null
  })
  return (
    <Page>
      <Container>
        <PageTitle>
          <TitleText>Trending</TitleText>
        </PageTitle>
        <WhaleRotationPanel rotation={rotation} />
        <MoversPanel />
        <SentimentPanel />
      </Container>
    </Page>
  )
}
