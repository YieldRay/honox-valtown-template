// import build from "@hono/vite-build/node";
import buildBase from '@hono/vite-build'
import type { Plugin } from 'vite'
import path from 'node:path'
import fs from 'node:fs'

export function honoxBuildWinterTcPlugin(): Plugin {
  return buildBase({
    minify: false,
    entryContentBeforeHooks: [
      async (appName, options) => {
        // Support only WinterTC runtimes
        if (!options) return ''
        const { staticPaths } = options

        let code = /*js*/ `
          import { getMimeType } from "hono/utils/mime";
          `

        const expandedPaths: string[] = []
        for (const staticPath of staticPaths) {
          const result = fs.globSync(
            path.join(process.cwd(), 'dist', staticPath),
          )
          expandedPaths.push(...result)
        }

        for (const staticPath of expandedPaths) {
          // TODO: convert none text files to base64
          const content = fs.readFileSync(staticPath, 'utf-8')

          const use = path.relative(
            path.join(process.cwd(), 'dist'),
            staticPath,
          )
          const routePath = '/' + use.replace(/\\/g, '/')

          code += /*js*/ `
            ${appName}.use('${routePath}', async c => {
              return c.body(${JSON.stringify(content)}, {
                headers: { 'content-type': getMimeType('${routePath.slice(routePath.lastIndexOf('.'))}') }
               });
            })
          `
        }

        return code
      },
    ],
  })
}
