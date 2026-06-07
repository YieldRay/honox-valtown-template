import { reactRenderer } from '@hono/react-renderer'
import { Link, Script } from 'honox/server'

export default reactRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="https://fav.val.run/🔥" />
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" />
      </head>
      <body>{children}</body>
    </html>
  )
})
