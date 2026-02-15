import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'

export default jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="https://fav.val.run/🔥" />
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" />

        {/* @start DELETE_ME */}
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
        {/* @end DELETE_ME */}
      </head>
      <body>{children}</body>
    </html>
  )
})
