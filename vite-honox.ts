// import build from "@hono/vite-build/node";
import buildBase from '@hono/vite-build'
import adapter from '@hono/vite-dev-server/node'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import type { Plugin } from 'vite'

export const plugins = [
  honox({
    devServer: { adapter },
    client: { input: ['/app/client.ts', '/app/style.css'] },
  }),
  tailwindcss(),
  // build(),
  // https://github.com/honojs/vite-plugins/blob/main/packages/build/src/adapter/node/index.ts
  honoxBuild(),
]

function honoxBuild(): Plugin {
  return buildBase({
    minify: false,
    entryContentBeforeHooks: [
      async (appName, options) => {
        // Support both val.town and node/deno/bun
        if (!options) return ''
        const { staticPaths } = options
        let code = /*js*/ `
            import process from "node:process";
            import { fileURLToPath } from "node:url";
            import { join, dirname } from "node:path";
            import { readFile as fsReadFile } from "node:fs/promises";
            import { getMimeType } from "hono/utils/mime";
            const VALTOWN_ENTRYPOINT = process.env.VALTOWN_ENTRYPOINT;
            const readFile = async (path) => {
              if (VALTOWN_ENTRYPOINT) {
                const {readFile: vtReadFile } = await import('https://esm.town/v/std/utils/index.ts');
                return await vtReadFile(path, VALTOWN_ENTRYPOINT);
              } else {
                const __filename = fileURLToPath(import.meta.url);
                const __dirname = dirname(__filename);
                return await fsReadFile(join(__dirname, path));
              }
            }
          `
        for (const path of staticPaths ?? []) {
          if (path.endsWith('/*')) {
            code += /*js*/ `
                ${appName}.use('${path}', async c => {
                  const url = new URL(c.req.url);
                  const filePath = url.pathname.slice(1);
                  const ext = filePath.slice(filePath.lastIndexOf('.'));
                  const headers = { 'content-type': getMimeType(ext) };
                  return c.body(await readFile(filePath), { headers });
                })
              `
          } else {
            const filePath = path.slice(1)
            const ext = filePath.slice(filePath.lastIndexOf('.'))
            code += /*js*/ `
                ${appName}.use('${path}', async c => {
                  const headers = { 'content-type': getMimeType('${ext}') };
                  return c.body(await readFile('${filePath}'), { headers });
                })
              `
          }
        }
        return code
      },
    ],
    entryContentAfterHooks: [
      // https://github.com/h3js/srvx
      async (appName) => {
        return /*js*/ `
          if (typeof Bun === 'undefined' && typeof Deno === 'undefined') {
              const { serve } = await import('@hono/node-server');
              const port = process.env.PORT ? Number(process.env.PORT) : 3000;
              console.log('Server is running on http://localhost:' + port);
              serve({ fetch: ${appName}.fetch, port });
            }
        `
      },
    ],
  })
}
