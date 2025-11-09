# honox-valtown-template

A template project for building SSR applications using Honox and can deploy to val.town.

# Develop

```sh
npm install
# or
bun install
# or
deno install
```

```sh
npm run dev
# or
bun run dev
# or
deno run dev
```

# Build

Target to Node.js / Bun / Deno (BYONM)

```sh
npm run build
# or
bun run build
# or
deno run build
```

Target to Deno / val.town

```sh
npm run build:deno
# or
deno run build:deno
```

# Deploy

The deployable files are in the `dist` directory.

Run `dist/index.js` to start the server.

```sh
node dist/index.js
# or
bun dist/index.js
# or
deno serve -A dist/index.js
```

To deploy to val.town, you can use the `vt` CLI.

```sh
cd dist
vt push
```
