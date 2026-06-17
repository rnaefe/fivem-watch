/**
 * config.js — Shared configuration for fivem-watch resource.
 *
 * This file is loaded by BOTH server and client scripts.
 * Edit these values to match your fivem-watch backend.
 *
 * @module Config
 */

/** @type {Object} Global configuration */
const FW_CONFIG = {
  /**
   * URL of the fivem-watch backend server.
   * Include the protocol and port, no trailing slash.
   * Example: "http://123.45.67.89:3001"
   */
  BACKEND_URL: 'http://localhost:3001',

  /**
   * Secret key shared between FiveM and the backend.
   * Must match the API_SECRET in the backend's .env file.
   * Generate with: openssl rand -hex 32
   */
  API_SECRET: 'CHANGE_ME_TO_A_RANDOM_SECRET',

  /**
   * How often (in ms) the server pushes telemetry updates.
   * Lower = more real-time but slightly more network usage.
   * Recommended: 1000 (1 second)
   */
  TELEMETRY_INTERVAL: 1000,

  /**
   * Target FPS for the live screen stream.
   * Higher = smoother but uses more bandwidth/CPU.
   * Recommended: 3-5 for a good balance.
   */
  STREAM_FPS: 20,

  /**
   * WebP compression quality for captured frames.
   * Range: 0.0 (worst) to 1.0 (best)
   * Recommended: 0.6 for a good size/quality balance.
   */
  STREAM_QUALITY: 0.5,

  /**
   * Resolution scale for captured frames.
   * 1.0 = native resolution (bigger files)
   * 0.5 = half resolution (smaller files, faster)
   * Recommended: 0.5
   */
  STREAM_RESOLUTION_SCALE: 0.5,
};
