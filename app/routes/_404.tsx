import type { NotFoundHandler } from "hono"

const handler: NotFoundHandler = (c) => {
  c.status(404)
  return c.render(<h1>404 Not Found</h1>)
}

export default handler
