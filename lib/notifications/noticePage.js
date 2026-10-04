/**
 * Minimal standalone HTML page for the email-link routes (unsubscribe,
 * confirm). Dark Sonar look, no external assets; all text is escaped.
 * `form` renders a POST button: mail scanners pre-open links with GET, so a
 * GET never changes anything — only the button (or RFC 8058 one-click POST)
 * does.
 */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function noticePage({ title, body, form = null, link = null }) {
  const action = form
    ? `<form method="post" action="${esc(form.action)}"><button type="submit">${esc(form.label)}</button></form>`
    : ''
  const back = link ? `<p class="link"><a href="${esc(link.href)}">${esc(link.label)}</a></p>` : ''
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)} · Sonar</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#060c14;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:16px;box-sizing:border-box}
  main{max-width:440px;width:100%;background:#0b1422;border:1px solid #1f2937;border-radius:14px;padding:28px}
  .brand{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#22d3ee;font-weight:700;margin-bottom:10px}
  h1{margin:0 0 10px;font-size:21px;color:#fff}
  p{margin:0 0 18px;color:#9ca3af;font-size:14px;line-height:1.6}
  button{border:0;border-radius:8px;background:#22d3ee;color:#0a1621;font-weight:700;font-size:14px;padding:11px 22px;cursor:pointer}
  a{color:#22d3ee}
  .link{margin:18px 0 0}
</style></head>
<body><main><div class="brand">&#9673; Sonar</div><h1>${esc(title)}</h1><p>${esc(body)}</p>${action}${back}</main></body></html>`
}

export function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })
}
