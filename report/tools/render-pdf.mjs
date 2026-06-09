import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import sharp from 'file:///C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js'

const require = createRequire(import.meta.url)
const canvasModule = require('C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas')
globalThis.DOMMatrix = canvasModule.DOMMatrix
globalThis.ImageData = canvasModule.ImageData
globalThis.Path2D = canvasModule.Path2D

const pdfjs = await import('file:///C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/legacy/build/pdf.mjs')
const here = path.dirname(fileURLToPath(import.meta.url))
const reportDir = path.resolve(here, '..')
const pdfPath = path.join(reportDir, 'build', 'oceanus_folk_report.pdf')
const outputDir = path.join(reportDir, 'rendered')
fs.mkdirSync(outputDir, { recursive: true })

const document = await pdfjs.getDocument({
  data: new Uint8Array(fs.readFileSync(pdfPath)),
  disableFontFace: false,
}).promise

const rendered = []
for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1.8 })
  const canvas = canvasModule.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const context = canvas.getContext('2d')

  await page.render({
    canvasContext: context,
    viewport,
  }).promise

  const filename = `page-${String(pageNumber).padStart(2, '0')}.png`
  const outputPath = path.join(outputDir, filename)
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'))
  rendered.push(outputPath)
}

const thumbWidth = 420
const gap = 20
const columns = 2
const thumbBuffers = []
let thumbHeight = 0

for (const filename of rendered) {
  const image = sharp(filename)
  const metadata = await image.metadata()
  const height = Math.round((metadata.height / metadata.width) * thumbWidth)
  thumbHeight = Math.max(thumbHeight, height)
  thumbBuffers.push(await image.resize({ width: thumbWidth }).png().toBuffer())
}

const rows = Math.ceil(thumbBuffers.length / columns)
const sheetWidth = columns * thumbWidth + (columns - 1) * gap
const sheetHeight = rows * thumbHeight + (rows - 1) * gap
const composites = thumbBuffers.map((input, index) => ({
  input,
  left: (index % columns) * (thumbWidth + gap),
  top: Math.floor(index / columns) * (thumbHeight + gap),
}))

await sharp({
  create: {
    width: sheetWidth,
    height: sheetHeight,
    channels: 3,
    background: '#dfe7ee',
  },
})
  .composite(composites)
  .png()
  .toFile(path.join(outputDir, 'contact-sheet.png'))

console.log(`Rendered ${document.numPages} PDF pages.`)
