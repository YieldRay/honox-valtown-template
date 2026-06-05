import { builtinModules } from 'node:module'
import { type Plugin } from 'vite'

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
