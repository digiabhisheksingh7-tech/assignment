import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useJob } from "../App.jsx"
import { runWalkthrough } from "../walkthrough.js"

export default function Walkthrough() {
  const navigate = useNavigate()
  const { setJob } = useJob()
  const [caption, setCaption] = useState("")
  const [playing, setPlaying] = useState(false)
  const signal = useRef({ aborted: false, stop: null })

  async function start() {
    const audio = new Audio("/narration.wav")
    signal.current.aborted = false
    signal.current.stop = () => {
      signal.current.aborted = true
      audio.pause()
    }
    setPlaying(true)
    setCaption("Starting the three-minute walkthrough.")
    try {
      await audio.play()
      await runWalkthrough({
        audio,
        navigate,
        setJob,
        signal: signal.current,
        onCaption: setCaption
      })
    } catch (error) {
      setCaption(error.message)
    } finally {
      setPlaying(false)
    }
  }

  function stop() {
    signal.current.stop?.()
    signal.current.aborted = true
    setPlaying(false)
    setCaption("")
  }

  return (
    <>
      <button type="button" className="ghost walkthrough-play" onClick={playing ? stop : start}>
        {playing ? "Stop walkthrough" : "Play 3-minute walkthrough"}
      </button>
      {caption && (
        <div className="walk-caption" role="status">
          {caption}
        </div>
      )}
    </>
  )
}
