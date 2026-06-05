import {
  defineConfig,
  type BuildEnvironmentOptions,
  type SSROptions,
} from 'vite'
import { dependencies, devDependencies } from './package.json'
import honox from 'honox/vite'
import tailwindcss from '@tailwindcss/vite'
import { rewriteEsmImportForBundlePlugin } from './vite-plugins/rewrite-esm-import-for-bundle'
import { honoxBuildPlugin } from './vite-plugins/hono-build'
import { honoxBuildWinterTcPlugin } from './vite-plugins/hono-build-wintertc'
import { polyfillNodeBuiltinModulesPlugin } from './vite-plugins/polyfill-node-builtin-modules'

/**
 * currently, we use vite's mode to determine which build target to build for.
 * we are NOT using the vite environment api yet
 * see https://cn.vite.dev/guide/api-environment
 */
const VITE_MODES = [
  /**
   * the honox plugin will build static assets for client
   */
  'client',
  /**
   * build the hono server for node/bun/deno
   */
  'node',
  /**
   * build the hono server for deno, will also compatible with val.town
   */
  'deno',
  /**
   * build the hono server for WinterTC runtimes
   */
  'wintertc',
] as const

export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {
  if (command === 'serve') {
    // vite's mode defaults to 'development' when command is 'serve' (vite dev), and 'production' when command is 'build' (vite build)
    // see https://vite.dev/config/shared-options#mode
    // we force it to 'node' for vite dev
    mode = 'node'
  }
  if (!VITE_MODES.includes(mode as (typeof VITE_MODES)[number])) {
    throw new Error(
      `Invalid vite mode: '${mode}'. Please use one of ${VITE_MODES.join(', ')}.`,
    )
  }

  const deps = new Set([
    ...Object.keys(dependencies),
    ...Object.keys(devDependencies),
  ])
  deps.delete('honox') // honox is a virtual module

  // ----- vite external -----
  let external: (BuildEnvironmentOptions['rollupOptions'] & {})['external'] = []

  if (mode === 'node' || mode === 'deno') {
    external = Array.from(deps).map(
      // match all imports from the package, including subpath imports, but exclude raw imports (e.g. import xxx from 'xxx?raw')
      (pkg) => new RegExp(`^${pkg}(/.*)?$(?<!\\?raw)$`),
    )
  } else if (mode === 'wintertc') {
    external = ['honox/vite']
  }

  // ----- vite ssr -----
  let ssr: SSROptions | undefined = undefined
  if (mode === 'wintertc') {
    ssr = {
      target: 'webworker',
      noExternal: true,
      external: [],
    }
  }
  // ----- vite -----
  return {
    build: {
      target: 'esnext',
      rollupOptions: {
        external,
        output: {
          // codeSplitting: true,
          // preserveModules: true,
        },
      },
    },
    ssr,
    plugins: [
      mode === 'wintertc' && polyfillNodeBuiltinModulesPlugin(),
      honox({ client: { input: ['/app/client.ts', '/app/style.css'] } }),
      mode === 'wintertc'
        ? honoxBuildWinterTcPlugin({ base64: true })
        : honoxBuildPlugin(),
      mode === 'deno' &&
        rewriteEsmImportForBundlePlugin({
          rewriteExportDefault: mode === 'deno',
        }),
      tailwindcss(),
    ],
    commonjsOptions: {
      transformMixedEsModules: mode === 'wintertc' ? true : undefined,
    },
  }
})
