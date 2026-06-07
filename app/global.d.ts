import type {} from 'hono'

declare module 'hono' {
  interface Env {
    Variables: {}
    Bindings: {}
  }
}

import '@hono/react-renderer'

declare module '@hono/react-renderer' {
  interface Props {
    title?: string
  }
}
