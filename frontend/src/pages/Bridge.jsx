import { useJob } from "../App.jsx"
import { Qty, Tag } from "../components/Bits.jsx"

export default function Bridge() {
  const { job } = useJob()
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h2>Quantity bridge</h2>
          <p>Calculated rows are differences. They are not new documents, and they do not replace the row above them.</p>
        </div>
        <div className="table-wrap">
          <table className="bridge">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Pieces</th>
                <th>Document</th>
                <th>Who reported it</th>
                <th>What it means</th>
              </tr>
            </thead>
            <tbody>
              {job.rows.map((item) => (
                <tr key={item.key} className={`tone-${item.tone}`} data-testid={`row-${item.key}`}>
                  <td>{item.label}</td>
                  <td><Qty value={item.qty} /></td>
                  <td>{item.document}</td>
                  <td><Tag kind={item.kind}>{item.source}</Tag></td>
                  <td>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Where the known pieces sit</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Pieces</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {job.documents.locations.map((place) => (
                <tr key={place.bin}>
                  <td>{place.bin}</td>
                  <td><Qty value={place.qty} /></td>
                  <td>{place.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footnote">
          The unaccounted {job.quantities.unaccounted} pieces have no bin. Putting them in transit would invent a location the warehouse did not confirm.
        </p>
      </section>
    </div>
  )
}
