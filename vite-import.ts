import { builtinModules } from 'node:module'
import ts from 'typescript'
import MagicString from 'magic-string'
import type { Plugin } from 'vite'

export default function esmImportRewriterPlugin(options?: {
  ignore?: (packageName: string) => boolean
  version?: (packageName: string) => string
  rewriteExportDefault?: boolean
}): Plugin {
  const builtins = new Set(builtinModules)
  const { ignore } = options || {}

  function isBareImport(moduleName: string): boolean {
    if (!moduleName) return false
    if (moduleName.startsWith('.')) return false
    if (moduleName.startsWith('/')) return false
    if (moduleName.startsWith('node:')) return false
    if (moduleName.startsWith('npm:')) return false
    return true
  }

  function isNodeModule(moduleName: string): boolean {
    const coreModule = moduleName.split('/')[0]
    return builtins.has(coreModule)
  }

  function rewriteModule(moduleName: string): string {
    //! If the module is a scoped package, return it as is
    if (moduleName.startsWith('#')) {
      return moduleName
    }

    if (!isBareImport(moduleName)) {
      return moduleName
    }

    if (isNodeModule(moduleName)) {
      return `node:${moduleName}`
    }

    // @scope/pkg/subpath -> npm:@scope/pkg@version/subpath
    const packageName = moduleName.split('/')[0].startsWith('@')
      ? moduleName.split('/').slice(0, 2).join('/')
      : moduleName.split('/')[0]

    const version = options?.version?.(packageName)

    if (version) {
      return `npm:${packageName}@${version}${moduleName.slice(
        packageName.length
      )}`
    } else {
      return `npm:${moduleName}`
    }
  }

  return {
    name: 'vite-plugin-esm-import-rewriter',

    generateBundle(_options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        // Only process JS chunks
        if (chunk.type !== 'chunk') continue

        const code = chunk.code

        const sourceFile = ts.createSourceFile(
          fileName,
          code,
          ts.ScriptTarget.Latest,
          true
        )

        const s = new MagicString(code)
        let hasChanges = false

        function visit(node: ts.Node) {
          // import ... from 'module'
          if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
            if (ts.isStringLiteral(node.moduleSpecifier)) {
              const moduleName = node.moduleSpecifier.text

              //! apply ignore filter
              if (ignore?.(moduleName)) return

              const rewritten = rewriteModule(moduleName)
              if (rewritten !== moduleName) {
                const start = node.moduleSpecifier.getStart(sourceFile) + 1
                const end = node.moduleSpecifier.getEnd() - 1
                s.overwrite(start, end, rewritten)
                hasChanges = true

                console.log(
                  `[esm-import-rewriter] ${moduleName} -> ${rewritten}`
                )
              }
            }
          }

          // export ... from 'module'
          if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
            if (ts.isStringLiteral(node.moduleSpecifier)) {
              const moduleName = node.moduleSpecifier.text
              //! apply ignore filter
              if (ignore?.(moduleName)) return

              const rewritten = rewriteModule(moduleName)
              if (rewritten !== moduleName) {
                const start = node.moduleSpecifier.getStart(sourceFile) + 1
                const end = node.moduleSpecifier.getEnd() - 1
                s.overwrite(start, end, rewritten)
                hasChanges = true

                console.log(
                  `[esm-import-rewriter] ${moduleName} -> ${rewritten}`
                )
              }
            }
          }

          if (options?.rewriteExportDefault && ts.isExportDeclaration(node)) {
            // now it is: export default mainApp | export { mainApp as default }
            // we should set to export default mainApp.fetch

            if (node.exportClause && ts.isNamedExports(node.exportClause)) {
              const start = node.getStart(sourceFile)
              const end = node.getEnd()
              s.overwrite(
                start,
                end,
                [
                  'const defaultExport = mainApp.fetch.bind(mainApp);',
                  'defaultExport.fetch = defaultExport;',
                  'export { defaultExport as default };',
                ].join('\n')
              )
              hasChanges = true
              console.log(`[esm-import-rewriter] export default mainApp.fetch`)
            }
          }

          ts.forEachChild(node, visit)
        }

        visit(sourceFile)

        if (hasChanges) {
          chunk.code = s.toString()
          // Update source map if it exists
          if (chunk.map) {
            chunk.map = s.generateMap({ hires: true })
          }
        }
      }
    },
  }
}
