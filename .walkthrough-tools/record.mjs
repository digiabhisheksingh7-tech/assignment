import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const base = "http://[::1]:5174"
const api = "http://127.0.0.1:4000"
const outDir = path.resolve("..", "docs", "video-raw")
fs.mkdirSync(outDir, { recursive: true })

const paragraphs = fs.readFileSync(path.resolve("..", "docs", "narration.txt"), "utf8")
  .split(/\n\s*\n/)
  .map((part) => part.replace(/\s+/g, " ").trim())
  .filter(Boolean)

const weights = paragraphs.map((part) => part.length)
const totalWeight = weights.reduce((sum, n) => sum + n, 0)
const totalMs = 181200
const sliceMs = weights.map((weight) => Math.round((weight / totalWeight) * totalMs))

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  recordVideo: { dir: outDir, size: { width: 1280, height: 720 } }
})
const page = await context.newPage()

async function caption(text) {
  await page.evaluate((value) => {
    let bar = document.getElementById("walkthrough-caption")
    if (!bar) {
      bar = document.createElement("div")
      bar.id = "walkthrough-caption"
      bar.style.cssText = [
        "position:fixed",
        "left:16px",
        "right:16px",
        "bottom:12px",
        "z-index:9999",
        "background:rgba(36,28,22,0.94)",
        "color:#fbf7f0",
        "padding:12px 16px",
        "border-radius:8px",
        "font:600 18px/1.35 'Segoe UI',sans-serif",
        "box-shadow:0 8px 24px rgba(0,0,0,0.28)"
      ].join(";")
      document.body.appendChild(bar)
    }
    bar.textContent = value
  }, text)
}

async function beat(index, action) {
  const started = Date.now()
  if (action) await action()
  await caption(paragraphs[index])
  const remain = sliceMs[index] - (Date.now() - started)
  if (remain > 0) await page.waitForTimeout(remain)
}

await page.request.post(`${api}/api/simulation/reset`)
await page.goto(base, { waitUntil: "networkidle" })
await page.waitForSelector("[data-testid=delivery-risk]")

await beat(0, async () => {
  await page.evaluate(() => window.scrollTo(0, 0))
})

await beat(1, async () => {
  await page.locator("[data-testid=qty-gap]").scrollIntoViewIfNeeded()
})

await beat(2, async () => {
  await page.locator("[data-testid=identity]").scrollIntoViewIfNeeded()
})

await beat(3, async () => {
  await page.getByRole("link", { name: "Source records" }).click()
  await page.waitForSelector("text=Goods receipt")
  await page.locator("text=Weighbridge").scrollIntoViewIfNeeded()
  await page.waitForTimeout(1200)
  await page.locator("text=Vendor tax invoice").scrollIntoViewIfNeeded()
})

await beat(4, async () => {
  await page.getByRole("link", { name: "Vendor import" }).click()
  await page.getByRole("button", { name: "Import fixture" }).click()
  await page.waitForSelector("text=Duplicate ignored")
})

await beat(5, async () => {
  await page.getByRole("radio", { name: /Balance ETA/ }).check()
  await page.getByRole("checkbox", { name: /portal timeout/ }).check()
  await page.getByRole("button", { name: "Import fixture" }).click()
  await page.waitForSelector("text=Simulated failure")
  await page.waitForTimeout(700)
  await page.getByRole("button", { name: "Retry last failure" }).click()
  await page.waitForSelector("text=Posted once")
  await page.getByRole("checkbox", { name: /portal timeout/ }).uncheck()
  await page.getByRole("button", { name: "Import fixture" }).click()
  await page.waitForSelector("text=Duplicate ignored")
})

await beat(6, async () => {
  await page.getByRole("radio", { name: /Conflicting copy/ }).check()
  await page.getByRole("button", { name: "Import fixture" }).click()
  await page.waitForSelector("text=Conflict kept out")
})

await beat(7, async () => {
  await page.getByRole("link", { name: "Resolve" }).click()
  await page.locator("#disposition").getByRole("button", { name: "Record decision" }).click()
  await page.locator("#disposition").getByText("Re-temper requested").waitFor()
  await page.locator("#invoice").getByRole("button", { name: "Record decision" }).click()
  await page.locator("#invoice").getByText("Payment held in full").waitFor()
})

await beat(8, async () => {
  await page.getByRole("link", { name: "Overview" }).click()
  await page.waitForSelector("text=2 of 5 decisions recorded")
  await page.waitForTimeout(1500)
  await page.getByRole("link", { name: "History" }).click()
  await page.waitForSelector("text=Hold the entire bill")
})

await page.waitForTimeout(400)
const video = page.video()
await context.close()
await browser.close()
const saved = await video.path()
const target = path.resolve(outDir, "walkthrough.webm")
fs.copyFileSync(saved, target)
console.log(`video=${target}`)
console.log(`slices_ms=${sliceMs.join(",")}`)
