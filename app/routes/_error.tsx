import type { ErrorHandler } from "hono"

const handler: ErrorHandler = (e, c) => {
  if ("getResponse" in e) {
    return e.getResponse()
  }

  console.error(e)
  c.status(500)

  return c.render(<h1>500 Internal Server Error</h1>)
}

export default handler
