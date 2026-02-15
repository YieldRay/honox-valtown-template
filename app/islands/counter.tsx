import { useState } from 'hono/jsx'

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>Interactive island</p>
      <div class="flex items-center justify-center gap-4">
        <button
          class="rounded-md bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"
          onClick={() => setCount(count - 1)}
        >
          -
        </button>
        <p class="py-2 text-2xl">{count}</p>
        <button
          class="rounded-md bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"
          onClick={() => setCount(count + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}
