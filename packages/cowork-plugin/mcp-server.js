#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { deskManager, deskConfig } from 'idasen-controller';

const server = new McpServer({
  name: 'idasen-desk-control',
  version: '1.0.0'
});

const text = (payload) => ({
  content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }]
});

const errorText = (error) => ({
  isError: true,
  content: [{ type: 'text', text: error.message || String(error) }]
});

const requireConnection = () => {
  if (!deskManager.deskController) {
    throw new Error('Not connected to a desk. Call connect_desk first (use scan_desks or the desk ID saved by the idasen-tray app / CLI).');
  }
};

server.tool(
  'scan_desks',
  'Scan nearby Bluetooth devices for an Idasen desk. Requires this MCP server to run on the machine physically near the desk.',
  {},
  async () => {
    try {
      const devices = await deskManager.getAvailableDevices();
      const desks = devices
        .map((device) => ({
          name: device?.advertisement?.localName || device?.name || 'Unnamed device',
          id: device?.id || device?.uuid || device?.address
        }))
        .filter((device) => device.name.toLowerCase().includes('desk') || device.name.toLowerCase().includes('idasen'));
      return text(desks.length > 0 ? desks : { message: 'No Idasen desks found nearby.' });
    } catch (error) {
      return errorText(error);
    }
  }
);

server.tool(
  'connect_desk',
  'Connect to a desk by its Bluetooth ID (from scan_desks) and save it, shared with the idasen-tray app and the idasen CLI via ~/.idasen/config.json.',
  { deskId: z.string().describe('Desk Bluetooth ID/address returned by scan_desks, or omit to reuse the previously saved desk') },
  async ({ deskId }) => {
    try {
      const config = deskConfig.loadConfig();
      const id = deskId || config.deskId;
      if (!id) {
        throw new Error('No deskId given and no desk saved yet. Run scan_desks first.');
      }
      const result = await deskManager.connectAsync(id);
      if (result === 'success') {
        config.deskId = id;
        deskConfig.saveConfig(config);
      }
      return text({ result, deskId: id });
    } catch (error) {
      return errorText(error);
    }
  }
);

server.tool(
  'get_desk_status',
  'Get the desk\'s current height (cm) and movement speed (cm/s).',
  {},
  async () => {
    try {
      requireConnection();
      const { height, speed } = await deskManager.deskController.desk.getCurrentHeightAndSpeedAsync();
      return text({ heightCm: Number(height.toFixed(2)), speedCmPerSec: Number((speed * 100).toFixed(4)) });
    } catch (error) {
      return errorText(error);
    }
  }
);

server.tool(
  'move_desk_to',
  'Move the desk to an exact height in centimeters (safe range ~62-127 cm).',
  { heightCm: z.number().describe('Target height in centimeters') },
  async ({ heightCm }) => {
    try {
      requireConnection();
      await deskManager.deskController.moveToAsync(heightCm / 100);
      return text({ result: 'ok', heightCm });
    } catch (error) {
      return errorText(error);
    }
  }
);

server.tool(
  'move_desk_up',
  'Start moving the desk up. Continues until stop_desk is called.',
  {},
  async () => {
    try {
      requireConnection();
      await deskManager.deskController.moveUpAsync();
      return text({ result: 'moving up' });
    } catch (error) {
      return errorText(error);
    }
  }
);

server.tool(
  'move_desk_down',
  'Start moving the desk down. Continues until stop_desk is called.',
  {},
  async () => {
    try {
      requireConnection();
      await deskManager.deskController.moveDownAsync();
      return text({ result: 'moving down' });
    } catch (error) {
      return errorText(error);
    }
  }
);

server.tool(
  'stop_desk',
  'Stop any desk movement immediately.',
  {},
  async () => {
    try {
      requireConnection();
      await deskManager.deskController.stopAsync();
      return text({ result: 'stopped' });
    } catch (error) {
      return errorText(error);
    }
  }
);

server.tool(
  'list_presets',
  'List saved height presets (shared with the idasen-tray app and the idasen CLI).',
  {},
  async () => {
    try {
      const config = deskConfig.loadConfig();
      return text(config.presets || {});
    } catch (error) {
      return errorText(error);
    }
  }
);

server.tool(
  'save_preset',
  'Save a named height preset. Omit heightCm to save the desk\'s current height.',
  {
    name: z.string().describe('Preset name, e.g. "standing" or "sitting"'),
    heightCm: z.number().optional().describe('Height in centimeters; defaults to the desk\'s current height')
  },
  async ({ name, heightCm }) => {
    try {
      let height = heightCm;
      if (height === undefined) {
        requireConnection();
        const status = await deskManager.deskController.desk.getCurrentHeightAndSpeedAsync();
        height = Number(status.height.toFixed(1));
      }
      const config = deskConfig.loadConfig();
      config.presets = config.presets || {};
      config.presets[name] = height;
      deskConfig.saveConfig(config);
      return text({ result: 'saved', name, heightCm: height });
    } catch (error) {
      return errorText(error);
    }
  }
);

server.tool(
  'delete_preset',
  'Delete a saved height preset by name.',
  { name: z.string() },
  async ({ name }) => {
    try {
      const config = deskConfig.loadConfig();
      config.presets = config.presets || {};
      if (!(name in config.presets)) {
        throw new Error(`Preset "${name}" not found.`);
      }
      delete config.presets[name];
      deskConfig.saveConfig(config);
      return text({ result: 'deleted', name });
    } catch (error) {
      return errorText(error);
    }
  }
);

server.tool(
  'goto_preset',
  'Move the desk to a saved preset height by name.',
  { name: z.string() },
  async ({ name }) => {
    try {
      const config = deskConfig.loadConfig();
      const heightCm = config.presets && config.presets[name];
      if (heightCm === undefined) {
        throw new Error(`Preset "${name}" not found.`);
      }
      requireConnection();
      await deskManager.deskController.moveToAsync(heightCm / 100);
      return text({ result: 'ok', name, heightCm });
    } catch (error) {
      return errorText(error);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
