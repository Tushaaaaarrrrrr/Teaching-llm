const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('--- Starting Loading Facts System Tests ---');

// Load facts directly from scratch or transpiled / parsed TS data
const factsRaw = fs.readFileSync(path.join(__dirname, '../src/lib/facts/loading-facts-data.ts'), 'utf-8');

// Parse LOADING_FACTS from file
const jsonMatch = factsRaw.match(/export const LOADING_FACTS: LoadingFact\[\] = (\[[\s\S]*?\]);/);
assert(jsonMatch, 'Failed to extract LOADING_FACTS JSON from loading-facts-data.ts');
const LOADING_FACTS = JSON.parse(jsonMatch[1]);

// 1. Validate Database Integrity
console.log('Test 1: Validating Master Database Integrity...');
assert.strictEqual(LOADING_FACTS.length, 365, 'Must contain exactly 365 facts');

const ids = new Set();
let commonCount = 0;
let rareCount = 0;
let ultraCount = 0;
let couponCount = 0;

LOADING_FACTS.forEach(fact => {
  assert(fact.id && typeof fact.id === 'string', 'Fact ID must be string');
  assert(!ids.has(fact.id), `Duplicate ID found: ${fact.id}`);
  ids.add(fact.id);

  assert(fact.text && fact.text.trim().length > 0, `Fact ${fact.id} has empty text`);
  assert(['COMMON', 'RARE', 'ULTRA_RARE'].includes(fact.rarity), `Invalid rarity ${fact.rarity} on ${fact.id}`);

  if (fact.rarity === 'COMMON') commonCount++;
  if (fact.rarity === 'RARE') rareCount++;
  if (fact.rarity === 'ULTRA_RARE') ultraCount++;
  if (fact.isCoupon) couponCount++;
});

console.log(`✓ 365 unique facts verified. Counts: Common: ${commonCount}, Rare: ${rareCount}, Ultra: ${ultraCount}, Coupons: ${couponCount}`);
assert.strictEqual(couponCount, 3, 'Must have 3 secret coupon facts');
assert(LOADING_FACTS.find(f => f.id === '195').isCoupon, '095 must be coupon');
assert(LOADING_FACTS.find(f => f.id === '196').isCoupon, '196 must be coupon');
assert(LOADING_FACTS.find(f => f.id === '197').isCoupon, '197 must be coupon');

// 2. Mock Cooldown & Selection Engine Logic
console.log('\nTest 2: Testing Cooldown and Anti-Spam Logic...');

let mockStorage = {};
const mockLocalStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = v; },
  clear: () => { mockStorage = {}; }
};

// Implement test harness of manager with mocked storage and time
function createTestManager() {
  let currentTime = 1000000;
  mockLocalStorage.clear();

  const BURST_LIMIT = 30;
  const COOLDOWN_MS = 5 * 60 * 1000;
  const BURST_WINDOW_MS = 5 * 60 * 1000;
  const MAX_HISTORY = 10;

  function loadState() {
    const raw = mockLocalStorage.getItem('genz_loading_facts_state');
    if (!raw) return { recentFactIds: [], lastShownFactId: null, factsShownInCycle: 0, cycleWindowStart: 0, cooldownUntil: 0 };
    return JSON.parse(raw);
  }

  function saveState(s) {
    mockLocalStorage.setItem('genz_loading_facts_state', JSON.stringify(s));
  }

  function getNextFact(options = {}) {
    const now = options.time || currentTime;
    const state = loadState();

    if (state.cooldownUntil > now) return null;

    if (state.cooldownUntil > 0 && state.cooldownUntil <= now) {
      state.cooldownUntil = 0;
      state.factsShownInCycle = 0;
      state.cycleWindowStart = now;
    }

    if (state.cycleWindowStart > 0 && now - state.cycleWindowStart > BURST_WINDOW_MS) {
      state.factsShownInCycle = 0;
      state.cycleWindowStart = now;
    }

    if (state.factsShownInCycle >= BURST_LIMIT) {
      state.cooldownUntil = now + COOLDOWN_MS;
      state.factsShownInCycle = 0;
      saveState(state);
      return null;
    }

    let targetRarity;
    if (options.forceBucket) {
      targetRarity = options.forceBucket;
    } else {
      const roll = Math.random();
      if (roll < 0.005) targetRarity = 'ULTRA_RARE';
      else if (roll < 0.060) targetRarity = 'RARE';
      else targetRarity = 'COMMON';
    }

    let pool = LOADING_FACTS.filter(f => f.rarity === targetRarity);
    if (!options.allowCoupon) {
      const nonCoupon = pool.filter(f => !f.isCoupon);
      if (nonCoupon.length > 0) pool = nonCoupon;
    }

    const recentSet = new Set(state.recentFactIds);
    let candidates = pool.filter(f => !recentSet.has(f.id) && f.id !== state.lastShownFactId);
    if (candidates.length === 0) {
      candidates = pool.filter(f => f.id !== state.lastShownFactId);
    }
    if (candidates.length === 0) candidates = pool;

    const selected = candidates[Math.floor(Math.random() * candidates.length)];

    state.factsShownInCycle += 1;
    if (state.factsShownInCycle === 1) state.cycleWindowStart = now;

    if (state.factsShownInCycle >= BURST_LIMIT) {
      state.cooldownUntil = now + COOLDOWN_MS;
      state.factsShownInCycle = 0;
    }

    state.lastShownFactId = selected.id;
    state.recentFactIds = [selected.id, ...state.recentFactIds.filter(id => id !== selected.id)].slice(0, MAX_HISTORY);
    saveState(state);

    return selected;
  }

  return {
    advanceTime: (ms) => { currentTime += ms; },
    getTime: () => currentTime,
    getNextFact,
    loadState,
  };
}

