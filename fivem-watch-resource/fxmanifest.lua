--[[
  ╔══════════════════════════════════════════════════════════════╗
  ║  fivem-watch — FiveM Resource Manifest                      ║
  ║  Real-time player monitoring & live screen streaming         ║
  ║  Repository: https://github.com/user/fivem-watch             ║
  ╚══════════════════════════════════════════════════════════════╝

  DEPENDENCIES: None (100% Standalone)
  This resource requires NO external scripts or databases.

  HOW IT WORKS:
  1. Server script periodically collects player telemetry
     (ID, name, coords, health, armor, ping) and pushes it
     to the fivem-watch-web backend via HTTP.
  2. Client script runs a hidden NUI page that maintains a
     WebSocket connection to the backend. When an admin requests
     a live stream, the NUI captures the game screen using
     WebGL and sends JPEG frames over the socket.
]]

fx_version 'cerulean'
game 'gta5'

name         'fivem-watch'
description  'Real-time player monitoring & live screen streaming — 100% Standalone'
author       'fivem-watch'
version      '1.0.0'
repository   'https://github.com/user/fivem-watch'

-- Server-side script (telemetry push)
server_scripts {
  'config.js',
  'server/main.js'
}

-- Client-side script (NUI bridge)
client_scripts {
  'config.js',
  'client/main.js'
}

-- Hidden NUI page (WebGL screenshot + Socket.io)
ui_page 'web/index.html'

files {
  'web/index.html',
  'web/socket.io.min.js',
  'web/cfx-three.min.js'
}
