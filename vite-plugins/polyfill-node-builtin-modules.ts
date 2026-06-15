import { type Plugin } from 'vite'
import { isBuiltin, builtinModules, createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const NAME = 'polyfill-node-builtin-modules'
const PREFIX = `\0virtual:${NAME}:`

function log(...args: any[]) {
  console.log(`[${NAME}]`, ...args)
}

/**
 * Some node built-in modules are not fully polyfilled by unenv/node (or we just should not use them).
 * We implement them ourselves and replace the imports with the polyfill code.
 */
const REPLACE_MAP: Record<string, string> = {
  //! WARNING: this polyfill should only be used for isolate-per-request runtimes,
  //! NEVER use it in a long-running server environment since it does not properly implement the async context management.
  async_hooks: /*js*/ `\
    export class AsyncLocalStorage {
      run(store, callback) {
        this._store = store
        return callback()
      }
      getStore() {
        return this._store
      }
    }
    export class AsyncResource {
      constructor(type, triggerAsyncId) {}
      static bind(fn, type, thisArg) { return fn.bind(thisArg) }
      bind(fn) { return fn }
      runInAsyncScope(fn, thisArg, ...args) { return fn.apply(thisArg, args) }
      emitDestroy() { return this }
      asyncId() { return 0 }
      triggerAsyncId() { return 0 }
    }
    `,
}

function removeNodeBuiltinModulesFromExternal(
  external: Array<string | RegExp>,
) {
  for (let i = external.length - 1; i >= 0; i--) {
    const item = external[i]
    if (
      builtinModules.some(
        (m) => m === item || (item instanceof RegExp && item.test(m)),
      )
    ) {
      external.splice(i, 1)
    }
  }
}

export function polyfillNodeBuiltinModulesPlugin(): Plugin {
  return {
    name: NAME,
    enforce: 'pre',
    // honox plugin will mark all node built-in modules as external,
    // but for WinterTC runtimes, we need to bundle them and polyfill them with unenv/node
    configResolved(config) {
      const external = config.build.rollupOptions?.external! as Array<
        string | RegExp
      >
      log(`before: config.build.rollupOptions.external = `, external)
      removeNodeBuiltinModulesFromExternal(external)
      log(`after: config.build.rollupOptions.external = `, external)

      const ssrExternal = config.ssr?.external! as Array<string | RegExp>
      log(`before: config.ssr.external = `, ssrExternal)
      removeNodeBuiltinModulesFromExternal(ssrExternal)
      log(`after: config.ssr.external = `, ssrExternal)
    },
    resolveId(source) {
      if (!isBuiltin(source)) return

      const moduleName = source.startsWith('node:') ? source.slice(5) : source

      if (Object.keys(REPLACE_MAP).includes(moduleName)) {
        return {
          id: PREFIX + moduleName,
          moduleSideEffects: false,
        }
      }

      return {
        // unenv should be a dev dependency
        id: require.resolve('unenv/node/' + moduleName),
        moduleSideEffects: false,
      }
    },

    load(id) {
      if (id.startsWith(PREFIX)) {
        const moduleName = id.slice(PREFIX.length)
        return REPLACE_MAP[moduleName]
      }
    },
  }
}
