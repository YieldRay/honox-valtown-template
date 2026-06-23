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
  embedding?: boolean | BufferEncoding
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
            import { serveStatic } from "hono/serve-static";
          `

        if (embedding) {
          const encoding = embedding === true ? 'utf-8' : embedding
          // by default, we embed it as plain text (utf-8)
          const embeddingAssets = getEmbeddedAssets(staticPaths ?? [], encoding)

          switch (encoding) {
            case 'base64':
              code += /*js*/ `\
                function __decodeAsset(b64) {
                  const bin = atob(b64)
                  const out = new Uint8Array(bin.length)
                  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
                  return out
                }`
              break
            case 'base64url':
              code += /*js*/ `\
                function __decodeAsset(b64url) {
                  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
                  const bin = atob(b64)
                  const out = new Uint8Array(bin.length)
                  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
                  return out
                }`
              break
            case 'hex':
              code += /*js*/ `\
                function __decodeAsset(hex) {
                  const out = new Uint8Array(hex.length / 2)
                  for (let i = 0; i < hex.length; i += 2) {
                    out[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16)
                  }
                  return out
                }`
              break
            default:
              code += /*js*/ `\
                function __decodeAsset(content) { return content };`
              break
          }

          code += /*js*/ `
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
              const asset = __embeddingAssets[path];
              return __decodeAsset(asset);
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

        code += /*js*/ `const serveStaticCommon = serveStatic({ getContent(path) { return readFile(path) } });`

        for (const path of staticPaths ?? []) {
          //! Skip hidden files
          if (path.split('/').some((part) => part.startsWith('.'))) continue

          code += /*js*/ `${appName}.use('${path}', serveStaticCommon);`
        }
        return code
      },
    ],
    entryContentAfterHooks: [
      // https://github.com/h3js/srvx
      async (appName) => {
        if (!launch) return ''

        return /*js*/ `\
          import { serve } from '@hono/node-server';
          if (typeof Deno === 'undefined' && typeof Bun === 'undefined') {
            const port = process.env.PORT ? Number(process.env.PORT) : 9090;
            console.log('Server is running on http://localhost:' + port);
            serve({ fetch: ${appName}.fetch, port });
          }
        `
      },
    ],
  })
}

function getEmbeddedAssets(
  staticPaths: string[],
  embedding: BufferEncoding = 'utf-8',
) {
  const assets: Record<string, string> = {}
  // $vite-root/dist is the output directory of the build
  const root = path.join(process.cwd(), 'dist')
  for (const staticPath of staticPaths) {
    for (const filePath of fs.globSync(path.join(root, staticPath))) {
      const content = fs.readFileSync(filePath)

      assets[path.relative(root, filePath).replaceAll('\\', '/')] =
        content.toString(embedding)
    }
  }
  return assets
}
