import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { api } from "../api.js"
import { useJob } from "../App.jsx"

const order = ["disposition", "shortage", "invoice", "expedite", "customer"]

export default function Resolve() {
  const { job, setJob } = useJob()
  const location = useLocation()
  const [actor, setActor] = useState(job.user.name)

  useEffect(() => {
    const id = location.hash.replace("#", "")
    if (!id) return
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [location.hash])

  return (
    <div className="stack">
      <section className="panel">
        <h2>Decisions sit beside the documents</h2>
        <p>
          An action updates the status, the next-action list, and the history. It leaves the vendor update at 800, the goods receipt at 780, the inspection at 740 accepted and 40 rejected, and the bill at 800.
        </p>
        <label className="actor">
          <span>Recorded by</span>
          <input value={actor} onChange={(event) => setActor(event.target.value)} maxLength={80} />
        </label>
      </section>
      {order.map((id) => (
        <DecisionCard
          key={id}
          id={id}
          form={job.forms[id]}
          actor={actor}
          kind={id === "disposition" ? null : id}
          onDone={(data) => setJob(data.job)}
        />
      ))}
    </div>
  )
}

function DecisionCard({ id, form, actor, kind, onDone }) {
  const first = form.options[0]
  const [choice, setChoice] = useState(form.recorded?.choice || form.recorded?.decision || first.value)
  const [note, setNote] = useState(form.recorded?.note || first.defaultNote)
  const [dirty, setDirty] = useState(false)
  const [editing, setEditing] = useState(!form.recorded)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const recordedId = form.recorded?.id || ""
  useEffect(() => {
    if (!recordedId) {
      setEditing(true)
      setMessage("")
      setError("")
    }
  }, [recordedId])

  function select(value) {
    setChoice(value)
    if (!dirty) {
      const option = form.options.find((item) => item.value === value)
      setNote(option?.defaultNote || "")
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError("")
    setMessage("")
    try {
      const payload = { note, actor }
      const data = kind
        ? await api.reconcile({ ...payload, kind, choice })
        : await api.disposition({ ...payload, decision: choice })
      onDone(data)
      setMessage(data.message)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="panel decision" id={id}>
      <header className="panel-head">
        <h2>{form.title}</h2>
        {form.recorded && <span className="status">{form.recorded.status}</span>}
      </header>
      <p>{form.explanation}</p>
      {form.recorded && !editing && (
        <div className="recorded">
          <strong>{form.recorded.label}</strong>
          <p>{form.recorded.note}</p>
          <p className="meta">{form.recorded.actor} · {form.recorded.atLabel}</p>
          {message && <p className="saved">{message}</p>}
          <button type="button" className="secondary" onClick={() => setEditing(true)}>
            Update this decision
          </button>
        </div>
      )}
      {editing && (
        <form onSubmit={submit}>
          <div className="options">
            {form.options.map((option) => (
              <label key={option.value} className={option.value === choice ? "choice selected" : "choice"}>
                <input
                  type="radio"
                  name={id}
                  value={option.value}
                  checked={option.value === choice}
                  onChange={() => select(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <label className="note">
            <span>Note</span>
            <textarea
              value={note}
              onChange={(event) => {
                setDirty(true)
                setNote(event.target.value)
              }}
              rows={4}
              maxLength={600}
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="primary" disabled={pending}>
            {pending ? "Saving…" : form.recorded ? "Save updated decision" : "Record decision"}
          </button>
        </form>
      )}
    </section>
  )
}
