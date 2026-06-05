// import build from "@hono/vite-build/node";
import buildBase from '@hono/vite-build'
import type { Plugin } from 'vite'
import path from 'node:path'
import fs from 'node:fs'

export function honoxBuildWinterTcPlugin(
  {
    base64,
  }: {
    base64?: boolean
  } = {
    base64: false,
  },
): Plugin {
  return buildBase({
    minify: false,
    entryContentBeforeHooks: [
      async (appName, options) => {
        // Support only WinterTC runtimes
        if (!options) return ''
        const { staticPaths } = options

        let code = /*js*/ `
          import { getMimeType } from "hono/utils/mime";
          function b64ToBytes(b64) {
            const bin = atob(b64)
            const out = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
            return out
          }
          `

        const expandedPaths: string[] = []
        for (const staticPath of staticPaths) {
          const result = fs.globSync(
            path.join(process.cwd(), 'dist', staticPath),
          )
          expandedPaths.push(...result)
        }

        for (const staticPath of expandedPaths) {
          if (staticPath.startsWith('.')) continue

          const routePath = path.relative(
            path.join(process.cwd(), 'dist'),
            staticPath,
          )

          //! Skip hidden files
          if (routePath.split(path.sep).some((part) => part.startsWith('.')))
            continue

          const use = '/' + routePath.replace(/\\/g, '/')
          const ext = use.slice(use.lastIndexOf('.'))

          code += /*js*/ `
            ${appName}.use(${JSON.stringify(use)}, async c => {
              return c.body(
                ${base64 ? `b64ToBytes('${fs.readFileSync(staticPath, 'base64')}')` : JSON.stringify(fs.readFileSync(staticPath, 'utf-8'))},
                { headers: { 'content-type': getMimeType(${JSON.stringify(ext)}) || 'application/octet-stream' } }
              );
            })
          `
        }

        return code
      },
    ],
  })
}
