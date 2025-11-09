import { defineConfig } from 'vite'
import { dependencies, devDependencies } from './package.json'
import { plugins } from './vite-honox.ts'
import esmImportRewriter from './vite-import.ts'

export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {
  const deps = new Set([
    ...Object.keys(dependencies),
    ...Object.keys(devDependencies),
  ])
  deps.delete('honox') // honox is a virtual module
  const external =
    mode === 'client'
      ? [] // bundle everything for client, while external everything for server
      : Array.from(deps).map((pkg) => new RegExp(`^${pkg}(/.*)?$(?<!\\?raw)$`))

  return {
    build: {
      target: 'esnext',
      rollupOptions: {
        external,
      },
    },
    plugins: [
      ...plugins,
      mode === 'deno' &&
        esmImportRewriter({
          rewriteExportDefault: mode === 'deno',
          version(packageName) {
            // @ts-ignore
            return dependencies[packageName] || devDependencies[packageName]
          },
        }),
    ],
  }
})
