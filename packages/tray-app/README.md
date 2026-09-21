# idasen-tray

Electron app that lives in the system tray and controls an IKEA Idasen desk.
It is a thin UI on top of the `idasen-controller` package (`packages/core`),
which is the shared SDK also used by the CLI and the Cowork plugin — they all
read/write the same `~/.idasen/config.json` (saved desk address and presets).

## Behavior

- Runs as a tray-only app: no dock icon (macOS) and no taskbar entry.
- Click the tray icon to pop open the control window near it; clicking
  outside, or closing the window, collapses it back into the tray instead of
  quitting.
- Scan for a desk, connect, see live height/speed, move up/down/stop, jump to
  an exact height, and save/apply/delete presets.

## Running

```bash
npm install   # from the repo root; installs all workspaces
npm run start -w idasen-tray
```

`idasen-controller`'s dependency `@abandonware/noble` uses a native addon.
Electron bundles its own Node/V8 build with a different native module ABI
than the system Node, so native addons must be rebuilt for Electron. This
package's `postinstall` script runs `electron-rebuild` automatically after
`npm install`; if you ever see a `NODE_MODULE_VERSION` mismatch error,
re-run it manually:

```bash
npm run postinstall -w idasen-tray
```

## Known limitations / not verified here

This was built and syntax/launch-checked in a sandboxed container with no
Bluetooth hardware and no real display server, so:

- Actual desk scanning/connection over Bluetooth has not been exercised —
  only the module-loading and Electron startup path was verified (headless,
  under Xvfb) up to the point where the OS reports no Bluetooth support.
- The window/tray UI has not been visually verified on a real desktop
  session. Please try it locally and report anything that looks off.
