import { api } from "./api.js"

const paragraphs = [
  "This is the heat-treatment desk for Arjun Forge, a small auto-parts plant in Chakan. Bharat Axle needs one thousand finished steering knuckles. The promise is forty-eight hours away, and there is no other finished stock.",
  "We sent one thousand pieces to Mettherm for harden and temper. The vendor says they dispatched eight hundred. Our gate counted seven hundred and eighty. Quality accepted seven hundred and forty and rejected forty for possible rework. The vendor billed eight hundred. Seven hundred and forty can ship. The order is short by two hundred and sixty.",
  "The bar is the whole delivery challan. Seven hundred and forty accepted, forty rejected, twenty unaccounted, and two hundred still at the vendor. Those figures add back to one thousand. A decision on this desk never adds a piece.",
  "These are separate documents. The vendor slip says crate C-40 left their gate. Our unload tally did not find it. The weighbridge is four kilos under a seven hundred and eighty piece load, so the scale supports the gate count. Their hardness certificate still says the batch conforms. Our inspection rejected crates C-17 and C-28. The certificate and the bill stay as they wrote them.",
  "This vendor portal is a simulation. It reads a local JSON file. The dispatch of eight hundred is already posted. Importing it again does not add pieces. The ledger shows a duplicate, and the quantity stays eight hundred.",
  "A simulated portal timeout fails the balance update before anything is posted. Retry sends the same file without the timeout. The ETA is stored once, and the dispatch quantity does not change. Importing that ETA again does not double it.",
  "The last file uses the same update id but claims one thousand pieces. The desk keeps the posted eight hundred and leaves the new figure out.",
  "Two decisions are recorded. The forty rejects go back for re-temper. The bill for eight hundred is held in full. Status, next action, and history all update. Accepted stays seven hundred and forty, rejected stays forty, the gate stays seven hundred and eighty, and the bill stays eight hundred. The customer is still short.",
  "The wider ERP keeps this ledger inside the product, not in a separate MES. If the company already files from Tally, Tally keeps the books and the e-invoice, and this desk sends one approved voucher. The vendor has no API, so this file inbox is the integration. A GST sandbox can take longer than a month, so a typed e-way number is the fallback. A duplicate or a conflicting vendor file must never change a posted quantity."
]

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitFor(predicate, label, timeout = 8000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (predicate()) return
    await wait(80)
  }
  throw new Error(`The walkthrough could not find ${label}.`)
}

function scrollToText(tag, text) {
  const node = [...document.querySelectorAll(tag)].find((item) => item.textContent.includes(text))
  node?.scrollIntoView({ behavior: "smooth", block: "center" })
}

function clickChoice(snippet) {
  const label = [...document.querySelectorAll("label")].find((item) => item.textContent.includes(snippet))
  const input = label?.querySelector("input")
  if (!input) throw new Error(`Missing choice: ${snippet}`)
  input.click()
}

async function clickNamed(name) {
  await waitFor(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent.trim() === name && !item.disabled)
    return Boolean(button)
  }, name)
  const button = [...document.querySelectorAll("button")].find((item) => item.textContent.trim() === name && !item.disabled)
  button.click()
}

async function waitForResult(snippet) {
  await waitFor(() => document.querySelector("[data-testid=import-result]")?.innerText.includes(snippet), snippet)
}

export async function runWalkthrough({ audio, navigate, setJob, onCaption, signal }) {
  if (!Number.isFinite(audio.duration)) {
    await new Promise((resolve, reject) => {
      audio.onloadedmetadata = resolve
      audio.onerror = () => reject(new Error("The walkthrough narration did not load."))
    })
  }

  const weights = paragraphs.map((part) => part.length)
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let cursor = 0
  const marks = weights.map((weight) => {
    cursor += (weight / total) * audio.duration
    return cursor
  })

  const reset = await api.reset()
  setJob(reset.job)
  navigate("/")
  await waitFor(() => document.querySelector("[data-testid=delivery-risk]"), "the delivery risk")
  window.scrollTo({ top: 0, behavior: "smooth" })

  const actions = [
    async () => {
      window.scrollTo({ top: 0, behavior: "smooth" })
    },
    async () => {
      document.querySelector("[data-testid=qty-gap]")?.scrollIntoView({ behavior: "smooth", block: "center" })
    },
    async () => {
      document.querySelector("[data-testid=identity]")?.scrollIntoView({ behavior: "smooth", block: "center" })
    },
    async () => {
      navigate("/sources")
      await waitFor(() => document.body.innerText.includes("Goods receipt"), "the goods receipt")
      scrollToText("dt", "Weighbridge")
      await wait(1600)
      if (signal.aborted) return
      scrollToText("h2", "Vendor tax invoice")
    },
    async () => {
      navigate("/import")
      await clickNamed("Import fixture")
      await waitForResult("Duplicate ignored")
    },
    async () => {
      clickChoice("Balance ETA")
      clickChoice("Simulate a vendor portal timeout")
      await wait(300)
      await clickNamed("Import fixture")
      await waitForResult("Simulated failure")
      await clickNamed("Retry last failure")
      await waitForResult("Posted once")
      const box = document.querySelector('input[type="checkbox"]')
      if (box?.checked) box.click()
      await wait(300)
      await clickNamed("Import fixture")
      await waitForResult("Duplicate ignored")
    },
    async () => {
      clickChoice("Conflicting copy")
      await wait(300)
      await clickNamed("Import fixture")
      await waitForResult("Conflict kept out")
    },
    async () => {
      navigate("/resolve")
      await waitFor(() => document.querySelector("#disposition button"), "the disposition form")
      document.querySelector("#disposition button.primary, #disposition button[type=submit]")?.click()
      await waitFor(() => document.querySelector("#disposition")?.innerText.toLowerCase().includes("re-temper requested"), "the rework decision")
      document.querySelector("#invoice button.primary, #invoice button[type=submit]")?.click()
      await waitFor(() => document.querySelector("#invoice")?.innerText.toLowerCase().includes("payment held"), "the invoice hold")
    },
    async () => {
      navigate("/")
      await waitFor(() => document.body.innerText.includes("2 of 5 decisions recorded"), "the updated overview")
      await wait(1600)
      if (signal.aborted) return
      navigate("/history")
      await waitFor(() => document.body.innerText.includes("Hold the entire bill"), "the history entry")
    }
  ]

  let step = 0
  let chain = Promise.resolve()
  const enqueue = (index) => {
    onCaption(paragraphs[index])
    chain = chain.then(async () => {
      if (signal.aborted) return
      await actions[index]()
    }).catch((error) => {
      signal.aborted = true
      audio.pause()
      onCaption(error.message)
    })
  }

  enqueue(0)

  await new Promise((resolve) => {
    const timer = setInterval(() => {
      if (signal.aborted || audio.ended) {
        clearInterval(timer)
        resolve()
        return
      }
      while (step < marks.length - 1 && audio.currentTime >= marks[step]) {
        step += 1
        enqueue(step)
      }
    }, 200)
  })
  await chain
}
