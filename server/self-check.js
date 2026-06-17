const assert = require('assert');
const {
  normalizePlayers,
  sanitizeStreamConfig,
  isValidFrame,
  parseCorsOrigin,
} = require('./index');

assert.deepStrictEqual(parseCorsOrigin('https://a.test, https://b.test'), ['https://a.test', 'https://b.test']);
assert.strictEqual(parseCorsOrigin('*'), true);

const players = normalizePlayers([
  { id: 7, name: 'Player', ping: 42, x: 1, y: 2, z: 3, health: 250, armor: 150, heading: -10 },
]);
assert.strictEqual(players[0].health, 200);
assert.strictEqual(players[0].armor, 100);
assert.strictEqual(players[0].heading, 350);
assert.strictEqual(normalizePlayers([{ id: 'x', x: 1, y: 2, z: 3 }]), null);

assert.deepStrictEqual(
  sanitizeStreamConfig({ streamFps: 999, resolutionScale: 0, streamQuality: 2 }),
  { streamFps: 30, resolutionScale: 0.1, streamQuality: 1 }
);

assert.strictEqual(isValidFrame('data:image/webp;base64,abc'), true);
assert.strictEqual(isValidFrame('data:image/png;base64,abc'), false);

console.log('self-check ok');
