/**
 * GameMap.jsx — Interactive Leaflet map with GTA V world coordinates.
 *
 * This version uses a Custom Coordinate Reference System (CRS) mapped specifically
 * to the `gta-v-map-leaflet` satellite tile matrix. It naturally translates FiveM
 * [X, Y] game coordinates to the correct [X, Y] tile positions without arbitrary division.
 *
 * @module GameMap
 */

import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Custom GTA V Map CRS ──────────────────────────────────────
const center_x = 117.3;
const center_y = 172.8;
const scale_x = 0.02072;
const scale_y = 0.0205;

const CUSTOM_CRS = L.extend({}, L.CRS.Simple, {
  projection: L.Projection.LonLat,
  scale: function (zoom) {
    return Math.pow(2, zoom);
  },
  zoom: function (sc) {
    return Math.log(sc) / 0.6931471805599453;
  },
  distance: function (pos1, pos2) {
    const x_diff = pos2.lng - pos1.lng;
    const y_diff = pos2.lat - pos1.lat;
    return Math.sqrt(x_diff * x_diff + y_diff * y_diff);
  },
  transformation: new L.Transformation(scale_x, center_x, -scale_y, center_y),
  infinite: true,
});

/** Center of the map in leaflet coordinates */
const MAP_CENTER = [0, 0];

/**
 * Convert GTA V world (x, y) to Leaflet [lat, lng].
 * With CUSTOM_CRS, no linear division scale is needed since the
 * custom transformation handles the offset and scaling projection naturally.
 */
function gameToLeaflet(gameX, gameY) {
  return [gameY, gameX];
}

/**
 * Creates a custom DivIcon for a player marker.
 */
function createPlayerIcon(name, id) {
  return L.divIcon({
    className: 'player-marker',
    html: `
      <div class="player-marker-dot"></div>
      <div class="player-marker-label">#${id} ${name}</div>
    `,
    iconSize: [0, 0],
    iconAnchor: [7, 7],
  });
}

/**
 * Sub-component that pans/zooms the map to a specific player.
 */
function FlyToPlayer({ targetCoords }) {
  const map = useMap();

  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 5, { duration: 0.8 });
    }
  }, [targetCoords, map]);

  return null;
}

export default function GameMap({ players, focusPlayerId }) {
  const mapRef = useRef(null);

  /** Compute the target coords for the focused player */
  const flyTarget = useMemo(() => {
    if (focusPlayerId == null) return null;
    const p = players.find((pl) => pl.id === focusPlayerId);
    if (!p) return null;
    return gameToLeaflet(p.x, p.y);
  }, [focusPlayerId, players]);

  return (
    <MapContainer
      ref={mapRef}
      center={MAP_CENTER}
      zoom={3}
      minZoom={1}
      maxZoom={5}
      crs={CUSTOM_CRS}
      zoomControl={true}
      attributionControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      {/* GTA V Satellite Tiles mapped to the CUSTOM_CRS */}
      <TileLayer
        url="/styleSatelite/{z}/{x}/{y}.jpg"
        minZoom={0}
        maxZoom={5}
        maxNativeZoom={5}
        noWrap={true}
        continuousWorld={false}
        attribution="GTA V Leaflet Map Tiles"
      />

      {/* Fly-to animation when selecting a player */}
      <FlyToPlayer targetCoords={flyTarget} />

      {/* Render player markers */}
      {players.map((player) => {
        const pos = gameToLeaflet(player.x, player.y);
        return (
          <Marker
            key={player.id}
            position={pos}
            icon={createPlayerIcon(player.name, player.id)}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <strong>#{player.id} {player.name}</strong><br />
                Ping: {player.ping}ms<br />
                Health: {player.health ?? '—'} | Armor: {player.armor ?? '—'}<br />
                X: {player.x?.toFixed(1)} Y: {player.y?.toFixed(1)} Z: {player.z?.toFixed(1)}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
