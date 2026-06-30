interface Point { date: string; rating: number | null }

interface Props {
  data: Point[]
  height?: number
}

export default function RatingChart({ data, height = 120 }: Props) {
  if (!data.length) return <p className="text-xs text-gray-400 py-4">No history yet.</p>

  const validData = data.filter(d => d.rating !== null) as { date: string; rating: number }[]
  if (!validData.length) return <p className="text-xs text-gray-400 py-4">No rating data.</p>

  const minR = Math.max(0, Math.min(...validData.map(d => d.rating)) - 0.5)
  const maxR = Math.min(5, Math.max(...validData.map(d => d.rating)) + 0.5)
  const range = maxR - minR || 1

  const w = 480
  const padLeft = 28
  const padRight = 8
  const padTop = 8
  const padBottom = 24
  const innerW = w - padLeft - padRight
  const innerH = height - padTop - padBottom

  const xOf = (i: number) => padLeft + (i / (validData.length - 1 || 1)) * innerW
  const yOf = (r: number) => padTop + (1 - (r - minR) / range) * innerH

  const path = validData
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(d.rating).toFixed(1)}`)
    .join(' ')

  const area = `${path} L${xOf(validData.length - 1).toFixed(1)},${(padTop + innerH).toFixed(1)} L${padLeft},${(padTop + innerH).toFixed(1)} Z`

  const yTicks = [minR, (minR + maxR) / 2, maxR].map(v => Math.round(v * 10) / 10)

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      {/* Y grid + labels */}
      {yTicks.map(v => {
        const y = yOf(v)
        return (
          <g key={v}>
            <line x1={padLeft} x2={w - padRight} y1={y} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={padLeft - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{v.toFixed(1)}</text>
          </g>
        )
      })}

      {/* Area fill */}
      <path d={area} fill="#1d4ed8" fillOpacity="0.07" />

      {/* Line */}
      <path d={path} fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinejoin="round" />

      {/* Dots */}
      {validData.map((d, i) => (
        <g key={i}>
          <circle cx={xOf(i)} cy={yOf(d.rating)} r="3.5" fill="#1d4ed8" />
          <title>{new Date(d.date).toLocaleDateString()} — {d.rating}★</title>
        </g>
      ))}

      {/* X labels — first and last only */}
      {[0, validData.length - 1].map(i => (
        <text
          key={i}
          x={xOf(i)}
          y={height - 4}
          textAnchor={i === 0 ? 'start' : 'end'}
          fontSize="9"
          fill="#9ca3af"
        >
          {new Date(validData[i].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </text>
      ))}
    </svg>
  )
}
