import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { api } from "./api.js"
import Shell from "./components/Shell.jsx"
import Bridge from "./pages/Bridge.jsx"
import HistoryPage from "./pages/HistoryPage.jsx"
import ImportPage from "./pages/ImportPage.jsx"
import Overview from "./pages/Overview.jsx"
import Resolve from "./pages/Resolve.jsx"
import Sources from "./pages/Sources.jsx"

const JobContext = createContext(null)

export function useJob() {
  const value = useContext(JobContext)
  if (!value) throw new Error("useJob must be used inside the desk")
  return value
}

function JobProvider({ children }) {
  const [job, setJob] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const data = await api.job()
    setJob(data)
    setError("")
    setLoading(false)
    return data
  }, [])

  useEffect(() => {
    let active = true
    api.job()
      .then((data) => {
        if (!active) return
        setJob(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <JobContext.Provider value={{ job, setJob, error, loading, reload }}>
      {children}
    </JobContext.Provider>
  )
}

export default function App() {
  return (
    <JobProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Overview />} />
          <Route path="quantities" element={<Bridge />} />
          <Route path="sources" element={<Sources />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="resolve" element={<Resolve />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </JobProvider>
  )
}
