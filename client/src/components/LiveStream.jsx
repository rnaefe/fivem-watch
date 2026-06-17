/**
 * LiveStream.jsx — Picture-in-Picture live screen viewer.
 *
 * Renders a floating overlay that displays the live screenshot
 * stream coming from a player's FiveM NUI client. Frames arrive
 * as WebP data URLs via Socket.io and are rendered onto an <img>.
 *
 * @module LiveStream
 */

import { useEffect, useState, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, VideoCamera, CircleNotch, CornersOut, Gear } from '@phosphor-icons/react';
import { getSocket } from '../socket';

// Quality presets for the stream
const QUALITY_PRESETS = {
  Low: { streamFps: 10, resolutionScale: 0.2, streamQuality: 0.3 },
  Medium: { streamFps: 20, resolutionScale: 0.4, streamQuality: 0.5 },
  High: { streamFps: 30, resolutionScale: 0.7, streamQuality: 0.8 },
};

/**
 * @param {Object} props
 * @param {number|null} props.playerId     — Server ID of the player being watched
 * @param {string|null} props.playerName   — Display name of the player
 * @param {number} props.indexOffset       — Ordering index for multi-stream cascading positioning
 * @param {() => void}  props.onClose      — Called when admin closes the stream
 */
export default function LiveStream({ playerId, playerName, indexOffset = 0, onClose }) {
  const [frame, setFrame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const frameCount = useRef(0);

  const [qualityLevel, setQualityLevel] = useState(() => {
    try {
      const saved = localStorage.getItem('fivem-watch-quality');
      if (saved && QUALITY_PRESETS[saved]) return saved;
    } catch {
      // ignore
    }
    return 'Medium';
  });

  // Sync quality settings to NUI client whenever level changes
  useEffect(() => {
    if (!playerId) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('update_stream_config', {
        playerId,
        config: QUALITY_PRESETS[qualityLevel]
      });
    }
    localStorage.setItem('fivem-watch-quality', qualityLevel);
  }, [qualityLevel, playerId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || playerId == null) return;

    const handleFrame = (data) => {
      if (String(data.playerId) === String(playerId)) {
        setFrame(data.frame);
        frameCount.current++;
        if (loading) setLoading(false);
      }
    };

    socket.on('player_frame', handleFrame);

    return () => {
      socket.off('player_frame', handleFrame);
    };
  }, [playerId, loading]);

  if (playerId == null) return null;

  return (
    <AnimatePresence>
      <Motion.div
        className={`stream-overlay ${isMaximized ? 'maximized' : ''}`}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
          width: isMaximized ? '100vw' : undefined,
          height: isMaximized ? '100vh' : undefined,
        }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        style={
          isMaximized
            ? {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                borderRadius: 0,
                resize: 'none',
              }
            : {
                position: 'absolute',
                zIndex: 1000 + indexOffset,
                resize: 'both',
              }
        }
      >
        {/* Stream Header */}
        <div className="stream-header">
          <div className="stream-header-left">
            <div className="stream-live-dot" />
            <span className="stream-header-title">
              #{playerId} {playerName || 'Unknown'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn-icon ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
              title="Stream Quality"
            >
              <Gear size={16} weight={showSettings ? 'fill' : 'regular'} />
            </button>
            <button
              className="btn-icon"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore window' : 'Maximize fullscreen'}
            >
              <CornersOut size={16} weight={isMaximized ? 'fill' : 'regular'} />
            </button>
            <button
              className="stream-close-btn"
              onClick={onClose}
              title="Close stream"
              style={{ pointerEvents: 'auto' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Stream Canvas Layer */}
        <div
          className="stream-canvas"
          style={{ height: isMaximized ? 'calc(100vh - 49px)' : '100%', minHeight: '200px' }}
        >
          {loading ? (
            <div className="stream-placeholder">
              <CircleNotch size={32} style={{ animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : frame ? (
            <img src={frame} alt={`Live view of player #${playerId}`} draggable={false} />
          ) : (
            <div className="stream-placeholder">
              <VideoCamera size={32} />
              <span style={{ marginTop: 8 }}>Waiting for frames...</span>
            </div>
          )}

          {/* Simple Quality Dropdown Overlay */}
          <AnimatePresence>
            {showSettings && (
              <Motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  background: 'rgba(9, 9, 11, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid var(--color-border)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  zIndex: 10,
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Yayın Kalitesi:
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {Object.keys(QUALITY_PRESETS).map(level => (
                    <button
                      key={level}
                      onClick={() => {
                        setQualityLevel(level);
                        setShowSettings(false);
                      }}
                      style={{
                        padding: '6px 14px',
                        background: qualityLevel === level ? 'var(--color-primary)' : 'transparent',
                        color: qualityLevel === level ? '#000' : 'var(--color-text)',
                        border: `1px solid ${qualityLevel === level ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        fontWeight: qualityLevel === level ? 'bold' : 'normal',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </Motion.div>
    </AnimatePresence>
  );
}
