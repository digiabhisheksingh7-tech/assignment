import { formatInr, formatQty } from "../format.js"

export function Qty({ value }) {
  return (
    <span className="qty">
      {formatQty(value)}
      <span className="unit">pcs</span>
    </span>
  )
}

export function Money({ value }) {
  return <span className="money">{formatInr(value)}</span>
}

export function Tag({ kind, children }) {
  return <span className={`tag tag-${kind}`}>{children}</span>
}
