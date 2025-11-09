import { createRoute } from "honox/factory"
import { inspectedRoutes } from "#app/server.ts"
import Counter from "#app/islands/counter.tsx"
import FormExample from "./-components/form-example"
import { name } from "../../package.json"

const methodChipClass: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-sky-100 text-sky-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-rose-100 text-rose-700",
}

const getMethodClass = (method: string) =>
  methodChipClass[method] ?? "bg-slate-100 text-slate-700"

export default createRoute(async (c) => {
  const routes = inspectedRoutes.filter((entry) => !entry.isMiddleware)
  const middlewareCount = inspectedRoutes.length - routes.length

  return c.render(
    <main class="min-h-screen bg-white text-slate-900">
      <div class="mx-auto flex max-w-4xl flex-col gap-10 px-5 py-12">
        <header class="space-y-3 space-x-3 text-center">
          {["Honox", "Tailwind"].map((name) => (
            <span class="inline-flex items-center justify-center rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
              {name}
            </span>
          ))}
          <h1 class="text-3xl font-semibold">{name}</h1>
          <p class="text-sm text-slate-600">
            A
            <a href="https://fresh.deno.dev/" class="underline mx-2">
              deno fresh
            </a>
            alternative.
          </p>
        </header>

        <section class="grid gap-6 md:grid-cols-2">
          <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="text-base font-semibold">Counter island</h2>
            <p class="mt-1 text-xs text-slate-600">
              Client interactivity where you need it.
            </p>
            <div class="mt-4 rounded-md border border-slate-100 bg-slate-50 p-5 text-center">
              <Counter />
            </div>
          </div>

          <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 class="text-base font-semibold">Form example</h2>
            <p class="mt-1 text-xs text-slate-600">
              Generated with zod + json-schema-to-form.
            </p>
            <div class="mt-4 rounded-md border border-slate-100 bg-slate-50 p-4">
              <FormExample />
            </div>
          </div>
        </section>

        <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 class="text-base font-semibold">Registered routes</h2>
            <span class="text-xs text-slate-500">
              {routes.length} routes · {middlewareCount} middleware
            </span>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-xs text-slate-700">
              <thead class="bg-slate-50 text-slate-500">
                <tr>
                  <th class="px-5 py-3 font-medium">Method</th>
                  <th class="px-5 py-3 font-medium">Path</th>
                  <th class="px-5 py-3 font-medium">Name</th>
                  <th class="px-5 py-3 font-medium">Kind</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                {inspectedRoutes.map((route) => (
                  <tr
                    key={`${route.method}-${route.path}-${
                      route.name ?? "anonymous"
                    }`}
                  >
                    <td class="px-5 py-3">
                      <span
                        class={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${getMethodClass(
                          route.method
                        )}`}
                      >
                        {route.method}
                      </span>
                    </td>
                    <td class="px-5 py-3 font-mono text-[11px] text-slate-600">
                      {route.path}
                    </td>
                    <td class="px-5 py-3 text-[11px]">{route.name || "—"}</td>
                    <td class="px-5 py-3 text-[11px]">
                      {route.isMiddleware ? "Middleware" : "Route"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer class="border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          Server time: {new Date().toLocaleString()}
        </footer>
      </div>
    </main>
  )
})
