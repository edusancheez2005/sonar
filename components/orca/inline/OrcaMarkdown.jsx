'use client'
// Single markdown renderer used by every ORCA surface (PersonalCopilotPanel,
// AskOrcaClient, ClientOrca, OrcaDrawer). Upgrades inline `<code>` spans
// into interactive PriceChip / WhaleChip / SentimentChip tiles, turns
// links in the "News and Market Impact" section into NewsCards, and
// renders any <!-- orca:chart … --> directives as an InlineChart block
// between paragraphs.
//
// Defensive by design: every override falls back to the original markdown
// element on detection failure. Never throws on render.
import React, { useMemo, useState, useCallback, useContext } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { InlineDataCtx } from './OrcaMarkdownContext'
import { classifyCodeSpan } from './parsers/classifyCodeSpan'
import { extractTickerContext } from './parsers/extractTickerContext'
import { extractChartDirective, stripChartDirectives } from './parsers/extractChartDirective'
import { PriceChip } from './PriceChip'
import { WhaleChip } from './WhaleChip'
import { SentimentChip } from './SentimentChip'
import { NewsCard } from './NewsCard'
import { InlineChart } from './InlineChart'

function nodeToText(node) {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (Array.isArray(node?.children)) {
    return node.children.map(nodeToText).join('')
  }
  if (typeof node?.value === 'string') return node.value
  return ''
}

function isNewsSection(section) {
  return /news\s*and\s*market\s*impact/i.test(section || '')
}

function makeComponents({ sectionText, onOpenChart }) {
  return {
    h2: ({ node, children, ...rest }) => <h2 {...rest}>{children}</h2>,
    h3: ({ node, children, ...rest }) => <h3 {...rest}>{children}</h3>,
    p: ({ node, children }) => {
      const text = nodeToText(node)
      return (
        <InlineDataCtx.Provider value={{ paragraph: text, section: sectionText, onOpenChart }}>
          <p>{children}</p>
        </InlineDataCtx.Provider>
      )
    },
    code: (props) => <CodeOverride sectionText={sectionText} {...props} />,
    a: ({ node, href, children, ...rest }) => {
      if (isNewsSection(sectionText) && href && /^https?:\/\//i.test(href)) {
        const title = Array.isArray(children) ? children.map(nodeToText).join('') : String(children ?? '')
        return <NewsCard href={href} title={title} />
      }
      return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>
    },
  }
}

function CodeOverride({ sectionText, node, inline, children, className, ...rest }) {
  const ctx = useContext(InlineDataCtx)
  const text = Array.isArray(children) ? children.join('') : String(children ?? '')
  if (inline === false || className) {
    return <code className={className} {...rest}>{children}</code>
  }
  const paragraph = ctx?.paragraph || ''
  const cls = classifyCodeSpan(text, paragraph, sectionText)
  if (cls.kind === 'none') {
    return <code {...rest}>{children}</code>
  }
  const ticker = extractTickerContext(paragraph)
  const common = { ticker, raw: text, value: cls.value }
  if (cls.kind === 'price') return <PriceChip {...common} />
  if (cls.kind === 'whale') return <WhaleChip {...common} />
  if (cls.kind === 'sentiment') return <SentimentChip {...common} />
  return <code {...rest}>{children}</code>
}

// Split markdown into segments: [{ kind:'md', text, section }, { kind:'chart', directive }, ...]
// Sections are tracked by walking the markdown header lines so children render
// inside the correct InlineDataCtx without needing a custom remark plugin.
function splitSegments(md) {
  const segments = []
  if (!md || typeof md !== 'string') return segments
  // Pre-extract chart directives in order.
  const directiveRe = /<!--\s*orca:chart\s+[^>]*?-->/gi
  let last = 0
  let m
  const pieces = []
  while ((m = directiveRe.exec(md)) !== null) {
    if (m.index > last) pieces.push({ kind: 'md', text: md.slice(last, m.index) })
    const dir = extractChartDirective(m[0])
    if (dir) pieces.push({ kind: 'chart', directive: dir })
    last = m.index + m[0].length
  }
  if (last < md.length) pieces.push({ kind: 'md', text: md.slice(last) })

  // For each md piece, infer the section header context that should apply to
  // its children. We pass a section per segment; ReactMarkdown will use this.
  let currentSection = ''
  for (const p of pieces) {
    if (p.kind === 'chart') {
      segments.push(p)
      continue
    }
    // Update currentSection from headers (markdown or **Bold** section labels)
    // present in this chunk's preamble.
    const headerLines = p.text.match(/(^|\n)(?:#{1,6}\s+|\*\*)([^\n*]+?)(?:\*\*)?\s*(?=\n|$)/g) || []
    let section = currentSection
    for (const line of headerLines) {
      const clean = line.replace(/[#*\n]/g, '').trim()
      if (clean) section = clean
    }
    currentSection = section
    segments.push({ kind: 'md', text: p.text, section })
  }
  return segments
}

export function OrcaMarkdown({ children }) {
  const [openedCharts, setOpenedCharts] = useState([])
  const onOpenChart = useCallback((ticker, tf, kind) => {
    setOpenedCharts((prev) => {
      if (prev.some((c) => c.ticker === ticker)) return prev
      return [...prev, { ticker, tf, kind }]
    })
  }, [])

  const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : String(children ?? '')
  const segments = useMemo(() => splitSegments(text), [text])

  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.kind === 'chart') {
          return <InlineChart key={`chart-${idx}`} ticker={seg.directive.ticker} tf={seg.directive.tf} kind={seg.directive.kind} />
        }
        const components = makeComponents({ paragraphText: '', sectionText: seg.section || '', onOpenChart })
        return (
          <ReactMarkdown key={`md-${idx}`} remarkPlugins={[remarkGfm]} components={components}>
            {seg.text}
          </ReactMarkdown>
        )
      })}
      {openedCharts.map((c, i) => (
        <InlineChart key={`opened-${c.ticker}-${i}`} ticker={c.ticker} tf={c.tf} kind={c.kind} />
      ))}
    </>
  )
}

// Helper export — useful for tests + power consumers who need the raw
// segmenter without rendering.
export const __internal = { splitSegments, stripChartDirectives }

export default OrcaMarkdown
