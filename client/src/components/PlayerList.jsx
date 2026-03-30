/**
 * PlayerList.jsx — Sidebar showing all connected players.
 *
 * Each player card displays ID, name, ping and provides
 * actions to focus on the map or start a live stream.
 *
 * Uses Framer Motion layoutId for smooth reordering when
 * players connect/disconnect.
 *
 * @module PlayerList
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Crosshair, Users } from '@phosphor-icons/react';

/**
 * @typedef {Object} Player
 * @property {number} id
 * @property {string} name
 * @property {number} ping
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {number} health
 * @property {number} armor
 */

/**
 * @param {Object} props
 * @param {Player[]} props.players          — Array of current players
 * @param {number|null} props.selectedId    — Currently selected player ID
 * @param {number|null} props.streamingId   — Player ID currently being streamed
 * @param {(id: number) => void} props.onSelect      — Focus player on map
 * @param {(id: number) => void} props.onStartStream — Start watching player screen
 * @param {(id: number) => void} props.onStopStream  — Stop watching player screen
 */
export default function PlayerList({
  players,
  selectedId,
  streamingIds = [],
  onSelect,
  onStartStream,
  onStopStream,
}) {
  const [search, setSearch] = useState('');

  /** Filter players by search query (name or id) */
  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
  });

  return (
    <aside className="app-sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <h2>Players ({players.length})</h2>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Player List */}
      <div className="player-list">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Users size={48} className="empty-state-icon" />
              <h3>No players found</h3>
              <p>
                {players.length === 0
                  ? 'Waiting for FiveM server connection...'
                  : 'No results match your search'}
              </p>
            </motion.div>
          ) : (
            filtered.map((player) => {
              const isStreaming = streamingIds.includes(player.id);
              return (
                <motion.div
                  key={player.id}
                  layoutId={`player-${player.id}`}
                  className={`player-card ${selectedId === player.id ? 'active' : ''}`}
                  onClick={() => onSelect(player.id)}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                >
                  {/* Avatar showing player ID */}
                  <div className="player-avatar">
                    {player.id}
                  </div>

                  {/* Player info */}
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-meta">
                      <span>{player.ping}ms</span>
                      <span>HP {player.health ?? '—'}</span>
                      <span>AR {player.armor ?? '—'}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="player-actions">
                    {/* Focus on map */}
                    <button
                      className="btn-icon"
                      title="Focus on map"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(player.id);
                      }}
                    >
                      <Crosshair size={16} />
                    </button>

                    {/* Start / Stop live stream */}
                    <button
                      className={`btn-icon ${isStreaming ? 'live' : ''}`}
                      title={isStreaming ? 'Stop watching' : 'Watch live'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isStreaming) {
                          onStopStream(player.id);
                        } else {
                          onStartStream(player.id);
                        }
                      }}
                    >
                      <Eye size={16} weight={isStreaming ? 'fill' : 'regular'} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
