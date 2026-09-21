# idasen-desk-control (Claude Cowork plugin)

A Claude Code / Cowork plugin that exposes MCP tools to control an IKEA
Idasen standing desk. It is built on `idasen-controller` (`packages/core`),
the same SDK used by the `idasen-tray` app and the `idasen` CLI — all three
read and write the same `~/.idasen/config.json` (saved desk address and
height presets), so a preset you save in the tray app is immediately usable
from Claude, and vice versa.

## Why this must run locally

Controlling the desk requires a direct Bluetooth Low Energy connection from
the machine running the code to the desk. There is no cloud/remote path for
this. Accordingly this plugin's MCP server (`mcp-server.js`) is declared in
`.claude-plugin/plugin.json` as a local **stdio** server (`command`/`args`),
not an `http`/`url` server — per Claude Code's plugin reference, a `command`
based MCP server always runs as a local process on the machine Claude Code
itself is running on, which is required here since it opens a real Bluetooth
adapter.

## Installing it into this project

This repo ships a project-scoped local marketplace so the plugin is
force-enabled for anyone who trusts this folder:

- `.claude-plugin/marketplace.json` (repo root) — declares a marketplace
  named `idasen-plugin-marketplace` whose one plugin, `idasen-desk-control`,
  is sourced from `./packages/cowork-plugin`.
- `.claude/settings.json` (repo root) — registers that marketplace via
  `extraKnownMarketplaces` and force-enables the plugin via
  `enabledPlugins: {"idasen-desk-control@idasen-plugin-marketplace": true}`.

This is the mechanism Claude Code's plugin docs describe for auto-enabling a
project's own plugin for anyone who opens it: it takes effect **after** you
trust this project folder in Claude Code — that workspace-trust prompt is a
security gate the settings file cannot skip. There is no supported way to
bypass that trust prompt itself; "force install" here means "no extra step
beyond trusting the folder," not "installed without your awareness."

You can also load it ad hoc in any project without editing its settings:

```bash
claude --plugin-dir ./packages/cowork-plugin
```

## Tools

- `scan_desks` — scan nearby Bluetooth devices for an Idasen desk
- `connect_desk` — connect (and save the address, shared with the tray app/CLI)
- `get_desk_status` — current height (cm) and speed (cm/s)
- `move_desk_to` — move to an exact height in cm
- `move_desk_up` / `move_desk_down` / `stop_desk`
- `list_presets` / `save_preset` / `delete_preset` / `goto_preset`

## Verified vs. not verified

The MCP protocol wiring (tool registration, JSON-RPC over stdio, all 11
tools) was exercised end-to-end with a real `@modelcontextprotocol/sdk`
client against a temporary stand-in for `idasen-controller`, since this
sandbox has no Bluetooth hardware and the real SDK opens a Bluetooth socket
as soon as it's imported. That stand-in was only used for the test and is
not part of the shipped plugin. Actual desk control over Bluetooth has not
been exercised — please test that part on a machine with the desk in range.
