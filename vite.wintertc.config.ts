import path from 'node:path'
import { builtinModules } from 'node:module'
import { defineConfig, type Plugin } from 'vite'
import buildBase from '@hono/vite-build'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import fs from 'node:fs'

/**
 * @file
 * This is a Vite config only for WinterTC runtimes.
 * Using this config, the code should work in runtimes that have no Node.js built-in modules support.
 * It will bundle all code and assets into a single file at `dist/index.js`.
 *
 * If you are not targeting WinterTC runtimes, you are safe to remove this file.
 */

export default defineConfig(({ command, mode }) => {
  return {
    build: {
      target: 'esnext',
      rollupOptions: {
        external: mode === 'client' ? [] : ['honox/vite'],
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    ssr: {
      target: 'webworker',
      noExternal: true,
      external: [],
    },
    plugins: [
      removeNodeExternalization(),
      replaceNodeBuiltins(),
      honox({
        client: { input: ['/app/client.ts', '/app/style.css'] },
      }),
      tailwindcss(),
      honoxBuild(),
    ],
  }
})

function honoxBuild(): Plugin {
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

/**
 * `@hono/vite-build` forces all `node:` imports to be external (by adding a regex `/^node:/` to rollupOptions.external),
 * which prevents your plugin or alias from ever seeing or intercepting them.
 */
function removeNodeExternalization(): Plugin {
  return {
    name: 'remove-node-externalization',
    configResolved(config) {
      const external = config.build.rollupOptions?.external
      if (Array.isArray(external)) {
        for (let i = external.length - 1; i >= 0; i--) {
          const e = external[i]
          if (
            e === 'node:async_hooks' ||
            (e instanceof RegExp && e.test('node:async_hooks'))
          ) {
            external.splice(i, 1)
          }
        }
      }
      const ssrExternal = config.ssr?.external
      if (Array.isArray(ssrExternal)) {
        for (let i = ssrExternal.length - 1; i >= 0; i--) {
          const e = ssrExternal[i]
          if (e === 'node:async_hooks') {
            ssrExternal.splice(i, 1)
          }
        }
      }
    },
  }
}

export function replaceNodeBuiltins(): Plugin {
  return {
    name: 'replace-node-builtins',
    enforce: 'pre',
    resolveId(source) {
      if (source === 'node:async_hooks') {
        return { id: '\0virtual:node-mock:async_hooks' }
      }
      if (source === '\0virtual:node-mock:async_hooks') {
        return source
      }
      if (source.startsWith('node:') || builtinModules.includes(source)) {
        return { id: '\0virtual:node-mock:' + source.replace(/^node:/, '') }
      }
    },
    load(id) {
      // we must patch async_hooks since it is not exists in worker environment,
      // but required by honox
      if (id === '\0virtual:node-mock:async_hooks') {
        return `export class AsyncLocalStorage { run(store, callback) { this._store = store; return callback() } getStore() { return this._store } }`
      }
      if (id.startsWith('\0virtual:node-mock:')) {
        return `export default {}`
      }
    },
  }
}
