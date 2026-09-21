const heightReadout = document.getElementById('height-readout');
const speedReadout = document.getElementById('speed-readout');
const connectionDot = document.getElementById('connection-dot');
const scanBtn = document.getElementById('scan-btn');
const deviceSelect = document.getElementById('device-select');
const connectBtn = document.getElementById('connect-btn');
const upBtn = document.getElementById('up-btn');
const downBtn = document.getElementById('down-btn');
const stopBtn = document.getElementById('stop-btn');
const heightInput = document.getElementById('height-input');
const moveBtn = document.getElementById('move-btn');
const presetList = document.getElementById('preset-list');
const presetNameInput = document.getElementById('preset-name');
const presetAddBtn = document.getElementById('preset-add-btn');
const errorLine = document.getElementById('error-line');

let isConnected = false;
let pollTimer = null;

const showError = (error) => {
  errorLine.textContent = error ? (error.message || String(error)) : '';
};

const setConnected = (connected) => {
  isConnected = connected;
  connectionDot.classList.toggle('connected', connected);
  [upBtn, downBtn, stopBtn, moveBtn, presetAddBtn].forEach((btn) => {
    btn.disabled = !connected;
  });
};

const renderPresets = (presets) => {
  presetList.innerHTML = '';
  Object.entries(presets || {}).forEach(([name, heightCm]) => {
    const chip = document.createElement('div');
    chip.className = 'preset-chip';

    const label = document.createElement('span');
    label.textContent = `${name} (${heightCm}cm)`;
    label.style.cursor = 'pointer';
    label.title = 'Move to this preset';
    label.addEventListener('click', async () => {
      try {
        await window.idasen.gotoPreset(name);
      } catch (error) {
        showError(error);
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      const updated = await window.idasen.removePreset(name);
      renderPresets(updated);
    });

    chip.appendChild(label);
    chip.appendChild(removeBtn);
    presetList.appendChild(chip);
  });
};

const refreshStatus = async () => {
  if (!isConnected) return;
  try {
    const { height, speed } = await window.idasen.getStatus();
    heightReadout.textContent = `${height.toFixed(1)} cm`;
    speedReadout.textContent = Math.abs(speed) > 0.0001
      ? `${speed > 0 ? '↑' : '↓'} ${(Math.abs(speed) * 100).toFixed(2)} cm/s`
      : '';
  } catch (error) {
    showError(error);
  }
};

const startPolling = () => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(refreshStatus, 800);
  refreshStatus();
};

scanBtn.addEventListener('click', async () => {
  showError(null);
  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning…';
  try {
    const devices = await window.idasen.scan();
    deviceSelect.innerHTML = '';
    devices.forEach((device) => {
      const option = document.createElement('option');
      option.value = device.id;
      option.textContent = device.name;
      deviceSelect.appendChild(option);
    });
    if (devices.length === 0) {
      showError(new Error('No desks found nearby.'));
    }
  } catch (error) {
    showError(error);
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = 'Scan';
  }
});

connectBtn.addEventListener('click', async () => {
  const deskId = deviceSelect.value;
  if (!deskId) {
    showError(new Error('Scan and pick a desk first.'));
    return;
  }
  showError(null);
  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting…';
  try {
    await window.idasen.connect(deskId);
    setConnected(true);
    startPolling();
  } catch (error) {
    showError(error);
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect';
  }
});

upBtn.addEventListener('click', () => window.idasen.moveUp().catch(showError));
downBtn.addEventListener('click', () => window.idasen.moveDown().catch(showError));
stopBtn.addEventListener('click', () => window.idasen.stop().catch(showError));

moveBtn.addEventListener('click', async () => {
  const heightCm = parseFloat(heightInput.value);
  if (Number.isNaN(heightCm)) {
    showError(new Error('Enter a target height in cm.'));
    return;
  }
  try {
    await window.idasen.moveTo(heightCm);
  } catch (error) {
    showError(error);
  }
});

presetAddBtn.addEventListener('click', async () => {
  const name = presetNameInput.value.trim();
  if (!name) {
    showError(new Error('Enter a preset name.'));
    return;
  }
  try {
    const { height } = await window.idasen.getStatus();
    const updated = await window.idasen.addPreset(name, Math.round(height * 10) / 10);
    renderPresets(updated);
    presetNameInput.value = '';
  } catch (error) {
    showError(error);
  }
});

(async () => {
  try {
    const config = await window.idasen.getSavedConfig();
    renderPresets(config.presets);
    setConnected(config.connected);
    if (config.deskId) {
      const option = document.createElement('option');
      option.value = config.deskId;
      option.textContent = `Saved desk (${config.deskId})`;
      deviceSelect.appendChild(option);
    }
    if (config.connected) startPolling();
  } catch (error) {
    showError(error);
  }
})();
