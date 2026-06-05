import { type Plugin } from 'vite'
import { fileURLToPath } from 'node:url'

const resolve = (m: string) => fileURLToPath(import.meta.resolve(m))

const NAME = 'alias-react-to-hono'
const PREFIX = `\0virtual:${NAME}:`

export function aliasReactToHonoPlugin(): Plugin {
  return {
    name: NAME,
    enforce: 'pre',
    config() {
      return {
        resolve: {
          alias: {
            react: 'hono/jsx',
            'react/jsx-runtime': 'hono/jsx/jsx-runtime',
            'react-dom/client': 'hono/jsx/dom',
          },
        },
      }
    },
    resolveId(source) {
      if (source === 'react') {
        return {
          id: resolve('hono/jsx'),
          moduleSideEffects: false,
        }
      } else if (source === 'react-dom/client') {
        return {
          id: resolve('hono/jsx/dom'),
          moduleSideEffects: false,
        }
      } else if (source === 'react/jsx-runtime') {
        return {
          id: resolve('hono/jsx/jsx-runtime'),
          moduleSideEffects: false,
        }
      }
    },
  }
}
