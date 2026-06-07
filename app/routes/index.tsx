import { createRoute } from 'honox/factory'
import { inspectedRoutes } from '#app/server.ts'
import { name } from '../../package.json'
import Counter from '#app/islands/counter.tsx'
import counterCode from '#app/islands/counter.tsx?raw'

export default createRoute(async (c) => {
  return c.render(<Demo />)
})

/** REMOVE THIS FUNCTION */
function Demo() {
  const methodChipClass: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700',
    POST: 'bg-sky-100 text-sky-700',
    PUT: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-rose-100 text-rose-700',
  }

  const getMethodClass = (method: string) =>
    methodChipClass[method] ?? 'bg-slate-100 text-slate-700'

  const routes = inspectedRoutes.filter((entry) => !entry.isMiddleware)
  const middlewareCount = inspectedRoutes.length - routes.length

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* @start cdn */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/@speed-highlight/core/dist/themes/default.css"
      ></link>
      <script
        type="module"
        dangerouslySetInnerHTML={{
          __html: /*js*/ `
            import { highlightAll } from 'https://unpkg.com/@speed-highlight/core/dist/index.js';
            highlightAll({ hideLineNumbers: true });
          `,
        }}
      ></script>
      {/* @end cdn */}
      <div className="mx-auto max-w-6xl flex flex-col gap-4 px-5 py-2">
        <header className="py-36 text-center">
          {['Honox', 'Tailwind'].map((name) => (
            <span
              key={name}
              className="inline-flex items-center justify-center rounded-full bg-orange-100 px-3 py-1 mr-1 text-xs font-medium text-orange-700"
            >
              {name}
            </span>
          ))}
          <h1 className="text-3xl font-semibold">
            <a
              target="_blank"
              href="https://github.com/YieldRay/honox-valtown-template"
            >
              {name}
            </a>
          </h1>
          <p className="text-sm text-slate-600">
            A lightweight
            <a href="https://fresh.deno.dev/" className="underline mx-1">
              deno fresh
            </a>
            alternative.
          </p>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm grid grid-templates-columns-1 md:grid-cols-2 gap-5">
          <div className="max-w-full overflow-x-auto">
            <h2 className="text-base font-semibold">Counter island</h2>
            <p className="mt-1 text-xs text-slate-600">
              Client interactivity where you need it.
            </p>
            <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 p-5 text-center">
              <Counter />
            </div>
          </div>

          <pre className="max-w-full overflow-x-auto shadow-none! shj-lang-ts">
            {counterCode}
          </pre>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold">Registered routes</h2>
            <span className="text-xs text-slate-500">
              {routes.length} routes · {middlewareCount} middleware
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Path</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Kind</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {inspectedRoutes.map((route) => (
                  <tr
                    key={`${route.method}-${route.path}-${
                      route.name ?? 'anonymous'
                    }`}
                  >
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${getMethodClass(
                          route.method,
                        )}`}
                      >
                        {route.method}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-600">
                      {route.path}
                    </td>
                    <td className="px-5 py-3 text-[11px]">
                      {route.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-[11px]">
                      {route.isMiddleware ? 'Middleware' : 'Route'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="py-2 text-center text-xs text-slate-500">
          Server time: {new Date().toLocaleString()}
        </footer>
      </div>
    </main>
  )
}
