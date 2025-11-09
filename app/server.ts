import { showRoutes, inspectRoutes } from 'hono/dev'
import { createApp } from 'honox/server'

const app = createApp()
showRoutes(app)

export const inspectedRoutes = inspectRoutes(app)

export default app
