import { chromium } from 'file:///C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.0/node_modules/playwright/index.mjs'
import sharp from 'file:///C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const figuresDir = path.resolve(here, '..', 'figures')
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
})

const page = await browser.newPage({
  viewport: { width: 1800, height: 1400 },
  deviceScaleFactor: 2,
})

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.locator('.dashboard-kpi-row').waitFor({ state: 'visible' })
await page.evaluate(() => document.fonts.ready)

const captures = [
  ['dashboard_complete.png', '.dashboard-report'],
  ['sailor_profile.png', '.dashboard-sailor-panel'],
  ['network.png', '.dashboard-network-panel'],
  ['genre_contribution.png', '.dashboard-genre-panel'],
  ['entity_composition.png', '.dashboard-entity-panel'],
  ['rising_stars.png', '.dashboard-rising-panel'],
  ['relationship_types.png', '.dashboard-relationship-panel'],
  ['timeline.png', '.dashboard-timeline-panel'],
  ['artist_comparison.png', '.dashboard-comparison-panel'],
  ['degree_distribution.png', '.dashboard-degree-panel'],
  ['evidence_table.png', '.dashboard-evidence-panel'],
  ['connected_entities.png', '.dashboard-centrality-panel'],
  ['artist_connectivity.png', '.dashboard-artists-panel'],
  ['oceanus_genre_links.png', '.dashboard-oceanus-panel'],
]

for (const [filename, selector] of captures) {
  const target = page.locator(selector).first()
  await target.scrollIntoViewIfNeeded()
  await target.screenshot({
    path: path.join(figuresDir, filename),
    animations: 'disabled',
  })
}

const compactPage = await browser.newPage({
  viewport: { width: 900, height: 900 },
  deviceScaleFactor: 2,
})
await compactPage.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await compactPage.locator('.dashboard-kpi-row').waitFor({ state: 'visible' })
await compactPage.evaluate(() => document.fonts.ready)
const overviewClip = await compactPage.evaluate(() => {
  const box = document.querySelector('.dashboard-kpi-row').getBoundingClientRect()
  return { x: box.left, y: box.top, width: box.width, height: box.height }
})
await compactPage.screenshot({
  path: path.join(figuresDir, 'kpis.png'),
  clip: overviewClip,
  animations: 'disabled',
})
await compactPage.close()

const dashboardPath = path.join(figuresDir, 'dashboard_complete.png')
const dashboard = sharp(dashboardPath)
const metadata = await dashboard.metadata()
const midpoint = Math.floor(metadata.height / 2)

await dashboard
  .clone()
  .extract({ left: 0, top: 0, width: metadata.width, height: midpoint })
  .png()
  .toFile(path.join(figuresDir, 'dashboard_top.png'))

await dashboard
  .clone()
  .extract({
    left: 0,
    top: midpoint,
    width: metadata.width,
    height: metadata.height - midpoint,
  })
  .png()
  .toFile(path.join(figuresDir, 'dashboard_bottom.png'))

await browser.close()

console.log(`Captured ${captures.length + 1} live dashboard figures at 2x device scale.`)
console.log(`Cover split: ${metadata.width} x ${metadata.height}, midpoint ${midpoint}px.`)
