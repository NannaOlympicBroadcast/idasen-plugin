# idasen-plugin

Monorepo for controlling an IKEA Idasen standing desk over Bluetooth, in
three parts that share one SDK and one on-disk config
(`~/.idasen/config.json`: saved desk address + height presets):

| Package | What it is |
| --- | --- |
| [`packages/core`](packages/core) | `idasen-controller` — the Bluetooth SDK (`deskManager`, `deskConfig`, ...) and the `idasen` CLI. Published to npm independently; see its own README for CLI/library usage. |
| [`packages/tray-app`](packages/tray-app) | `idasen-tray` — an Electron app that lives in the system tray: click the tray icon for a small popup to scan/connect, see live height, move up/down/stop, and manage presets. |
| [`packages/cowork-plugin`](packages/cowork-plugin) | `idasen-desk-control` — a Claude Code / Cowork plugin exposing the same controls as MCP tools, via a local stdio MCP server (desk control needs real Bluetooth hardware, so it can't run remotely). |

Both `tray-app` and `cowork-plugin` are thin UIs on top of `packages/core`;
neither duplicates desk-control or config logic.

## Getting started

```bash
npm install          # installs all three workspaces
npm run build         # builds packages/core (dist/cjs, dist/es)
npm test               # runs packages/core's test suite

npm run start -w idasen-tray                        # launch the tray app
claude --plugin-dir ./packages/cowork-plugin          # try the Cowork plugin ad hoc
```

Opening this repo as a trusted Claude Code project auto-registers and
enables the `idasen-desk-control` plugin via `.claude/settings.json` /
`.claude-plugin/marketplace.json` — see
[`packages/cowork-plugin/README.md`](packages/cowork-plugin/README.md) for
details and limits of that mechanism.

See each package's own README for details.
