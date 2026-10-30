import fs from "node:fs"
import path from "node:path"
import { createSeed } from "./logic.js"

export function createStore(filePath, fixtures) {
  let chain = Promise.resolve()

  function seed() {
    return createSeed(fixtures)
  }

  function read() {
    if (!fs.existsSync(filePath)) {
      const initial = seed()
      write(initial)
      return initial
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"))
  }

  function write(state) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    const tmp = `${filePath}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2))
    fs.rmSync(filePath, { force: true })
    fs.renameSync(tmp, filePath)
  }

  function update(mutator) {
    const run = chain.then(() => {
      const draft = structuredClone(read())
      const result = mutator(draft)
      write(draft)
      return result
    })
    chain = run.then(() => {}, () => {})
    return run
  }

  return {
    read,
    update,
    reset() {
      return update((draft) => {
        const fresh = seed()
        for (const key of Object.keys(draft)) delete draft[key]
        Object.assign(draft, fresh)
        return fresh
      })
    }
  }
}
