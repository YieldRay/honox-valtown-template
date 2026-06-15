// import build from "@hono/vite-build/node";
import buildBase from '@hono/vite-build'
import type { Plugin } from 'vite'
import path from 'node:path'
import fs from 'node:fs'

interface Options {
  minify?: boolean
  /**
   * Whether to embed static assets into the bundle. If true, it will embed as text, if 'base64', it will embed as base64.
   * Embedding is useful for runtimes that do not have a good way to read files, such as WinterTC.
   */
  embedding?: boolean | 'text' | 'base64'
  launch?: boolean
}

/**
 * Replacement for `@hono/vite-build/node` that supports both node and deno, and also supports static file serving.
 *
 * https://github.com/honojs/vite-plugins/blob/main/packages/build/src/adapter/node/index.ts
 */
export function honoxBuildPlugin(options?: Options): Plugin {
  const { minify = false, embedding = false, launch = false } = options || {}

  return buildBase({
    minify,
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
          `

        if (embedding) {
          // by default, we embed as text, but if embedding is true, we embed as base64 to support binary files
          const isBase64 = embedding === 'base64'
          const embeddingAssets = getEmbeddedAssets(
            staticPaths ?? [],
            isBase64 ? 'base64' : 'text',
          )

          code += /*js*/ `
            function __b64ToBytes(b64) {
              const bin = atob(b64)
              const out = new Uint8Array(bin.length)
              for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
              return out
            }
            const __embeddingAssets = ${JSON.stringify(embeddingAssets)};
            const readFile = async (path) => {
              if (!(path in __embeddingAssets)) {
                const err = new Error("ENOENT: no such file or directory, open " + "'" + path + "'");
                err.errno = -2;
                err.code = 'ENOENT';
                err.syscall = 'open';
                err.path = path;
                throw err;
              }
              const content = __embeddingAssets[path]
              return ${isBase64 ? '__b64ToBytes(content)' : 'content'};
            }
          `
        } else {
          code += /*js*/ `
            const VALTOWN_ENTRYPOINT = process.env.VALTOWN_ENTRYPOINT;
            const readFile = async (path) => {
              if (VALTOWN_ENTRYPOINT) {
                const { readFile: vtReadFile } = await import('https://esm.town/v/std/utils/index.ts');
                return await vtReadFile(path, VALTOWN_ENTRYPOINT);
              } else {
                const __filename = fileURLToPath(import.meta.url);
                const __dirname = dirname(__filename);
                return await fsReadFile(join(__dirname, path));
              }
            }
          `
        }

        code += /*js*/ `
          const __cFile = async (c, route, ext) => {
            const headers = { 'content-type': getMimeType(ext) };
            let file;
            try {
              file = await readFile(route);
            } catch (err) {
              if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
                return c.text('Not Found', 404);
              }
              throw err;
            }
            return c.body(file, { headers });
          }
        `

        for (const path of staticPaths ?? []) {
          //! Skip hidden files
          if (path.split('/').some((part) => part.startsWith('.'))) continue

          if (path.endsWith('/*')) {
            code += /*js*/ `
                ${appName}.use('${path}', c => {
                  const url = new URL(c.req.url);
                  const filePath = url.pathname.slice(1);
                  const ext = filePath.slice(filePath.lastIndexOf('.'));
                  return __cFile(c, filePath, ext);
                })
              `
          } else {
            const filePath = path.slice(1)
            const ext = filePath.slice(filePath.lastIndexOf('.'))
            code += /*js*/ `
                ${appName}.use('${path}', c => {
                  return __cFile(c, '${filePath}', '${ext}');
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
        if (!launch) return ''

        return /*js*/ `
            import { serve } from '@hono/node-server';
            const port = process.env.PORT ? Number(process.env.PORT) : 9090;
            console.log('Server is running on http://localhost:' + port);
            serve({ fetch: ${appName}.fetch, port });
        `
      },
    ],
  })
}

function getEmbeddedAssets(
  staticPaths: string[],
  embedding: 'text' | 'base64',
) {
  const assets: Record<string, string> = {}
  // $vite-root/dist is the output directory of the build
  const root = path.join(process.cwd(), 'dist')
  for (const staticPath of staticPaths) {
    for (const filePath of fs.globSync(path.join(root, staticPath))) {
      const content = fs.readFileSync(filePath)

      assets[path.relative(root, filePath).replace(/\\/g, '/')] =
        embedding === 'base64' ? content.toString('base64') : content.toString()
    }
  }
  return assets
}
