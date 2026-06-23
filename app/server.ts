import { showRoutes, inspectRoutes } from 'hono/dev'
import { createApp } from 'honox/server'

// Optional patch for runtime that defines a wrong global process object
if (globalThis.process && !Reflect.has(globalThis.process, 'env')) {
  Reflect.set(globalThis.process, 'env', {})
}

const app = createApp()

if (import.meta.env.DEV) {
  showRoutes(app)
}

export const inspectedRoutes = inspectRoutes(app)

export default app
