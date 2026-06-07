import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>Interactive island</p>
      <div className="flex items-center justify-center gap-4">
        <button
          className="rounded-md bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"
          onClick={() => setCount(count - 1)}
        >
          -
        </button>
        <p className="py-2 text-2xl">{count}</p>
        <button
          className="rounded-md bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"
          onClick={() => setCount(count + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}
