/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  fivem-watch — Client Script (main.js)                       ║
 * ║  Bridges game client ↔ NUI for live screen streaming         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * This script runs client-side. It:
 * 1. Initializes the hidden NUI browser on resource start
 * 2. Sends configuration to NUI so it can connect to the backend
 *
 * The NUI page handles everything else autonomously:
 *   - Socket.io connection to backend
 *   - WebGL screenshot capture loop (start/stop via socket events)
 *   - Frame emission
 *
 * PERFORMANCE:
 * - When NOT streaming: 0.00ms (NUI idle, no ticks)
 * - When streaming: minimal (~0.5ms, WebGL runs in CEF thread)
 *
 * @module fivem-watch/client
 */

// ─── NUI Initialization ────────────────────────────────────────

/**
 * On resource start, send config to the NUI so it can
 * connect to the backend via Socket.io.
 *
 * The NUI page (web/index.html) will:
 * 1. Connect to the backend as role "fivem-nui"
 * 2. Wait for 'start_capture' / 'stop_capture' events
 * 3. Use WebGL to capture frames when requested
 */
on('onResourceStart', (resourceName) => {
  if (GetCurrentResourceName() !== resourceName) return;

  // Small delay to ensure the NUI CEF browser is ready
  setTimeout(() => {
    SendNUIMessage({
      type: 'init',
      backendUrl: FW_CONFIG.BACKEND_URL,
      apiSecret: FW_CONFIG.API_SECRET,
      playerId: GetPlayerServerId(PlayerId()),
      streamFps: FW_CONFIG.STREAM_FPS,
      streamQuality: FW_CONFIG.STREAM_QUALITY,
      resolutionScale: FW_CONFIG.STREAM_RESOLUTION_SCALE,
    });

    console.log('[fivem-watch] Client initialized — NUI connecting to backend');
  }, 3000);
});