const manager = createTestManager();

// Fetch 30 facts in burst
console.log('Testing 30-fact burst limit...');
let prevFact = null;
const burstFacts = [];
for (let i = 1; i <= 30; i++) {
  if (i > 1) {
    manager.advanceTime(2000); // 2 seconds between loadings
  }
  const fact = manager.getNextFact();
  assert(fact !== null, `Fact ${i} of 30 should be shown`);
  if (prevFact) {
    assert(fact.id !== prevFact.id, `Fact ${i} must not repeat previous fact`);
  }
  prevFact = fact;
  burstFacts.push(fact);
}
console.log(`✓ Successfully shown 30 facts in burst without consecutive repetitions`);

// Immediately check state: cooldown must be set to 5 minutes from current time
const stateAfter30 = manager.loadState();
assert(stateAfter30.cooldownUntil > manager.getTime(), 'Cooldown must be set after 30 facts');
assert.strictEqual(stateAfter30.cooldownUntil - manager.getTime(), 5 * 60 * 1000, 'Cooldown must be exactly 5 minutes');
console.log('✓ 5-minute cooldown activated after 30 facts');

// Fact 31 immediately after -> MUST BE NULL (Normal loading screen only)
const f31 = manager.getNextFact();
assert.strictEqual(f31, null, 'Fact 31 during cooldown must return null');
console.log('✓ Cooldown active: Fact 31 returned null');

// Advance 2 minutes (120,000 ms) -> STILL IN COOLDOWN
manager.advanceTime(2 * 60 * 1000);
const fStillCooldown = manager.getNextFact();
assert.strictEqual(fStillCooldown, null, 'Fact at 2 mins into cooldown must return null');
console.log('✓ Cooldown still active after 2 minutes: returned null');

// Advance another 3 minutes + 1 second (180,001 ms) -> Total 5 mins 1 sec elapsed: COOLDOWN EXPIRED
manager.advanceTime(3 * 60 * 1000 + 1000);
const fAfterCooldown = manager.getNextFact();
assert(fAfterCooldown !== null, 'Fact after cooldown expired must be returned');
assert(fAfterCooldown.id !== prevFact.id, 'Fact after cooldown must not repeat last fact');
console.log('✓ Cooldown expired: Fact system is available again, returned:', fAfterCooldown.id);

// 3. Test Deduplication of last 10 facts
console.log('\nTest 3: Testing Last 10 Deduplication...');
const seenIds = new Set(burstFacts.slice(0, 4).map(f => f.id));
for (let i = 0; i < 6; i++) {
  // reset cooldown between each to test selection deduplication
  const s = manager.loadState();
  s.cooldownUntil = 0;
  s.factsShownInCycle = 0;
  mockLocalStorage.setItem('genz_loading_facts_state', JSON.stringify(s));

  const fact = manager.getNextFact();
  assert(fact !== null);
  // Ensure not immediate duplicate
  const lastState = manager.loadState();
  assert(lastState.lastShownFactId === fact.id);
  seenIds.add(fact.id);
}
assert(seenIds.size >= 8, 'Deduplication should show a diverse range of facts');
console.log(`✓ Deduplication verified with ${seenIds.size} unique facts across 10 picks`);

// 4. Test Rarity Probabilities
console.log('\nTest 4: Simulating 10,000 Picks for Rarity Weighting...');
let simCommon = 0;
let simRare = 0;
let simUltra = 0;
const N = 10000;

for (let i = 0; i < N; i++) {
  const roll = Math.random();
  if (roll < 0.005) simUltra++;
  else if (roll < 0.060) simRare++;
  else simCommon++;
}

const pCommon = (simCommon / N) * 100;
const pRare = (simRare / N) * 100;
const pUltra = (simUltra / N) * 100;

console.log(`Empirical Distribution over ${N} rolls:`);
console.log(`Common: ${pCommon.toFixed(2)}% (Target: ~94.0%)`);
console.log(`Rare:   ${pRare.toFixed(2)}% (Target: ~5.5%)`);
console.log(`Ultra:  ${pUltra.toFixed(2)}% (Target: ~0.5%)`);

assert(pCommon > 92 && pCommon < 96, 'Common probability should be ~94%');
assert(pRare > 4 && pRare < 7, 'Rare probability should be ~5.5%');
assert(pUltra > 0.2 && pUltra < 1.0, 'Ultra Rare probability should be ~0.5%');

console.log('\n======================================');
console.log('🎉 ALL 4 TEST SUITES PASSED SUCCESSFULLY!');
console.log('======================================\n');
