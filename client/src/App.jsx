/**
 * App.jsx — Root application component for fivem-watch dashboard.
 *
 * Orchestrates authentication, Socket.io connection, and renders
 * the main dashboard layout with sidebar (PlayerList), map (GameMap),
 * and live stream overlay (LiveStream).
 *
 * @module App
 */

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Eye, WifiHigh, WifiSlash, List } from '@phosphor-icons/react';

import LoginScreen from './components/LoginScreen';
import PlayerList from './components/PlayerList';
import GameMap from './components/GameMap';
import LiveStream from './components/LiveStream';
import { connectSocket, getSocket, disconnectSocket } from './socket';

export default function App() {
  // ─── Auth State ────────────────────────────────────────────
  const [token, setToken] = useState(() => localStorage.getItem('fivem-watch-token'));
  const [isConnected, setIsConnected] = useState(false);

  // ─── Data State ────────────────────────────────────────────
  /** @type {[import('./components/PlayerList').Player[], Function]} */
  const [players, setPlayers] = useState([]);

  // ─── UI State ──────────────────────────────────────────────
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [streamingPlayerIds, setStreamingPlayerIds] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ─── Socket Connection ─────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    /** @param {import('./components/PlayerList').Player[]} data */
    socket.on('players_update', (data) => {
      setPlayers(data);
    });

    socket.on('server_offline', () => {
      setPlayers([]);
    });

    socket.on('auth_error', () => {
      // Token invalid — force re-login
      localStorage.removeItem('fivem-watch-token');
      setToken(null);
      disconnectSocket();
    });

    /** Handle stream errors (e.g. NUI not connected for that player) */
    socket.on('stream_error', (data) => {
      console.error('[fivem-watch] Stream error:', data.error);
      alert(`Stream error (Player #${data.playerId}): ${data.error}`);
      setStreamingPlayerIds(prev => prev.filter(id => id !== data.playerId));
    });

    return () => {
      disconnectSocket();
    };
  }, [token]);

  // ─── Auth Handlers ─────────────────────────────────────────
  const handleLogin = useCallback((newToken) => {
    localStorage.setItem('fivem-watch-token', newToken);
    setToken(newToken);
  }, []);

  // ─── Stream Handlers ───────────────────────────────────────
  const handleStartStream = useCallback((playerId) => {
    const socket = getSocket();
    if (!socket) return;

    setStreamingPlayerIds(prev => {
      if (prev.includes(playerId)) return prev;
      socket.emit('start_stream', playerId);
      return [...prev, playerId];
    });
  }, []);

  const handleStopStream = useCallback((playerId) => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('stop_stream', playerId);
    setStreamingPlayerIds(prev => prev.filter(id => id !== playerId));
  }, []);

  // ─── Not Authenticated — Show Login ────────────────────────
  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // ─── Main Dashboard ────────────────────────────────────────
  return (
    <div className={`app-shell ${!isSidebarOpen ? 'sidebar-hidden' : ''}`}>
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="btn-icon" 
            style={{ margin: '-8px 0', opacity: 0.8 }} 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Toggle Sidebar"
          >
            <List size={20} weight="bold" />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="dot" />
            <span>fivem-watch</span>
          </div>
        </div>

        <div className="header-status">
          {streamingPlayerIds.length > 0 && (
            <span className="status-badge" style={{ cursor: 'pointer' }} onClick={() => streamingPlayerIds.forEach(handleStopStream)}>
              <Eye size={12} weight="fill" />
              Watching {streamingPlayerIds.length} players
            </span>
          )}
          <span className={`status-badge ${isConnected ? '' : 'offline'}`}>
            {isConnected ? (
              <>
                <WifiHigh size={12} weight="bold" />
                {players.length} online
              </>
            ) : (
              <>
                <WifiSlash size={12} weight="bold" />
                Disconnected
              </>
            )}
          </span>
        </div>
      </header>

      {/* ── Sidebar — Player List ───────────────────────────── */}
      {isSidebarOpen && (
        <PlayerList
          players={players}
          selectedId={selectedPlayerId}
          streamingIds={streamingPlayerIds}
          onSelect={setSelectedPlayerId}
          onStartStream={handleStartStream}
          onStopStream={handleStopStream}
        />
      )}

      {/* ── Main — Map ──────────────────────────────────────── */}
      <main className="app-main">
        <GameMap players={players} focusPlayerId={selectedPlayerId} />

        {/* ── Live Stream Overlays (Multi-Stream) ───────────── */}
        <AnimatePresence>
          {streamingPlayerIds.map((playerId, index) => {
            const player = players.find((p) => p.id === playerId);
            return (
              <LiveStream
                key={playerId}
                playerId={playerId}
                playerName={player?.name}
                indexOffset={index}
                onClose={() => handleStopStream(playerId)}
              />
            );
          })}
        </AnimatePresence>
      </main>
    </div>
  );
}
