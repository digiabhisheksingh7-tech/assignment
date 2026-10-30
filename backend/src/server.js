import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import express from "express"
import { FIXTURE_META, HttpError, derive, importFixture, recordDecision, recordDisposition, retryImport } from "./logic.js"
import { createStore } from "./store.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(__dirname, "../fixtures")

export function loadFixtures(dir = fixturesDir) {
  return {
    dispatch: readFixture(dir, "vendor-dispatch.json"),
    dispatch_conflict: readFixture(dir, "vendor-dispatch-conflict.json"),
    eta: readFixture(dir, "vendor-eta.json")
  }
}

function readFixture(dir, name) {
  return JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"))
}

export function createApp(store, fixtures) {
  const app = express()
  app.use(express.json({ limit: "1mb" }))
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    if (req.method === "OPTIONS") return res.sendStatus(204)
    next()
  })

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, simulation: true })
  })

  app.get("/api/job", async (_req, res, next) => {
    try {
      res.json(derive(store.read()))
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/fixtures", (_req, res) => {
    res.json(Object.values(FIXTURE_META).map((meta) => ({
      ...meta,
      payload: fixtures[meta.id],
      simulation: true
    })))
  })

  app.post("/api/vendor-updates/import", async (req, res, next) => {
    try {
      const outcome = await store.update((draft) => importFixture(draft, fixtures, {
        fixtureId: req.body?.fixtureId,
        simulateFailure: Boolean(req.body?.simulateFailure),
        now: new Date().toISOString()
      }))
      res.status(outcome.http).json(outcome.body)
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/vendor-updates/retry", async (_req, res, next) => {
    try {
      const outcome = await store.update((draft) => retryImport(draft, fixtures, new Date().toISOString()))
      res.status(outcome.http).json(outcome.body)
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/inspections/disposition", async (req, res, next) => {
    try {
      const outcome = await store.update((draft) => recordDisposition(draft, {
        decision: req.body?.decision,
        note: req.body?.note,
        actor: req.body?.actor,
        now: new Date().toISOString()
      }))
      res.json(outcome)
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/reconciliations", async (req, res, next) => {
    try {
      const outcome = await store.update((draft) => recordDecision(draft, {
        kind: req.body?.kind,
        choice: req.body?.choice,
        note: req.body?.note,
        actor: req.body?.actor,
        now: new Date().toISOString()
      }))
      res.json(outcome)
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/simulation/reset", async (_req, res, next) => {
    try {
      const fresh = await store.reset()
      res.json({
        simulation: true,
        message: "Prototype data reset to the scenario. Source quantities are back to the original documents.",
        job: derive(fresh)
      })
    } catch (error) {
      next(error)
    }
  })

  const dist = path.resolve(__dirname, "../../frontend/dist")
  if (fs.existsSync(dist)) {
    app.use(express.static(dist))
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) return next()
      const index = path.join(dist, "index.html")
      if (!fs.existsSync(index)) return next()
      res.sendFile(index)
    })
  }

  app.use((error, _req, res, _next) => {
    const status = error instanceof HttpError ? error.status : 500
    res.status(status).json({
      outcome: "error",
      message: status === 500 ? "The desk could not complete that action." : error.message
    })
  })

  return app
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (invokedDirectly) {
  const fixtures = loadFixtures()
  const dataFile = process.env.STATE_PATH || path.join(__dirname, "../data/state.json")
  const app = createApp(createStore(dataFile, fixtures), fixtures)
  const port = Number(process.env.PORT || 4000)
  app.listen(port, () => {
    console.log(`Heat-treatment desk API on http://localhost:${port}`)
  })
}
