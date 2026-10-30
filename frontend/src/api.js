async function request(url, options) {
  let response
  try {
    response = await fetch(url, options)
  } catch {
    throw new Error("The desk API is not running. Start the backend, then refresh this page.")
  }
  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }
  if (!response.ok && response.status !== 409 && response.status !== 503) {
    throw new Error(data?.message || "The desk could not complete that action.")
  }
  return data
}

const json = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
})

export const api = {
  job: () => request("/api/job"),
  fixtures: () => request("/api/fixtures"),
  importFixture: (body) => request("/api/vendor-updates/import", json(body)),
  retry: () => request("/api/vendor-updates/retry", { method: "POST" }),
  disposition: (body) => request("/api/inspections/disposition", json(body)),
  reconcile: (body) => request("/api/reconciliations", json(body)),
  reset: () => request("/api/simulation/reset", { method: "POST" })
}
