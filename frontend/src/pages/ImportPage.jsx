import { useEffect, useState } from "react"
import { api } from "../api.js"
import { useJob } from "../App.jsx"
import { Qty } from "../components/Bits.jsx"

export default function ImportPage() {
  const { job, setJob } = useJob()
  const [fixtures, setFixtures] = useState([])
  const [fixtureId, setFixtureId] = useState("dispatch")
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    api.fixtures()
      .then((rows) => {
        if (!active) return
        setFixtures(rows)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [])

  const selected = fixtures.find((item) => item.id === fixtureId)

  async function runImport(failure) {
    setPending(true)
    setError("")
    try {
      const data = await api.importFixture({ fixtureId, simulateFailure: failure })
      if (data.job) setJob(data.job)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  async function retry() {
    setPending(true)
    setError("")
    try {
      const data = await api.retry()
      if (data.job) setJob(data.job)
      setResult(data)
      setSimulateFailure(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="stack">
      <section className="panel sim-panel">
        <p className="eyebrow">Simulation</p>
        <h2>Import a vendor update from a local file</h2>
        <p>
          The files live in <code>backend/fixtures</code>. The idempotency key is the vendor update id. The same id posts once. A timeout posts nothing. A second copy with a different quantity is kept out of the ledger.
        </p>
      </section>

      <div className="import-grid">
        <section className="panel">
          <fieldset>
            <legend>Choose a fixture</legend>
            {fixtures.map((item) => (
              <label key={item.id} className={item.id === fixtureId ? "choice selected" : "choice"}>
                <input
                  type="radio"
                  name="fixture"
                  value={item.id}
                  checked={item.id === fixtureId}
                  onChange={() => setFixtureId(item.id)}
                />
                <span>
                  <strong>{item.title}</strong>
                  <em>{item.detail}</em>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="check">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(event) => setSimulateFailure(event.target.checked)}
            />
            <span>Simulate a vendor portal timeout</span>
          </label>

          <div className="button-row">
            <button type="button" disabled={pending || !selected} onClick={() => runImport(simulateFailure)}>
              {pending ? "Importing…" : "Import fixture"}
            </button>
            <button type="button" className="secondary" disabled={pending || !job.retry} onClick={retry}>
              Retry last failure
            </button>
          </div>

          {job.retry && (
            <p className="retry-hint" role="status">
              Last failure: {job.retry.updateId} at {job.retry.failedAt}. Retry posts that same fixture without the timeout.
            </p>
          )}

          {error && <div className="result result-failed" role="alert"><p>{error}</p></div>}
          {result && (
            <div className={`result result-${result.outcome}`} data-testid="import-result" role="status">
              <strong>{labelFor(result.outcome)}</strong>
              <p>{result.message}</p>
              <p>
                Vendor dispatched quantity is now <Qty value={result.vendorDispatched} />.
                {result.quantitiesUnchanged ? " This import did not add pieces." : ""}
              </p>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Fixture payload</h2>
          <pre className="json">{selected ? JSON.stringify(selected.payload, null, 2) : "Loading fixture…"}</pre>
        </section>
      </div>

      <section className="panel">
        <h2>Import ledger</h2>
        {job.ledger.length === 0 && <p>No vendor update has been posted.</p>}
        {job.ledger.map((record) => (
          <article key={record.updateId} className="ledger-card">
            <header>
              <div>
                <h3>{record.updateId}</h3>
                <p>{record.effect}</p>
              </div>
              <span className={`status status-${record.status}`}>{record.status === "applied" ? "Posted" : "Not posted"}</span>
            </header>
            {record.postedQty != null && <p>Posted dispatch quantity: <Qty value={record.postedQty} /></p>}
            <ol className="attempts">
              {record.attempts.map((attempt, index) => (
                <li key={`${attempt.at}-${index}`}>
                  <span>{attempt.atLabel}</span>
                  <strong>{attemptLabel(attempt.result)}</strong>
                  <em>Simulation</em>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>
    </div>
  )
}

function labelFor(outcome) {
  if (outcome === "applied") return "Posted once"
  if (outcome === "duplicate_ignored") return "Duplicate ignored"
  if (outcome === "conflict_preserved") return "Conflict kept out"
  if (outcome === "failed") return "Simulated failure"
  return "Import result"
}

function attemptLabel(result) {
  if (result === "applied") return "Posted"
  if (result === "duplicate_ignored") return "Duplicate ignored"
  if (result === "conflict_preserved") return "Conflict preserved"
  if (result === "failed") return "Timed out"
  return result
}
