(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const bossFill = document.getElementById('bossFill');
  const phaseText = document.getElementById('phaseText');
  const scoreCorner = document.getElementById('scoreCorner');
  const overlay = document.getElementById('overlay');
  const resultOverlay = document.getElementById('resultOverlay');
  const resultKicker = document.getElementById('resultKicker');
  const resultTitle = document.getElementById('resultTitle');
  const resultStats = document.getElementById('resultStats');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');

  const W = canvas.width;
  const H = canvas.height;
  const MAX_LIVES = 5;
  const BOSS_MAX_HP = 2500;

  const PHASE2_RATIO = 1 - (0.8 / 3);
  const PHASE3_RATIO = 1 - (0.8 / 3) * 2;
  const PHASE4_RATIO = 0.20;

  const BOMB_UNLOCK_SCORE = 5000;
  const BOMB_SCORE_COST = 4000;
  const BOMB_CHARGE_TIME = 5;
  const BOMB_FREEZE_TIME = 5.55;
  const BOMB_FLASH_TIME = 0.12;
  const BOMB_DETONATE_TIME = 0.22;
  const BOMB_STALL_TIME = 0.55;
  const BOMB_CHARGE_STAGE_TIME = 0.58;
  const BOMB_SNAP_TIME = 0.10;
  const BOMB_ASSAULT_TIME = 2.45;
  const BOMB_ASSAULT_COLOR_DELAY = 0.68;
  const BOMB_ASSAULT_COLOR_RAMP = 0.58;
  const BOMB_RECOVERY_TIME = 0.78;
  const BOMB_CANCEL_FX_TIME = 0.32;
  const VICTORY_ANIM_TIME = 2.35;
  const CLEAR_SCORE_BONUS = 52000;
  const TIME_PENALTY_RATE = 60;
  const LIFE_SCORE_STEP = 0.12;
  const NO_HIT_SCORE_MULTIPLIER = 1.75;
  const BOMB_SCORE_MULTIPLIER = 0.5;
  const PLAYER_HIT_SCORE = 16;
  const GRAZE_SCORE_BASE = 2.6;
  const GRAZE_SCORE_SCALE = 1.1;
  const BOMB_DAMAGE_SCORE = 4;

  const state = {
    running: false,
    startTime: 0,
    elapsed: 0,
    player: null,
    boss: null,
    bullets: [],
    enemyBullets: [],
    particles: [],
    petalDrops: [],
    stars: [],
    pointerActive: false,
    touchId: null,
    dragAnchor: { x: 0, y: 0, px: 0, py: 0 },
    targetX: W / 2,
    targetY: H - 120,
    lastFrame: 0,
    timeScale: 1,
    invuln: 0,
    phase: 1,
    nextShot: 0,
    nextPattern: 1.25,
    noHit: true,
    killFlash: 0,
    bossHitCount: 0,
    sakuraPulse: 0,
    sakuraShock: 0,
    score: 0,
    grazeFrames: 0,
    grazeEntries: 0,
    grazeHeat: 0,
    grazeRate: 1,
    peakRate: 1,
    timePenalty: 0,
    shake: 0,
    finish: {
      active: false,
      timer: 0,
      burstTick: 0,
      x: W / 2,
      y: 124,
      pose: 0,
    },
    hint: {
      text: '',
      timer: 0,
      duration: 0,
      shown: false,
    },
    bomb: {
      charge: 0,
      ready: false,
      freezeHold: 0,
      active: false,
      stage: 'idle',
      stageTimer: 0,
      uses: 0,
      damageTick: 0,
      readyPulse: 0,
      trailTick: 0,
      freezeFxTime: 0,
      cancelFx: 0,
    },
  };

  function initStars() {
    state.stars = Array.from({ length: 78 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: Math.random() < 0.12 ? 2 : 1,
      v: 10 + Math.random() * 20,
    }));
  }

  function resetGame() {
    state.player = {
      x: W / 2,
      y: H - 120,
      drawX: W / 2,
      drawY: H - 120,
      r: 9,
      hitR: 2.35,
      grazeR: 18,
      hp: MAX_LIVES,
      maxHp: MAX_LIVES,
    };

    state.boss = {
      x: W / 2,
      y: 126,
      hp: BOSS_MAX_HP,
      maxHp: BOSS_MAX_HP,
      timer: 0,
      drift: 0,
      damageFlash: 0,
      phaseIntro: 0,
      leftPodOpen: 0,
      rightPodOpen: 0,
      iris: 0,
      haloSpin: 0,
      crownOpen: 0,
      shellShift: 0,
      auraPulse: 0,
      orbitRadius: 72,
      orbitYAmplitude: 6,
    };

    state.bullets = [];
    state.enemyBullets = [];
    state.particles = [];
    state.petalDrops = [];
    state.elapsed = 0;
    state.startTime = performance.now();
    state.pointerActive = false;
    state.touchId = null;
    state.targetX = state.player.x;
    state.targetY = state.player.y;
    state.timeScale = 1;
    state.invuln = 0;
    state.phase = 1;
    state.nextShot = 0;
    state.nextPattern = 1.2;
    state.noHit = true;
    state.killFlash = 0;
    state.bossHitCount = 0;
    state.sakuraPulse = 0;
    state.sakuraShock = 0;
    state.score = 0;
    state.grazeFrames = 0;
    state.grazeEntries = 0;
    state.grazeHeat = 0;
    state.grazeRate = 1;
    state.peakRate = 1;
    state.timePenalty = 0;
    state.shake = 0;
    state.finish.active = false;
    state.finish.timer = 0;
    state.finish.burstTick = 0;
    state.finish.x = state.boss.x;
    state.finish.y = state.boss.y;
    state.finish.pose = 0;
    state.hint.text = '';
    state.hint.timer = 0;
    state.hint.duration = 0;
    state.hint.shown = false;
    state.bomb.charge = 0;
    state.bomb.ready = false;
    state.bomb.freezeHold = 0;
    state.bomb.active = false;
    state.bomb.stage = 'idle';
    state.bomb.stageTimer = 0;
    state.bomb.uses = 0;
    state.bomb.damageTick = 0;
    state.bomb.readyPulse = 0;
    state.bomb.trailTick = 0;
    state.bomb.freezeFxTime = 0;
    state.bomb.cancelFx = 0;
    phaseText.textContent = 'PHASE 1';
    initStars();
  }

  function startGame() {
    resetGame();
    overlay.classList.remove('visible');
    overlay.classList.add('hidden');
    resultOverlay.classList.remove('visible');
    resultOverlay.classList.add('hidden');
    state.running = true;
    state.lastFrame = performance.now();
  }

  function showHint(text, duration = 2.8) {
    state.hint.text = text;
    state.hint.timer = duration;
    state.hint.duration = duration;
  }

  function endGame(victory) {
    state.running = false;
    state.finish.active = false;
    state.bomb.active = false;

    if (victory) {
      state.shake = Math.max(state.shake, 1.0);
      state.killFlash = Math.max(state.killFlash, 0.42);
    }

    const clearBonus = victory ? CLEAR_SCORE_BONUS : 0;
    const rawScore = Math.floor(state.score + clearBonus);
    const timePenalty = Math.floor(state.timePenalty);
    const afterPenalty = Math.max(0, rawScore - timePenalty);
    const lifeMultiplier = 1 + Math.max(0, state.player.hp) * LIFE_SCORE_STEP;
    const noHitMultiplier = state.noHit ? NO_HIT_SCORE_MULTIPLIER : 1.0;
    const tacticMultiplier = state.bomb.uses > 0 ? BOMB_SCORE_MULTIPLIER : 1.0;
    const finalScore = Math.max(0, Math.floor(afterPenalty * lifeMultiplier * noHitMultiplier * tacticMultiplier));

    resultKicker.textContent = '模拟结果';
    resultTitle.textContent = victory ? '目标排除' : '模拟中断';
    resultStats.innerHTML = [
      `<div class="result-grid">`,
      `<div class="result-row"><span>原始得分</span><strong>${formatScore(rawScore)}</strong></div>`,
      `<div class="result-row"><span>战斗用时</span><strong>${state.elapsed.toFixed(1)}s</strong></div>`,
      `<div class="result-row"><span>擦弹帧数</span><strong>${Math.floor(state.grazeFrames)}</strong></div>`,
      `<div class="result-row"><span>擦弹触发</span><strong>${state.grazeEntries}</strong></div>`,
      `<div class="result-row"><span>峰值倍率</span><strong>x${state.peakRate.toFixed(2)}</strong></div>`,
      `<div class="result-row"><span>炸弹发动</span><strong>${state.bomb.uses}</strong></div>`,
      `<div class="result-row"><span>时间惩罚</span><strong>${timePenalty}</strong></div>`,
      `<div class="result-row"><span>残机倍率</span><strong>x${lifeMultiplier.toFixed(2)}</strong></div>`,
      `<div class="result-row"><span>无伤倍率</span><strong>x${noHitMultiplier.toFixed(2)}</strong></div>`,
      `<div class="result-row total"><span>最终分数</span><strong>${formatScore(finalScore)}</strong></div>`,
      `</div>`
    ].join('');

    resultStats.innerHTML = [
      `<div class="result-grid">`,
      `<div class="result-row"><span>得分</span><strong>${formatScore(rawScore)}</strong></div>`,
      `<div class="result-row"><span>时间</span><strong>${state.elapsed.toFixed(1)}s</strong></div>`,
      `<div class="result-row"><span>擦弹</span><strong>${Math.floor(state.grazeFrames)}</strong></div>`,
      `<div class="result-row"><span>触发</span><strong>${state.grazeEntries}</strong></div>`,
      `<div class="result-row"><span>峰值</span><strong>x${state.peakRate.toFixed(2)}</strong></div>`,
      `<div class="result-row"><span>罚时</span><strong>${timePenalty}</strong></div>`,
      `<div class="result-row"><span>残机</span><strong>x${lifeMultiplier.toFixed(2)}</strong></div>`,
      `<div class="result-row"><span>无伤</span><strong>x${noHitMultiplier.toFixed(2)}</strong></div>`,
      `<div class="result-row"><span>修正</span><strong>x${tacticMultiplier.toFixed(2)}</strong></div>`,
      `<div class="result-row total"><span>最终分数</span><strong>${formatScore(finalScore)}</strong></div>`,
      `</div>`
    ].join('');

    resultStats.innerHTML = [
      `<div class="result-grid">`,
      `<div class="result-row"><span>得分</span><strong>${formatScore(rawScore)}</strong></div>`,
      `<div class="result-row"><span>时间</span><strong>${state.elapsed.toFixed(1)}s</strong></div>`,
      `<div class="result-row"><span>擦弹</span><strong>${Math.floor(state.grazeFrames)}</strong></div>`,
      `<div class="result-row"><span>触发</span><strong>${state.grazeEntries}</strong></div>`,
      `<div class="result-row"><span>峰值</span><strong>x${state.peakRate.toFixed(2)}</strong></div>`,
      `<div class="result-row"><span>罚时</span><strong>${timePenalty}</strong></div>`,
      `<div class="result-row"><span>残机</span><strong>x${lifeMultiplier.toFixed(2)}</strong></div>`,
      `<div class="result-row"><span>无伤</span><strong>x${noHitMultiplier.toFixed(2)}</strong></div>`,
      `<div class="result-row"><span>修正</span><strong>x${tacticMultiplier.toFixed(2)}</strong></div>`,
      `<div class="result-row total"><span>最终</span><strong>${formatScore(finalScore)}</strong></div>`,
      `</div>`
    ].join('');

    resultOverlay.classList.remove('hidden');
    resultOverlay.classList.add('visible');
  }

  function spawnPlayerShot(x, y) {
    state.bullets.push({ x, y, vx: 0, vy: -470, r: 2, h: 10 });
  }

  function spawnEnemyBullet(x, y, angle, speed, type = 'dot', extra = {}) {
    state.enemyBullets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: type === 'ring' ? 8 : type === 'needle' ? 4 : type === 'squareBounce' ? 8 : 5,
      type,
      age: 0,
      ttl: extra.ttl || 10,
      angle,
      ...extra,
    });
  }

  function spawnBurst(x, y, count, speedMin, speedMax, extra = {}) {
    const lifeMin = extra.lifeMin ?? 0.4;
    const lifeSpread = extra.lifeSpread ?? 0.25;
    const arc = extra.arc ?? Math.PI * 2;
    const baseAngle = extra.baseAngle ?? 0;

    for (let i = 0; i < count; i++) {
      const t = count <= 1 ? 0.5 : i / (count - 1);
      const a = arc >= Math.PI * 2
        ? baseAngle + (Math.PI * 2 * i) / count + Math.random() * 0.18
        : baseAngle - arc / 2 + arc * t + (Math.random() - 0.5) * 0.28;
      const s = speedMin + Math.random() * (speedMax - speedMin);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: lifeMin + Math.random() * lifeSpread,
        size: extra.size ?? (Math.random() < 0.15 ? 3 : 2),
        color: extra.color || null,
        decay: extra.decay ?? 0.985,
        graze: extra.graze || false,
      });
    }
  }

  function spawnGrazeBurst(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + Math.random() * 0.35;
      const s = 18 + Math.random() * 20;
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.18 + Math.random() * 0.12,
        size: 2,
        graze: true,
      });
    }
  }

  function spawnPetalDrop(index, x, y) {
    state.petalDrops.push({
      index,
      x,
      y,
      vx: (Math.random() - 0.5) * 18,
      vy: 18 + Math.random() * 12,
      rot: (index / MAX_LIVES) * Math.PI * 2,
      vr: (Math.random() - 0.5) * 1.2,
      age: 0,
      ttl: 1.2,
      scale: 0.9 + Math.random() * 0.18,
    });
  }

  function bombUnlocked() {
    return state.score > BOMB_UNLOCK_SCORE;
  }

  function bombChargeRatio() {
    return clamp(state.bomb.charge / BOMB_CHARGE_TIME, 0, 1);
  }

  function bombFreezeProgress() {
    return clamp(state.bomb.freezeHold / BOMB_FREEZE_TIME, 0, 1);
  }

  function bombDeepFreezeProgress() {
    return bombFreezeProgress();
  }

  function bombAssaultColorRatio() {
    if (!state.bomb.active) return 0;
    if (state.bomb.stage === 'recover') return 1;
    if (state.bomb.stage !== 'assault') return 0;
    return clamp((state.bomb.stageTimer - BOMB_ASSAULT_COLOR_DELAY) / BOMB_ASSAULT_COLOR_RAMP, 0, 1);
  }

  function bombSprayCenterX(depth, lanePhase = 0) {
    return state.player.x + lanePhase * (5 + depth * 0.016);
  }

  function bombSprayHalfWidth(depth, bloom = 1) {
    const t = easeOutCubic(clamp(depth / (H + 220), 0, 1));
    return lerp(10, 152, t) * bloom;
  }

  function sampleBombSprayPoint(depth, lane = 0, bloom = 1) {
    const half = bombSprayHalfWidth(depth, bloom);
    const center = bombSprayCenterX(depth, lane * 0.35);
    return {
      x: center + lane * half * 0.34 + rand(-1, 1) * half * 0.10,
      y: (state.player.y - 18) - depth + rand(-8, 8),
    };
  }

  function bossInBombSpray() {
    const depth = (state.player.y - 18) - (state.boss.y + 10);
    if (depth < 12 || depth > H + 260) return false;
    const center = bombSprayCenterX(depth);
    const half = bombSprayHalfWidth(depth, 1.08) + 28;
    return Math.abs(state.boss.x - center) < half;
  }

  function bossInvulnerable() {
    return state.boss.phaseIntro > 0 && !state.finish.active;
  }

  function pickBombColor(index) {
    return ['cyan', 'magenta', 'gold'][Math.abs(index) % 3];
  }

  function clearEnemyBullets(withVisual = false) {
    if (!state.enemyBullets.length) return;

    if (withVisual) {
      const sampleCount = Math.min(18, state.enemyBullets.length);
      for (let i = 0; i < sampleCount; i++) {
        const eb = state.enemyBullets[Math.floor((i / sampleCount) * state.enemyBullets.length)];
        const x = typeof eb.x === 'number' ? eb.x : W / 2;
        const y = typeof eb.y === 'number' ? eb.y : H * 0.52;
        spawnBurst(x, y, 7, 20, 82, {
          color: 'white',
          lifeMin: 0.14,
          lifeSpread: 0.10,
          size: 2,
        });
      }
    }

    state.enemyBullets = [];
  }

  function updateBossPhase() {
    if (state.finish.active) return;

    const ratio = state.boss.hp / state.boss.maxHp;
    let nextPhase = 1;

    if (ratio <= PHASE2_RATIO && ratio > PHASE3_RATIO) nextPhase = 2;
    if (ratio <= PHASE3_RATIO && ratio > PHASE4_RATIO) nextPhase = 3;
    if (ratio <= PHASE4_RATIO) nextPhase = 4;

    if (nextPhase !== state.phase) {
      state.phase = nextPhase;
      state.boss.phaseIntro = nextPhase === 4 ? 1.2 : 0.8;
      spawnBurst(state.boss.x, state.boss.y, nextPhase === 4 ? 84 : 42, 42, nextPhase === 4 ? 180 : 135);
      clearEnemyBullets(true);
      state.nextPattern = nextPhase === 4 ? 0.95 : 0.72;
    }
  }

  function aimAngle(fromX, fromY, toX, toY) {
    return Math.atan2(toY - fromY, toX - fromX);
  }

  function fireFan(count, spread, speed, type = 'dot') {
    const a0 = aimAngle(state.boss.x, state.boss.y, state.player.x, state.player.y);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      const offset = (t - 0.5) * spread * count * 0.58;
      spawnEnemyBullet(state.boss.x, state.boss.y, a0 + offset, speed, type);
    }
  }

  function fireRing(count, speed, offset = 0) {
    for (let i = 0; i < count; i++) {
      const a = offset + (Math.PI * 2 * i) / count;
      spawnEnemyBullet(state.boss.x, state.boss.y, a, speed, 'ring');
    }
  }

  function fireRotatingCross(arms, speed, rot, type = 'dot') {
    for (let i = 0; i < arms; i++) {
      const a = rot + (Math.PI * 2 * i) / arms;
      spawnEnemyBullet(state.boss.x, state.boss.y, a, speed, type);
    }
  }

  function fireLaserWarning() {
    const x = 70 + Math.random() * (W - 140);
    state.enemyBullets.push({ type: 'laserWarn', x, age: 0, ttl: 1.05, fired: false });
  }

  function fireWallSweep() {
    const left = Math.random() < 0.5;
    for (let i = 0; i < 9; i++) {
      const y = 196 + i * 40;
      state.enemyBullets.push({
        type: 'wall',
        x: left ? -24 - i * 8 : W + 24 + i * 8,
        y,
        vx: left ? 155 : -155,
        vy: 0,
        r: 8,
        age: 0,
        ttl: 4,
      });
    }
  }

  function fireSpiralVolley(turns = 2, speed = 135) {
    const base = state.boss.timer * 1.75;
    for (let i = 0; i < 2 * turns; i++) {
      const a = base + i * Math.PI;
      spawnEnemyBullet(state.boss.x, state.boss.y, a, speed, 'needle', {
        spin: i % 2 === 0 ? 0.85 : -0.85,
        ttl: 7.5,
      });
    }
  }

  function firePetalBloom() {
    const petals = 12;
    const base = state.boss.timer * 0.55;
    for (let i = 0; i < petals; i++) {
      const a = base + (Math.PI * 2 * i) / petals;
      spawnEnemyBullet(state.boss.x, state.boss.y, a, 96, 'petal', {
        accel: 24,
        ttl: 8,
      });
    }
  }

  function fireTripleBloomBurst() {
    const layers = [
      { count: 10, speed: 96, type: 'ring', offset: state.boss.timer * 0.72 },
      { count: 14, speed: 132, type: 'petal', offset: state.boss.timer * 1.05 + 0.14 },
      { count: 18, speed: 170, type: 'needle', offset: state.boss.timer * 1.35 + 0.28 },
    ];

    layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer.count; i++) {
        const a = layer.offset + (Math.PI * 2 * i) / layer.count;
        spawnEnemyBullet(state.boss.x, state.boss.y + layerIndex * 2, a, layer.speed, layer.type, {
          ttl: 7.2 - layerIndex * 0.45,
          accel: layer.type === 'petal' ? 18 + layerIndex * 8 : undefined,
          spin: layer.type === 'needle' ? (i % 2 === 0 ? 0.45 : -0.45) : undefined,
        });
      }
    });
  }

  function fireSidePods() {
    const b = state.boss;
    const wingSpread = 52 + Math.sin(b.timer * 2.2) * 6;
    const emitters = [
      { x: b.x - wingSpread, y: b.y + 8 },
      { x: b.x + wingSpread, y: b.y + 8 },
    ];

    emitters.forEach((e, index) => {
      const base = aimAngle(e.x, e.y, state.player.x, state.player.y) + (index === 0 ? -0.22 : 0.22);
      for (let i = 0; i < 3; i++) {
        spawnEnemyBullet(e.x, e.y, base + (i - 1) * 0.18, 170, 'needle', { ttl: 6.4 });
      }
    });
  }

  function fireDiagonalBounceSquareBurst() {
    const b = state.boss;
    const startY = b.y + 8;

    [-1, 1].forEach((side) => {
      for (let i = 0; i < 3; i++) {
        const speedX = (180 + i * 16) * side;
        const speedY = 104 + i * 10;
        state.enemyBullets.push({
          type: 'squareBounce',
          x: b.x + side * (10 + i * 8),
          y: startY + (i - 1) * 10,
          vx: speedX,
          vy: speedY,
          r: 8,
          age: 0,
          ttl: 11.2,
          bouncesLeft: 7,
          glow: i === 1 ? 1 : 0.72,
        });
      }
    });
  }

  function updateBossMotion(dt) {
    const boss = state.boss;
    boss.timer += dt;
    boss.drift += dt * (state.phase >= 3 ? 1.15 : 0.95);
    boss.phaseIntro = Math.max(0, boss.phaseIntro - dt);
    boss.haloSpin += dt * (state.phase === 4 ? 1.35 : 0.45);
    boss.crownOpen += (((state.phase >= 4) ? 1 : (state.phase >= 3 ? 0.35 : 0.08)) - boss.crownOpen) * 0.08;
    boss.shellShift += (((state.phase >= 4) ? 1 : 0) - boss.shellShift) * 0.06;
    boss.auraPulse += (((state.phase >= 4) ? 1 : (state.phase >= 2 ? 0.45 : 0.18)) - boss.auraPulse) * 0.06;
    boss.iris += (((state.phase >= 4) ? 1.2 : (state.phase === 3 ? 1 : 0.35)) - boss.iris) * 0.06;

    const targetRadius = state.phase >= 4 ? 94 : state.phase === 3 ? 88 : 72;
    const targetYAmplitude = state.phase >= 4 ? 8 : 6;

    boss.orbitRadius += (targetRadius - boss.orbitRadius) * 0.08;
    boss.orbitYAmplitude += (targetYAmplitude - boss.orbitYAmplitude) * 0.08;

    if (state.finish.active) {
      boss.x = state.finish.x;
      boss.y = state.finish.y;
    } else {
      boss.x = W / 2 + Math.sin(boss.drift) * boss.orbitRadius;
      boss.y = 124 + Math.sin(boss.timer * 1.4) * boss.orbitYAmplitude;
    }

    boss.leftPodOpen += ((state.phase >= 2 ? 1 : 0.15) - boss.leftPodOpen) * 0.08;
    boss.rightPodOpen += ((state.phase >= 3 ? 1 : 0.2) - boss.rightPodOpen) * 0.08;
  }

  function emitBossPatterns(dt) {
    if (state.bomb.active || state.finish.active) return;

    state.nextPattern -= dt;
    if (state.nextPattern > 0 || state.boss.phaseIntro > 0.15) return;

    const p = state.phase;

    if (p === 1) {
      const roll = Math.random();
      if (roll < 0.48) {
        fireFan(5, 0.38, 160);
        state.nextPattern = 0.78;
      } else if (roll < 0.76) {
        fireRing(16, 128, state.boss.timer * 0.45);
        state.nextPattern = 0.98;
      } else {
        fireSpiralVolley(2, 118);
        state.nextPattern = 0.70;
      }
    } else if (p === 2) {
      const roll = Math.random();
      if (roll < 0.32) {
        fireRotatingCross(8, 168, state.boss.timer * 1.05);
        firePetalBloom();
        state.nextPattern = 0.74;
      } else if (roll < 0.62) {
        fireLaserWarning();
        fireSidePods();
        state.nextPattern = 1.05;
      } else {
        fireSpiralVolley(3, 136);
        fireFan(6, 0.34, 178, 'needle');
        state.nextPattern = 0.72;
      }
    } else if (p === 3) {
      const roll = Math.random();
      if (roll < 0.28) {
        firePetalBloom();
        fireRing(18, 152, state.boss.timer * 0.9);
        fireSidePods();
        state.nextPattern = 0.68;
      } else if (roll < 0.56) {
        fireLaserWarning();
        fireWallSweep();
        state.nextPattern = 1.08;
      } else if (roll < 0.82) {
        fireSpiralVolley(4, 152);
        fireFan(7, 0.52, 198, 'needle');
        state.nextPattern = 0.64;
      } else {
        fireRotatingCross(10, 178, state.boss.timer * 1.45, 'needle');
        fireRing(14, 120, state.boss.timer * 0.45);
        state.nextPattern = 0.72;
      }
    } else {
      const roll = Math.random();
      if (roll < 0.24) {
        fireDiagonalBounceSquareBurst();
        fireTripleBloomBurst();
        state.nextPattern = 0.84;
      } else if (roll < 0.48) {
        fireLaserWarning();
        fireWallSweep();
        fireTripleBloomBurst();
        state.nextPattern = 1.00;
      } else if (roll < 0.74) {
        fireSpiralVolley(4, 160);
        fireFan(7, 0.52, 206, 'needle');
        fireTripleBloomBurst();
        state.nextPattern = 0.62;
      } else {
        fireRotatingCross(12, 188, state.boss.timer * 1.68, 'needle');
        fireRing(16, 126, state.boss.timer * 0.55);
        fireSidePods();
        fireTripleBloomBurst();
        state.nextPattern = 0.68;
      }
    }
  }

  function updatePatterns(dt) {
    updateBossMotion(dt);
    emitBossPatterns(dt);
  }

  function updateBombCharge(dt) {
    state.bomb.readyPulse += dt;
    state.bomb.cancelFx = Math.max(0, state.bomb.cancelFx - dt);
    if (state.bomb.active || state.finish.active) return;

    if (state.bomb.ready && !state.pointerActive) {
      const fxSpeed = lerp(0.78, 0.08, easeInOutCubic(bombFreezeProgress()));
      state.bomb.freezeFxTime += dt * fxSpeed;
    } else {
      state.bomb.freezeFxTime = 0;
    }

    if (bombUnlocked()) {
      const chargeDt = state.pointerActive ? dt : dt * clamp(state.timeScale, 0.2, 1);
      const wasReady = state.bomb.ready;
      state.bomb.charge = Math.min(BOMB_CHARGE_TIME, state.bomb.charge + chargeDt);
      if (state.bomb.charge >= BOMB_CHARGE_TIME) state.bomb.ready = true;
      if (!wasReady && state.bomb.ready && !state.hint.shown) {
        state.hint.shown = true;
        showHint('觉得太难就松手吧，有可能会引发奇迹喔');
      }
    } else {
      state.bomb.charge = 0;
      state.bomb.ready = false;
      state.bomb.freezeHold = 0;
      state.bomb.freezeFxTime = 0;
      state.bomb.cancelFx = 0;
    }
  }

  function triggerBombFreezeCancel() {
    state.bomb.cancelFx = BOMB_CANCEL_FX_TIME;
    state.bomb.freezeFxTime = 0;
    spawnBurst(state.player.x, state.player.y, 10, 10, 42, {
      color: 'white',
      lifeMin: 0.10,
      lifeSpread: 0.08,
      size: 2,
    });
  }

  function startBombSequence() {
    if (state.bomb.active || !state.bomb.ready || state.finish.active) return;

    state.bomb.active = true;
    state.bomb.stage = 'detonate';
    state.bomb.stageTimer = 0;
    state.bomb.damageTick = 0;
    state.bomb.trailTick = 0;
    state.bomb.uses += 1;
    state.bomb.ready = false;
    state.bomb.charge = 0;
    state.bomb.freezeHold = 0;
    state.bomb.freezeFxTime = 0;
    state.bomb.cancelFx = 0;

    state.score = Math.max(0, state.score - BOMB_SCORE_COST);
    state.timeScale = 1;
    state.invuln = Math.max(state.invuln, 1.2);
    state.nextPattern = Math.max(state.nextPattern, 1.4);
    state.shake = Math.max(state.shake, 1.0);
    state.bullets = [];

    clearEnemyBullets(false);
    spawnBurst(state.player.x, state.player.y, 38, 34, 152, {
      color: 'white',
      lifeMin: 0.18,
      lifeSpread: 0.12,
      size: 2,
    });
    spawnBurst(state.boss.x, state.boss.y, 42, 28, 144, {
      color: 'white',
      lifeMin: 0.20,
      lifeSpread: 0.12,
      size: 2,
    });
  }

  function setBombStage(stage) {
    state.bomb.stage = stage;
    state.bomb.stageTimer = 0;
    state.bomb.damageTick = 0;
    state.bomb.trailTick = 0;

    if (stage === 'stall') {
      state.shake = Math.max(state.shake, 0.28);
      return;
    }

    if (stage === 'charge') {
      state.shake = Math.max(state.shake, 0.32);
      spawnBurst(state.player.x, state.player.y, 18, 18, 78, {
        color: 'white',
        lifeMin: 0.18,
        lifeSpread: 0.10,
        size: 2,
      });
      return;
    }

    if (stage === 'snap') {
      state.shake = Math.max(state.shake, 1.2);
      state.killFlash = Math.max(state.killFlash, 0.16);
      return;
    }

    if (stage === 'assault') {
      state.shake = Math.max(state.shake, 0.7);
      state.player.y = H - 26;
      state.player.drawY = Math.min(state.player.drawY, H - 96);
      state.dragAnchor.py = state.player.y;
      state.dragAnchor.px = state.player.x;
      spawnBurst(state.player.x, state.player.y - 10, 26, 44, 168, {
        color: 'white',
        lifeMin: 0.18,
        lifeSpread: 0.14,
        size: 3,
        arc: 0.95,
        baseAngle: -Math.PI / 2,
      });
      return;
    }

    if (stage === 'recover') {
      state.shake = Math.max(state.shake, 0.16);
    }
  }

  function finishBombSequence() {
    state.bomb.active = false;
    state.bomb.stage = 'idle';
    state.bomb.stageTimer = 0;
    state.bomb.damageTick = 0;
    state.bomb.trailTick = 0;
    state.timeScale = 1;
    state.nextPattern = Math.max(state.nextPattern, 0.85);
  }

  function updateBombSequence(dt) {
    if (!state.bomb.active) return;

    state.bomb.stageTimer += dt;
    state.timeScale += (1 - state.timeScale) * 0.18;
    state.invuln = Math.max(state.invuln, 0.18);
    clearEnemyBullets(false);

    if (state.bomb.stage === 'detonate') {
      if (Math.random() < 0.38) {
        spawnBurst(state.player.x + rand(-12, 12), state.player.y - rand(18, 120), 4, 18, 72, {
          color: 'white',
          lifeMin: 0.10,
          lifeSpread: 0.08,
          size: 2,
          arc: 1.2,
          baseAngle: -Math.PI / 2,
        });
      }
      if (state.bomb.stageTimer >= BOMB_DETONATE_TIME) setBombStage('stall');
      return;
    }

    if (state.bomb.stage === 'stall') {
      if (Math.random() < 0.18) {
        spawnBurst(state.player.x + rand(-10, 10), state.player.y + rand(-10, 10), 3, 12, 42, {
          color: 'white',
          lifeMin: 0.12,
          lifeSpread: 0.08,
          size: 2,
        });
      }
      if (Math.random() < 0.18) {
        spawnBurst(state.player.x + rand(-14, 14), state.player.y - rand(24, 92), 3, 12, 44, {
          color: 'white',
          lifeMin: 0.12,
          lifeSpread: 0.08,
          size: 2,
          arc: 1.1,
          baseAngle: -Math.PI / 2,
        });
      }
      if (state.bomb.stageTimer >= BOMB_STALL_TIME) setBombStage('charge');
      return;
    }

    if (state.bomb.stage === 'charge') {
      for (let i = 0; i < 3; i++) {
        const a = state.bomb.stageTimer * 6 + i * ((Math.PI * 2) / 3);
        const radius = 14 + i * 8 + Math.sin(state.bomb.stageTimer * 10 + i) * 2;
        state.particles.push({
          x: state.player.x + Math.cos(a) * radius,
          y: state.player.y + Math.sin(a) * radius,
          vx: Math.cos(a) * 32,
          vy: Math.sin(a) * 32 - 28,
          life: 0.18 + Math.random() * 0.08,
          size: 2 + (i % 2),
          color: 'white',
          decay: 0.97,
        });
      }

      if (state.bomb.stageTimer >= BOMB_CHARGE_STAGE_TIME) setBombStage('snap');
      return;
    }

    if (state.bomb.stage === 'snap') {
      state.timeScale = Math.min(state.timeScale, 0.04);
      if (state.bomb.stageTimer >= BOMB_SNAP_TIME) setBombStage('assault');
      return;
    }

    if (state.bomb.stage === 'assault') {
      const colorRatio = bombAssaultColorRatio();
      state.shake = Math.max(state.shake, 0.60 + colorRatio * 0.10);
      state.bomb.damageTick += dt;
      state.bomb.trailTick += dt;

      while (state.bomb.trailTick >= 0.03) {
        state.bomb.trailTick -= 0.03;
        const depth = rand(30, 300 + colorRatio * 160);
        const lane = rand(-1.4, 1.4);
        const point = sampleBombSprayPoint(depth, lane, 0.8 + colorRatio * 0.9);
        spawnBurst(point.x, point.y, 3, 8, 38, {
          color: colorRatio > 0.04
            ? (Math.random() < 0.34 ? 'cyan' : Math.random() < 0.68 ? 'magenta' : 'white')
            : 'white',
          lifeMin: 0.10,
          lifeSpread: 0.08,
          size: 2,
        });
      }

      while (state.bomb.damageTick >= 0.12) {
        state.bomb.damageTick -= 0.12;
        if (!bossInBombSpray()) continue;
        const damage = 34 + state.phase * 7;
        state.boss.hp = Math.max(0, state.boss.hp - damage);
        state.boss.damageFlash = 0.14;
        state.bossHitCount += 6;
        state.score += BOMB_DAMAGE_SCORE;
        spawnBurst(state.boss.x + rand(-18, 18), state.boss.y + rand(-18, 18), 10, 26, 132, {
          color: colorRatio > 0.12 ? 'gold' : 'white',
          lifeMin: 0.14,
          lifeSpread: 0.12,
          size: 2,
        });
        spawnBurst(state.boss.x + rand(-12, 12), state.boss.y + rand(-12, 12), 6, 18, 96, {
          color: colorRatio > 0.42 ? pickBombColor(Math.floor(state.boss.timer * 20)) : 'white',
          lifeMin: 0.12,
          lifeSpread: 0.10,
          size: 2,
        });
        if (state.boss.hp <= 0) break;
      }

      if (state.bomb.stageTimer >= BOMB_ASSAULT_TIME) setBombStage('recover');
      return;
    }

    if (state.bomb.stage === 'recover' && state.bomb.stageTimer >= BOMB_RECOVERY_TIME) {
      finishBombSequence();
    }
  }

  function startVictorySequence() {
    if (state.finish.active) return;

    state.finish.x = state.boss.x;
    state.finish.y = state.boss.y;
    state.finish.active = true;
    state.finish.timer = 0;
    state.finish.burstTick = 0;
    state.finish.pose = 0;
    state.boss.hp = 0;
    state.bomb.active = false;
    state.bomb.ready = false;
    state.bomb.charge = 0;
    state.bomb.freezeHold = 0;
    state.bomb.stage = 'idle';
    state.shake = Math.max(state.shake, 1.1);
    state.killFlash = Math.max(state.killFlash, 0.72);
    state.invuln = Math.max(state.invuln, 1.5);
    clearEnemyBullets(true);

    spawnBurst(state.finish.x, state.finish.y, 92, 34, 220, {
      color: 'white',
      lifeMin: 0.34,
      lifeSpread: 0.22,
      size: 3,
    });
    spawnBurst(state.finish.x, state.finish.y, 24, 70, 240, {
      color: 'white',
      lifeMin: 0.30,
      lifeSpread: 0.16,
      size: 3,
    });
    spawnBurst(state.finish.x, state.finish.y, 24, 70, 240, {
      color: 'white',
      lifeMin: 0.30,
      lifeSpread: 0.16,
      size: 3,
    });
    spawnBurst(state.finish.x, state.finish.y, 24, 70, 240, {
      color: 'white',
      lifeMin: 0.30,
      lifeSpread: 0.16,
      size: 3,
    });
  }

  function updateVictorySequence(dt) {
    if (!state.finish.active) return;

    state.finish.timer += dt;
    state.finish.burstTick += dt;
    state.timeScale += (1 - state.timeScale) * 0.18;
    state.invuln = Math.max(state.invuln, 0.22);
    clearEnemyBullets(false);

    const progress = clamp(state.finish.timer / VICTORY_ANIM_TIME, 0, 1);
    state.finish.pose = progress;

    if (state.finish.burstTick >= 0.09) {
      state.finish.burstTick = 0;
      state.shake = Math.max(state.shake, 0.22 + (1 - progress) * 0.42);
      spawnBurst(state.finish.x + rand(-18, 18), state.finish.y + rand(-18, 18), 8, 20, 120, {
        color: 'white',
        lifeMin: 0.16,
        lifeSpread: 0.10,
        size: 2,
      });
    }

    if (progress > 0.78) {
      state.killFlash = Math.max(state.killFlash, (progress - 0.78) * 2.6);
    }

    if (state.finish.timer >= VICTORY_ANIM_TIME) {
      state.finish.pose = 1;
      endGame(true);
    }
  }

  function updateTimeScale(dt) {
    if (state.bomb.active || state.finish.active) {
      state.bomb.freezeHold = 0;
      state.timeScale += (1 - state.timeScale) * 0.16;
      return;
    }

    if (state.bomb.ready && state.pointerActive && state.bomb.freezeHold > 0) {
      triggerBombFreezeCancel();
    }

    if (state.bomb.ready && !state.pointerActive) {
      state.bomb.freezeHold = Math.min(BOMB_FREEZE_TIME, state.bomb.freezeHold + dt);
      const freezeTarget = 0.2 * (1 - bombDeepFreezeProgress());
      state.timeScale = freezeTarget;
      if (bombFreezeProgress() >= 1) startBombSequence();
      return;
    }

    state.bomb.freezeHold = 0;
    const slowTarget = state.pointerActive ? 1 : 0.2;
    state.timeScale += (slowTarget - state.timeScale) * (state.pointerActive ? 0.2 : 0.08);
  }

  function updateStars(dt) {
    state.stars.forEach((s) => {
      s.y += s.v * (0.45 + state.timeScale * 0.55) * dt;
      if (s.y > H) {
        s.y = -4;
        s.x = Math.random() * W;
      }
    });
  }

  function updatePlayerMovement() {
    const recoilLocked = state.bomb.active && (state.bomb.stage === 'assault' || state.bomb.stage === 'recover');

    if (state.pointerActive) {
      const desiredX = clamp(state.dragAnchor.px + (state.targetX - state.dragAnchor.x), 18, W - 18);
      const desiredY = clamp(state.dragAnchor.py + (state.targetY - state.dragAnchor.y), 160, H - 26);

      if (recoilLocked) {
        state.player.x += (desiredX - state.player.x) * 0.018;
      } else {
        state.player.x = desiredX;
        state.player.y = desiredY;
      }
    }

    if (recoilLocked) {
      state.player.y += ((H - 26) - state.player.y) * 0.34;
      state.player.y = clamp(state.player.y, H - 44, H - 26);
    }

    state.player.drawX += (state.player.x - state.player.drawX) * (recoilLocked ? 0.14 : 0.34);
    state.player.drawY += (state.player.y - state.player.drawY) * 0.34;
  }

  function updatePlayerFire(scaledDt) {
    if (state.bomb.active || state.finish.active) return;
    state.nextShot -= scaledDt;
    if (state.nextShot <= 0) {
      spawnPlayerShot(state.player.x, state.player.y - 15);
      spawnPlayerShot(state.player.x - 6, state.player.y - 11);
      spawnPlayerShot(state.player.x + 6, state.player.y - 11);
      state.nextShot = 0.082;
    }
  }

  function updatePlayerBullets(scaledDt) {
    for (const b of state.bullets) {
      b.x += b.vx * scaledDt;
      b.y += b.vy * scaledDt;

      if (state.finish.active) continue;
      if (dist(b.x, b.y, state.boss.x, state.boss.y) >= 34) continue;

      b.dead = true;
      const empowered = state.bomb.active && state.bomb.stage === 'assault';
      if (!bossInvulnerable() || empowered) {
        state.boss.hp = Math.max(0, state.boss.hp - (empowered ? 5 : 2));
        state.boss.damageFlash = empowered ? 0.12 : 0.08;
        state.bossHitCount += empowered ? 3 : 1;
        state.score += (empowered ? 12 : PLAYER_HIT_SCORE) * state.grazeRate;
        if (Math.random() < (empowered ? 0.85 : 0.42)) {
          spawnBurst(b.x, b.y, empowered ? 5 : 3, 18, empowered ? 80 : 50, {
            color: empowered ? pickBombColor(Math.floor(state.boss.timer * 22)) : null,
            lifeMin: empowered ? 0.12 : 0.18,
            lifeSpread: empowered ? 0.10 : 0.12,
            size: empowered ? 3 : 2,
          });
        }
      } else if (Math.random() < 0.25) {
        spawnBurst(b.x, b.y, 2, 8, 20);
      }
    }

    state.bullets = state.bullets.filter((b) => !b.dead && b.y > -30);
  }

  function updateEnemyProjectiles(scaledDt, dt) {
    if (state.bomb.active || state.finish.active) {
      clearEnemyBullets(false);
      return;
    }

    for (const eb of state.enemyBullets) {
      eb.age += scaledDt;

      if (eb.type === 'laserWarn') {
        if (!eb.fired && eb.age >= 0.8) {
          eb.fired = true;
          state.enemyBullets.push({ type: 'laserBeam', x: eb.x, age: 0, ttl: 0.28 });
        }
        if (eb.age > eb.ttl) eb.dead = true;
        continue;
      }

      if (eb.type === 'laserBeam') {
        if (Math.abs(state.player.x - eb.x) < 9 && state.player.y > 120) hitPlayer();
        if (eb.age > eb.ttl) eb.dead = true;
        continue;
      }

      if (typeof eb.spin === 'number') {
        eb.angle += eb.spin * scaledDt;
        const speed = Math.hypot(eb.vx, eb.vy);
        eb.vx = Math.cos(eb.angle) * speed;
        eb.vy = Math.sin(eb.angle) * speed;
      }

      if (typeof eb.accel === 'number') {
        const speed = Math.hypot(eb.vx, eb.vy) + eb.accel * scaledDt;
        const angle = Math.atan2(eb.vy, eb.vx);
        eb.vx = Math.cos(angle) * speed;
        eb.vy = Math.sin(angle) * speed;
      }

      eb.x += eb.vx * scaledDt;
      eb.y += eb.vy * scaledDt;

      if (eb.type === 'squareBounce') {
        if ((eb.x <= eb.r && eb.vx < 0) || (eb.x >= W - eb.r && eb.vx > 0)) {
          eb.vx *= -1;
          eb.x = clamp(eb.x, eb.r, W - eb.r);
          eb.bouncesLeft = (eb.bouncesLeft ?? 0) - 1;
          spawnBurst(eb.x, eb.y, 6, 12, 40);
          if ((eb.bouncesLeft ?? 0) < 0) eb.dead = true;
        }
      }

      const grazeRadius = state.player.grazeR + eb.r * 0.8;
      const hitRadius = state.player.hitR + eb.r * 0.78;
      const d = dist(state.player.x, state.player.y, eb.x, eb.y);

      if (d < grazeRadius && d > hitRadius + 1.4) {
        state.grazeFrames += dt * 60;
        state.grazeHeat = Math.min(180, state.grazeHeat + dt * 90);

        if (!eb.grazeEntered) {
          eb.grazeEntered = true;
          state.grazeEntries += 1;
          spawnGrazeBurst(eb.x, eb.y);
        }

        state.score += (GRAZE_SCORE_BASE + (state.grazeRate - 1) * GRAZE_SCORE_SCALE) * dt * 60;
      } else {
        eb.grazeEntered = false;
      }

      if (eb.x < -60 || eb.x > W + 60 || eb.y < -70 || eb.y > H + 90 || eb.age > eb.ttl) eb.dead = true;
      if (circleHit(state.player.x, state.player.y, state.player.hitR, eb.x, eb.y, eb.r * 0.78)) hitPlayer();
    }

    state.enemyBullets = state.enemyBullets.filter((eb) => !eb.dead);
  }

  function updateParticlesState(scaledDt) {
    for (const p of state.particles) {
      p.life -= scaledDt;
      p.x += p.vx * scaledDt;
      p.y += p.vy * scaledDt;
      p.vx *= p.decay ?? 0.985;
      p.vy *= p.decay ?? 0.985;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  }

  function updatePetalDrops(dt) {
    for (const petal of state.petalDrops) {
      petal.age += dt;
      petal.x += petal.vx * dt;
      petal.y += petal.vy * dt;
      petal.vy += 22 * dt;
      petal.vx *= 0.992;
      petal.rot += petal.vr * dt;
    }
    state.petalDrops = state.petalDrops.filter((petal) => petal.age < petal.ttl);
  }

  function update(dt) {
    updateTimeScale(dt);
    updateBombCharge(dt);

    const scaledDt = dt * state.timeScale;
    state.elapsed = (performance.now() - state.startTime) / 1000;
    state.timePenalty = state.elapsed * TIME_PENALTY_RATE;

    if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - scaledDt);
    if (state.killFlash > 0) state.killFlash = Math.max(0, state.killFlash - dt);
    if (state.hint.timer > 0) state.hint.timer = Math.max(0, state.hint.timer - dt);
    state.sakuraPulse = Math.max(0, state.sakuraPulse - dt * 1.7);
    state.sakuraShock = Math.max(0, state.sakuraShock - dt * 3.8);
    state.shake = Math.max(0, state.shake - dt * 1.9);

    updateStars(dt);
    updatePlayerMovement();
    updatePlayerFire(scaledDt);

    if (state.bomb.active) updateBombSequence(dt);
    if (state.finish.active) updateVictorySequence(dt);

    updatePatterns(scaledDt);
    updatePlayerBullets(scaledDt);
    updateEnemyProjectiles(scaledDt, dt);

    state.grazeHeat = Math.max(0, state.grazeHeat - dt * 20);
    state.grazeRate += ((1 + Math.min(2.5, state.grazeHeat / 75)) - state.grazeRate) * 0.08;
    state.peakRate = Math.max(state.peakRate, state.grazeRate);

    updateParticlesState(scaledDt);
    updatePetalDrops(dt);

    if (state.boss.damageFlash > 0) state.boss.damageFlash = Math.max(0, state.boss.damageFlash - scaledDt);

    updateBossPhase();
    if (state.boss.hp <= 0 && !state.finish.active) {
      startVictorySequence();
    }
  }

  function hitPlayer() {
    if (state.invuln > 0 || !state.running || state.bomb.active || state.finish.active) return;

    const lostIndex = state.player.hp - 1;
    state.player.hp -= 1;
    state.invuln = 1.18;
    state.noHit = false;
    state.sakuraPulse = 0.8;
    state.sakuraShock = 1;
    spawnBurst(state.player.x, state.player.y, 24, 24, 116);

    if (lostIndex >= 0) spawnPetalDrop(lostIndex, W - 54, 56);
    if (state.player.hp <= 0) endGame(false);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 9 : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 9 : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    for (const s of state.stars) {
      ctx.fillStyle = s.s === 2 ? '#a0a0a0' : '#666';
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
    }

    drawBoss();
    drawBullets();
    drawFreezeChargeFx();
    drawParticles();
    drawBombFx();
    drawPlayer();
    drawVictoryFx();
    drawSakuraLives();

    ctx.restore();

    const overlayAlpha = getScreenOverlayAlpha();
    if (overlayAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${overlayAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (state.killFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.88, state.killFlash)})`;
      ctx.fillRect(0, 0, W, H);
    }

    drawHint();

    bossFill.style.width = `${(state.boss.hp / state.boss.maxHp) * 100}%`;
    phaseText.textContent = getPhaseLabel();
    scoreCorner.textContent = formatScore(Math.max(0, Math.floor(state.score)));
  }

  function getScreenOverlayAlpha() {
    if (state.bomb.active) {
      if (state.bomb.stage === 'detonate') {
        return 1 - easeOutCubic(clamp(state.bomb.stageTimer / BOMB_FLASH_TIME, 0, 1));
      }
      if (state.bomb.stage === 'charge') {
        return 0.02 + clamp(state.bomb.stageTimer / BOMB_CHARGE_STAGE_TIME, 0, 1) * 0.05;
      }
      if (state.bomb.stage === 'snap') {
        return 0.12;
      }
      if (state.bomb.stage === 'assault') {
        const chroma = bombAssaultColorRatio();
        const aura = chroma > 0
          ? 0.04 + chroma * 0.04 + (0.5 + 0.5 * Math.sin(state.bomb.stageTimer * 18)) * 0.03 * chroma
          : 0;
        return aura;
      }
      if (state.bomb.stage === 'recover') {
        return 0.02 + (1 - clamp(state.bomb.stageTimer / BOMB_RECOVERY_TIME, 0, 1)) * 0.04;
      }
      return 0;
    }

    const victoryPose = getVictoryPose();
    if (victoryPose > 0) {
      return 0.04 + (1 - victoryPose) * 0.04;
    }

    if (state.bomb.ready && !state.pointerActive) {
      const base = 0.08 + (1 - state.timeScale) * 0.18;
      return clamp(base + Math.pow(bombDeepFreezeProgress(), 3.2) * 0.82, 0, 1);
    }

    if (!state.pointerActive) {
      return 0.08 + (1 - state.timeScale) * 0.18;
    }

    return 0;
  }

  function getPhaseLabel() {
    return `PHASE ${state.phase}`;
  }

  function getVictoryPose() {
    if (state.finish.active) {
      return clamp(state.finish.timer / VICTORY_ANIM_TIME, 0, 1);
    }
    return state.finish.pose || 0;
  }

  function drawBoss() {
    const b = state.boss;
    const pulse = 0.5 + 0.5 * Math.sin(b.timer * 4.4);
    const wingTilt = Math.sin(b.timer * 2.8) * 6;
    const coreGlow = 190 + Math.floor(pulse * 55) + (b.damageFlash > 0 ? 20 : 0);
    const irisBeat = 0.55 + 0.45 * Math.sin(b.timer * 2.4 + state.phase * 0.8);
    const defeat = getVictoryPose();
    const empowered = state.bomb.active && (state.bomb.stage === 'assault' || state.bomb.stage === 'recover');
    const chroma = empowered ? bombAssaultColorRatio() : 0;

    ctx.save();
    ctx.translate(b.x, b.y);
    if (defeat > 0) {
      ctx.rotate(defeat * 2.6);
      ctx.scale(1 + defeat * 0.18, 1 - defeat * 0.08);
      ctx.globalAlpha = 1 - defeat * 0.90;
    }

    ctx.strokeStyle = `rgb(${220 + (b.damageFlash > 0 ? 25 : 0)},${220 + (b.damageFlash > 0 ? 25 : 0)},${220 + (b.damageFlash > 0 ? 25 : 0)})`;
    ctx.fillStyle = empowered ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;

    if (bossInvulnerable()) {
      const shieldAlpha = 0.18 + 0.12 * Math.sin(performance.now() * 0.02);
      ctx.strokeStyle = `rgba(255,255,255,${shieldAlpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, 46 + Math.sin(performance.now() * 0.01) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
    }

    ctx.save();
    ctx.translate(-48, 6);
    ctx.rotate(-0.1 - wingTilt * 0.01);
    ctx.beginPath();
    ctx.moveTo(-10, -18);
    ctx.lineTo(-46, 0);
    ctx.lineTo(-10, 20);
    ctx.lineTo(10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(48, 6);
    ctx.rotate(0.1 + wingTilt * 0.01);
    ctx.beginPath();
    ctx.moveTo(10, -18);
    ctx.lineTo(46, 0);
    ctx.lineTo(10, 20);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.rect(-26, -28, 52, 56);
    ctx.fill();
    ctx.stroke();

    const sideOpenL = 18 + 18 * b.leftPodOpen;
    const sideOpenR = 18 + 18 * b.rightPodOpen;

    if (state.phase >= 2) {
      ctx.strokeRect(-64, -sideOpenL, 14, sideOpenL * 2);
      ctx.strokeRect(50, -sideOpenL, 14, sideOpenL * 2);
    }
    if (state.phase >= 3) {
      ctx.strokeRect(-16, 30, 32, 12 + sideOpenR * 0.4);
    }

    ctx.fillStyle = chroma > 0.05
      ? `rgb(${Math.min(255, coreGlow)},${Math.min(255, coreGlow + 20)},255)`
      : `rgb(${coreGlow},${coreGlow},${coreGlow})`;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.strokeRect(-4, -20, 8, 8);
    ctx.strokeRect(-4, 12, 8, 8);

    ctx.strokeStyle = chroma > 0.05
      ? palette('cyan', 0.45 + irisBeat * 0.25)
      : `rgba(255,255,255,${0.3 + irisBeat * 0.35})`;
    ctx.beginPath();
    ctx.arc(0, 0, 18 + b.iris * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 8 + irisBeat * 4, 0, Math.PI * 2);
    ctx.stroke();

    if (b.phaseIntro > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.85, b.phaseIntro)})`;
      ctx.strokeRect(-34 - b.phaseIntro * 18, -36 - b.phaseIntro * 18, 68 + b.phaseIntro * 36, 72 + b.phaseIntro * 36);
    }

    ctx.restore();
  }

  function drawBullets() {
    for (const b of state.bullets) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - b.h), 2, b.h);
    }

    for (const eb of state.enemyBullets) {
      if (eb.type === 'laserWarn') {
        const a = eb.age < 0.45 ? 0.2 : 0.5 + Math.sin(eb.age * 18) * 0.12;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(Math.round(eb.x - 2), 120, 4, H - 130);
        continue;
      }

      if (eb.type === 'laserBeam') {
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.fillRect(Math.round(eb.x - 7), 120, 14, H - 130);
        continue;
      }

      if (eb.type === 'ring') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eb.type === 'needle') {
        ctx.save();
        ctx.translate(eb.x, eb.y);
        ctx.rotate(Math.atan2(eb.vy, eb.vx) + Math.PI / 2);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, -eb.r * 1.8);
        ctx.lineTo(eb.r * 0.75, eb.r * 1.5);
        ctx.lineTo(-eb.r * 0.75, eb.r * 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (eb.type === 'petal') {
        ctx.save();
        ctx.translate(eb.x, eb.y);
        ctx.rotate(Math.atan2(eb.vy, eb.vx));
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (eb.type === 'squareBounce') {
        const glow = 0.18 + (eb.glow || 0.5) * 0.18;
        ctx.fillStyle = `rgba(255,255,255,${glow})`;
        ctx.fillRect(eb.x - eb.r - 3, eb.y - eb.r - 3, (eb.r + 3) * 2, (eb.r + 3) * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(eb.x - eb.r, eb.y - eb.r, eb.r * 2, eb.r * 2);
        ctx.strokeRect(eb.x - eb.r * 0.45, eb.y - eb.r * 0.45, eb.r * 0.9, eb.r * 0.9);
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(eb.x, eb.y - eb.r);
        ctx.lineTo(eb.x + eb.r * 0.8, eb.y);
        ctx.lineTo(eb.x, eb.y + eb.r);
        ctx.lineTo(eb.x - eb.r * 0.8, eb.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawPlayer() {
    if (state.invuln > 0 && Math.floor(state.invuln * 18) % 2 === 0) return;
    const p = state.player;
    const bombReady = state.bomb.ready;
    const chargeRatio = bombReady ? 1 : bombChargeRatio();
    const freezeRatio = bombReady && !state.pointerActive ? bombFreezeProgress() : 0;
    const bombAura = state.bomb.active
      ? (state.bomb.stage === 'assault' || state.bomb.stage === 'recover' ? 1 : 0.55)
      : 0;
    const ringAlpha = 0.32;

    ctx.save();
    ctx.translate(p.drawX, p.drawY);

    const traceHull = (scale = 1, yOffset = 0, noseStretch = 0) => {
      ctx.beginPath();
      ctx.moveTo(0, (-12 - noseStretch) * scale + yOffset);
      ctx.lineTo(10 * scale, 10 * scale + yOffset);
      ctx.lineTo(0, 6 * scale + yOffset);
      ctx.lineTo(-10 * scale, 10 * scale + yOffset);
      ctx.closePath();
    };

    if (bombAura > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(state.bomb.stageTimer * 7.5);

      for (let i = 0; i < 3; i++) {
        const fade = (1 - i / 3) * bombAura;
        ctx.strokeStyle = `rgba(255,255,255,${0.10 + fade * 0.10})`;
        ctx.lineWidth = 1.2;
        traceHull(1 + i * 0.08, 4 + i * 6, i * 0.8);
        ctx.stroke();
      }

      for (let i = 0; i < 3; i++) {
        const y = 10 + i * 7;
        const width = 7 + i * 2 + pulse * 1.5;
        ctx.strokeStyle = `rgba(255,255,255,${0.07 + (2 - i) * 0.03})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-width, y);
        ctx.lineTo(0, y - 3.2);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = `rgba(255,255,255,${0.12 + pulse * 0.06})`;
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(0, -24 - pulse * 5);
      ctx.stroke();
    }

    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = `rgba(255,255,255,${0.14 + bombAura * 0.06})`;
    ctx.lineWidth = 2;
    traceHull();
    ctx.fill();
    ctx.stroke();

    if (bombAura > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + bombAura * 0.08})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-7, 5);
      ctx.lineTo(0, 0);
      ctx.lineTo(7, 5);
      ctx.stroke();
    }

    ctx.strokeStyle = state.pointerActive ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.arc(0, 0, p.grazeR, 0, Math.PI * 2);
    ctx.stroke();

    if (bombReady) {
      const readyPulse = 0.5 + 0.5 * Math.sin(state.bomb.readyPulse * 5.5);
      ctx.fillStyle = `rgba(255,255,255,${0.045 + readyPulse * 0.02})`;
      ctx.beginPath();
      ctx.arc(0, 0, p.grazeR - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${ringAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.grazeR, 0, Math.PI * 2);
      ctx.stroke();
    } else if (chargeRatio > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${ringAlpha})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, p.grazeR, -Math.PI / 2, -Math.PI / 2 - chargeRatio * Math.PI * 2, true);
      ctx.stroke();
    }

    if (freezeRatio > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.18 + freezeRatio * 0.20})`;
      ctx.lineWidth = 1.2 + freezeRatio * 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, p.grazeR - freezeRatio * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, p.hitR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFreezeChargeFx() {
    const freezeRatio = state.bomb.ready && !state.pointerActive && !state.bomb.active && !state.finish.active
      ? bombFreezeProgress()
      : 0;
    if (freezeRatio <= 0 && state.bomb.cancelFx <= 0) return;

    const p = state.player;
    ctx.save();
    ctx.translate(p.drawX, p.drawY);

    if (freezeRatio > 0) {
      const cadence = lerp(1.10, 2.10, easeInOutCubic(freezeRatio));
      for (let i = 0; i < 3; i++) {
        const phase = ((state.bomb.freezeFxTime / cadence) + i / 3) % 1;
        const radius = lerp(p.grazeR - 0.8, 4.4, phase);
        const alpha = (1 - phase) * (0.10 + freezeRatio * 0.16);
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1.2 + (1 - phase) * 1.1 + freezeRatio * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (state.bomb.cancelFx > 0) {
      const t = 1 - state.bomb.cancelFx / BOMB_CANCEL_FX_TIME;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.42})`;
      ctx.lineWidth = 2 - t * 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, p.grazeR + 2 + t * 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.22})`;
      ctx.beginPath();
      ctx.arc(0, 0, 6 + t * 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawParticles() {
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life * 1.65);
      ctx.fillStyle = particleColor(p, alpha);
      const size = p.graze ? (p.size || 2) + 1 : (p.size || 2);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
  }

  function drawBombFx() {
    if (!state.bomb.active) return;

    const px = state.player.drawX;
    const py = state.player.drawY;
    const colorRatio = bombAssaultColorRatio();

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (state.bomb.stage === 'detonate') {
      const t = clamp(state.bomb.stageTimer / BOMB_DETONATE_TIME, 0, 1);
      const flashT = clamp(state.bomb.stageTimer / BOMB_FLASH_TIME, 0, 1);
      const radius = 16 + easeOutCubic(t) * 210;
      const shock = easeOutCubic(t);

      const traceBlastPolygon = (cx, cy, polyRadius, sides, rotation) => {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const a = rotation + (Math.PI * 2 * i) / sides;
          const x = cx + Math.cos(a) * polyRadius;
          const y = cy + Math.sin(a) * polyRadius;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };

      ctx.fillStyle = palette('white', (1 - t) * 0.12);
      ctx.beginPath();
      ctx.arc(px, py, 11 + shock * 18, 0, Math.PI * 2);
      ctx.fill();

      ['white', 'white', 'white'].forEach((color, index) => {
        ctx.strokeStyle = palette(color, (1 - t) * (0.72 - index * 0.12));
        ctx.lineWidth = 4.5 - index * 0.8;
        ctx.beginPath();
        ctx.arc(px, py, radius + index * 14, 0, Math.PI * 2);
        ctx.stroke();
      });

      traceBlastPolygon(px, py, 20 + shock * 42, 8, shock * 0.26);
      ctx.strokeStyle = palette('white', (1 - t) * 0.24);
      ctx.lineWidth = 2.2;
      ctx.stroke();

      traceBlastPolygon(px, py, 12 + shock * 28, 4, Math.PI / 4 + shock * 0.18);
      ctx.strokeStyle = palette('white', (1 - t) * 0.30);
      ctx.lineWidth = 1.8;
      ctx.stroke();

      if (flashT > 0.35) {
        const explode = clamp((flashT - 0.35) / 0.65, 0, 1);
        for (let i = 0; i < 14; i++) {
          const a = shock * 0.12 + (Math.PI * 2 * i) / 14;
          const dist = 24 + explode * (42 + (i % 4) * 12);
          const size = 2.8 + (i % 3) * 0.8 + explode * 1.6;
          ctx.save();
          ctx.translate(px + Math.cos(a) * dist, py + Math.sin(a) * dist);
          ctx.rotate(a + Math.PI / 4);
          ctx.strokeStyle = palette('white', (1 - t) * (0.14 + explode * 0.10));
          ctx.lineWidth = 1.15;
          ctx.beginPath();
          ctx.rect(-size, -size, size * 2, size * 2);
          ctx.stroke();
          ctx.restore();
        }

        for (let ring = 0; ring < 2; ring++) {
          const spin = shock * (ring === 0 ? 0.34 : -0.28);
          const ringRadius = 30 + explode * (52 + ring * 24);
          ctx.strokeStyle = palette('white', (1 - t) * (0.10 - ring * 0.02));
          ctx.lineWidth = 1.2 - ring * 0.15;
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = spin + (Math.PI * 2 * i) / 10;
            const x = px + Math.cos(a) * ringRadius;
            const y = py + Math.sin(a) * ringRadius;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    if (state.bomb.stage === 'stall' || state.bomb.stage === 'charge' || state.bomb.stage === 'snap') {
      const isCharge = state.bomb.stage === 'charge';
      const isSnap = state.bomb.stage === 'snap';
      const t = isCharge ? clamp(state.bomb.stageTimer / BOMB_CHARGE_STAGE_TIME, 0, 1) : isSnap ? 1 : clamp(state.bomb.stageTimer / BOMB_STALL_TIME, 0, 1);
      const appear = isSnap ? 1 : easeOutCubic(clamp(t / 0.28, 0, 1));
      const gather = isSnap ? 1 : easeInOutCubic(clamp((t - 0.18) / 0.82, 0, 1));

      ctx.save();
      ctx.translate(px, py - 4);

      const tracePolygon = (radius, sides, rotation) => {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const a = rotation + (Math.PI * 2 * i) / sides;
          const x = Math.cos(a) * radius;
          const y = Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };

      const traceStar = (radius, sides, rotation, step) => {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const idx = (i * step) % sides;
          const a = rotation + (Math.PI * 2 * idx) / sides;
          const x = Math.cos(a) * radius;
          const y = Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };

      const breath = 0.82 + 0.18 * Math.sin(state.bomb.stageTimer * 2.2 + t * 3.4);

      const glyphs = [
        { sides: 8, radius: 58, inner: 46, rot: 0.32, alpha: 0.22, width: 1.8, starStep: 3 },
        { sides: 12, radius: 49, inner: 35, rot: -0.22, alpha: 0.11, width: 1.1, starStep: 5 },
        { sides: 6, radius: 38, inner: 24, rot: -0.38, alpha: 0.20, width: 1.45, starStep: 2 },
        { sides: 4, radius: 24, inner: 14, rot: 0.54, alpha: 0.17, width: 1.25, starStep: 1 },
      ];

      glyphs.forEach((glyph, index) => {
        const radius = glyph.radius;
        const inner = glyph.inner;
        const rot = state.bomb.stageTimer * glyph.rot + index * 0.18;
        const alpha = glyph.alpha * appear * breath * (isSnap ? 1.28 : 1);

        ctx.strokeStyle = palette('white', alpha);
        ctx.lineWidth = (isSnap ? 1.25 : 1) * glyph.width;
        tracePolygon(radius, glyph.sides, rot);
        ctx.stroke();

        tracePolygon(inner, glyph.sides, rot * -0.68 + 0.12);
        ctx.stroke();

        if (glyph.starStep > 1) {
          ctx.strokeStyle = palette('white', alpha * 0.42);
          ctx.lineWidth = 0.9;
          traceStar((radius + inner) * 0.5, glyph.sides, rot * 0.52 + 0.08, glyph.starStep);
          ctx.stroke();
        }
      });

      const arcTracks = [
        { radius: 64, speed: 0.42, count: 4, span: 0.52, alpha: 0.16, width: 1.15 },
        { radius: 53, speed: -0.30, count: 5, span: 0.32, alpha: 0.11, width: 0.95 },
        { radius: 42, speed: 0.24, count: 3, span: 0.62, alpha: 0.09, width: 0.90 },
        { radius: 30, speed: 0.56, count: 3, span: 0.60, alpha: 0.12, width: 1.0 },
      ];

      arcTracks.forEach((track, index) => {
        ctx.strokeStyle = palette('white', appear * track.alpha * (isSnap ? 1.2 : 1));
        ctx.lineWidth = track.width;
        for (let i = 0; i < track.count; i++) {
          const start = state.bomb.stageTimer * track.speed + index * 0.24 + (Math.PI * 2 * i) / track.count;
          ctx.beginPath();
          ctx.arc(0, 0, track.radius, start, start + track.span);
          ctx.stroke();
        }
      });

      const orbitTracks = [
        { radius: 56, speed: 0.36, count: 6, size: 2.1, alpha: 0.14, shape: 'square' },
        { radius: 44, speed: -0.24, count: 4, size: 2.7, alpha: 0.11, shape: 'circle' },
        { radius: 18, speed: 0.62, count: 3, size: 1.8, alpha: 0.13, shape: 'diamond' },
      ];

      orbitTracks.forEach((track, index) => {
        for (let i = 0; i < track.count; i++) {
          const a = state.bomb.stageTimer * track.speed + index * 0.36 + i * ((Math.PI * 2) / track.count);
          const x = Math.cos(a) * track.radius;
          const y = Math.sin(a) * track.radius;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(a + Math.PI / 4);
          ctx.strokeStyle = palette('white', appear * track.alpha);
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (track.shape === 'circle') {
            ctx.arc(0, 0, track.size, 0, Math.PI * 2);
          } else {
            ctx.rect(-track.size, -track.size, track.size * 2, track.size * 2);
          }
          ctx.stroke();
          ctx.restore();
        }
      });

      for (let i = 0; i < 6; i++) {
        const a = state.bomb.stageTimer * 0.28 + i * ((Math.PI * 2) / 6);
        const x1 = Math.cos(a) * 58;
        const y1 = Math.sin(a) * 58;
        const x2 = Math.cos(a + 0.34) * 30;
        const y2 = Math.sin(a + 0.34) * 30;
        ctx.strokeStyle = palette('white', appear * 0.06 * breath);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      for (let i = 0; i < 8; i++) {
        const a = state.bomb.stageTimer * -0.34 + i * ((Math.PI * 2) / 8);
        const radius = i % 2 === 0 ? 50 : 36;
        const size = i % 2 === 0 ? 2.2 : 1.7;
        ctx.save();
        ctx.translate(Math.cos(a) * radius, Math.sin(a) * radius);
        ctx.rotate(a + Math.PI / 4);
        ctx.strokeStyle = palette('white', appear * 0.10);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(-size, -size, size * 2, size * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.strokeStyle = palette('white', appear * 0.08);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 21, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 14; i++) {
        const phase = ((state.bomb.stageTimer * 0.16) + i / 14) % 1;
        const radius = lerp(62, 6, phase);
        const a = state.bomb.stageTimer * 0.06 + i * ((Math.PI * 2) / 14);
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        const size = 1.5 + (1 - phase) * 1.2;
        ctx.fillStyle = palette('white', (1 - phase) * (0.18 + gather * 0.20));
        ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
      }

      if (isCharge || isSnap) {
        const coreRadius = 8 + gather * 5;
        ctx.fillStyle = palette('white', 0.05 + gather * 0.08 + (isSnap ? 0.06 : 0));
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = palette('white', 0.20 + gather * 0.12 + (isSnap ? 0.12 : 0.02));
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    if (state.bomb.stage === 'assault' || state.bomb.stage === 'recover') {
      const attackRatio = state.bomb.stage === 'assault'
        ? 1
        : 1 - clamp(state.bomb.stageTimer / BOMB_RECOVERY_TIME, 0, 1);
      const pulse = 0.5 + 0.5 * Math.sin((state.bomb.stageTimer + performance.now() * 0.001) * 4.2);
      const beamLen = H + 280;
      const tipY = py - 12;
      const emitY = py - 24;
      const throatY = py - 44;
      const backCenter = lerp(W * 0.5, px, 0.34);

      for (const side of [-1, 1]) {
        for (let layer = 0; layer < 3; layer++) {
          const segments = [];
          const rungCount = 10;
          const scroll = state.bomb.stageTimer * (0.18 + layer * 0.035) + layer * 0.12;

          for (let rung = 0; rung < rungCount; rung++) {
            const phase = (scroll + rung / rungCount) % 1;
            const cell = Math.floor(scroll * rungCount) + rung;
            const y = H + 28 - phase * (H + 220);
            const outer = lerp(W * (0.60 + layer * 0.04), 96 + layer * 18, phase);
            const inner = lerp(122 + layer * 26, 28 + layer * 8, phase);
            const lift = lerp(28 + layer * 7, 8 + layer * 2, phase);
            const depthSkew = lerp(18 + layer * 4, 4 + layer * 1.2, phase);
            const flip = cell % 2 === 0 ? 1 : -1;
            const ax = backCenter + side * (flip > 0 ? outer : inner);
            const bx = backCenter + side * (flip > 0 ? inner : outer) + side * depthSkew;
            segments.push({
              a: { x: ax, y },
              b: { x: bx, y: y - lift },
              y,
              phase,
            });
          }

          segments.sort((lhs, rhs) => rhs.y - lhs.y);
          const accent = colorRatio > 0.20 && layer === 0 ? (side < 0 ? 'magenta' : 'cyan') : 'white';

          ctx.strokeStyle = palette(accent, attackRatio * (0.09 + layer * 0.028));
          ctx.lineWidth = layer === 0 ? 2.2 : 1.55;
          ctx.beginPath();
          segments.forEach((seg, index) => {
            if (index === 0) ctx.moveTo(seg.a.x, seg.a.y); else ctx.lineTo(seg.a.x, seg.a.y);
          });
          ctx.stroke();

          ctx.strokeStyle = palette('white', attackRatio * (0.05 + layer * 0.020));
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          segments.forEach((seg, index) => {
            if (index === 0) ctx.moveTo(seg.b.x, seg.b.y); else ctx.lineTo(seg.b.x, seg.b.y);
          });
          ctx.stroke();

          for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const alpha = attackRatio * (0.040 + (1 - seg.phase) * 0.030 + layer * 0.008);
            ctx.strokeStyle = palette(i % 2 === 0 ? accent : 'white', alpha);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(seg.a.x, seg.a.y);
            ctx.lineTo(seg.b.x, seg.b.y);
            ctx.stroke();
          }

          for (let i = 0; i < segments.length - 1; i++) {
            const seg = segments[i];
            const next = segments[i + 1];
            ctx.strokeStyle = palette(accent, attackRatio * (0.032 + layer * 0.012));
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(seg.a.x, seg.a.y);
            ctx.lineTo(next.b.x, next.b.y);
            ctx.stroke();

            ctx.strokeStyle = palette('white', attackRatio * (0.024 + layer * 0.010));
            ctx.beginPath();
            ctx.moveTo(seg.b.x, seg.b.y);
            ctx.lineTo(next.a.x, next.a.y);
            ctx.stroke();
          }
        }
      }

      for (const side of [-1, 1]) {
        ctx.strokeStyle = palette('white', attackRatio * 0.18);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(px + side * 5, py - 6);
        ctx.lineTo(px + side * 10, py - 16);
        ctx.lineTo(px + side * 18, py - 28);
        ctx.lineTo(px + side * 30, py - 48);
        ctx.stroke();

        if (colorRatio > 0.08) {
          ctx.strokeStyle = palette(side < 0 ? 'magenta' : 'cyan', attackRatio * (0.08 + colorRatio * 0.08));
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(px + side * 8, py - 10);
          ctx.lineTo(px + side * 16, py - 28);
          ctx.lineTo(px + side * 24, py - 44);
          ctx.stroke();
        }
      }

      const beamLayers = [
        { color: 'magenta', alpha: 0.05 * colorRatio * attackRatio, root: 28, throat: 48, far: 216 },
        { color: 'cyan', alpha: 0.055 * colorRatio * attackRatio, root: 22, throat: 38, far: 176 },
        { color: 'white', alpha: 0.12 * attackRatio, root: 18, throat: 30, far: 142 },
        { color: 'white', alpha: 0.32 * attackRatio, root: 10, throat: 18, far: 72 },
        { color: 'white', alpha: 0.96 * attackRatio, root: 4.5, throat: 8, far: 14 },
      ];

      beamLayers.forEach((layer) => {
        if (layer.alpha <= 0) return;
        ctx.fillStyle = palette(layer.color, layer.alpha);
        ctx.beginPath();
        ctx.moveTo(px - 3.5, tipY);
        ctx.lineTo(px - layer.root, emitY + 2);
        ctx.lineTo(px - layer.throat, throatY);
        ctx.lineTo(px - layer.far, emitY - beamLen);
        ctx.lineTo(px + layer.far, emitY - beamLen);
        ctx.lineTo(px + layer.throat, throatY);
        ctx.lineTo(px + layer.root, emitY + 2);
        ctx.lineTo(px + 3.5, tipY);
        ctx.closePath();
        ctx.fill();
      });

      ctx.fillStyle = palette('white', attackRatio * (0.10 + pulse * 0.03));
      ctx.beginPath();
      ctx.moveTo(px, tipY - 4);
      ctx.lineTo(px - 13, emitY + 6);
      ctx.lineTo(px, emitY - 8);
      ctx.lineTo(px + 13, emitY + 6);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = palette('white', attackRatio * 0.28);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(px, tipY - 4);
      ctx.lineTo(px - 13, emitY + 6);
      ctx.lineTo(px, emitY - 8);
      ctx.lineTo(px + 13, emitY + 6);
      ctx.closePath();
      ctx.stroke();

      for (let i = 0; i < 7; i++) {
        const phase = ((state.bomb.stageTimer * 0.42) + i / 7) % 1;
        const depth = 48 + phase * (beamLen - 86);
        const beamHalf = bombSprayHalfWidth(depth, 0.92);
        const shell = beamHalf + 36 + i * 12 + pulse * 5;
        const flare = 14 + i * 5;
        const y = emitY - depth;
        const color = colorRatio > 0.24 && i % 2 === 0 ? pickBombColor(i) : 'white';
        ctx.strokeStyle = palette(color, attackRatio * (0.05 + (1 - phase) * 0.05));
        ctx.lineWidth = 1.45;
        ctx.beginPath();
        ctx.moveTo(px - shell, y);
        ctx.lineTo(px - beamHalf - flare, y + 10);
        ctx.lineTo(px - beamHalf * 0.76, y + 20);
        ctx.lineTo(px + beamHalf * 0.76, y + 20);
        ctx.lineTo(px + beamHalf + flare, y + 10);
        ctx.lineTo(px + shell, y);
        ctx.stroke();
      }

      const rails = [
        { side: -1, lane: 0.78, color: colorRatio > 0.10 ? 'magenta' : 'white', width: 2.8, alpha: 0.18 + colorRatio * 0.08 },
        { side: 1, lane: 0.78, color: colorRatio > 0.10 ? 'cyan' : 'white', width: 2.8, alpha: 0.18 + colorRatio * 0.08 },
        { side: -1, lane: 1.12, color: 'white', width: 1.4, alpha: 0.10 },
        { side: 1, lane: 1.12, color: 'white', width: 1.4, alpha: 0.10 },
      ];

      rails.forEach((rail) => {
        ctx.strokeStyle = palette(rail.color, attackRatio * rail.alpha);
        ctx.lineWidth = rail.width;
        ctx.beginPath();
        ctx.moveTo(px + rail.side * 6, tipY - 2);
        ctx.lineTo(px + rail.side * (rail.lane * 14), throatY + 8);
        ctx.lineTo(px + rail.side * (rail.lane * 30), emitY - 120);
        ctx.lineTo(px + rail.side * (rail.lane * 92), emitY - beamLen);
        ctx.stroke();
      });

      if (state.bomb.stage === 'recover') {
        for (let i = 0; i < 18; i++) {
          const phase = ((state.bomb.stageTimer * 0.36) + i / 18) % 1;
          const depth = phase * beamLen;
          const half = bombSprayHalfWidth(depth, 1.02);
          const y = emitY - depth;
          const drift = 28 + i * 8;
          const color = colorRatio > 0.18 ? pickBombColor(i) : 'white';
          for (const side of [-1, 1]) {
            ctx.strokeStyle = palette(color, attackRatio * (1 - phase) * 0.10);
            ctx.lineWidth = 1 + (i % 3) * 0.25;
            ctx.beginPath();
            ctx.moveTo(px + side * (half + 10), y + 8);
            ctx.lineTo(px + side * (half + drift * 0.55), y - 6);
            ctx.lineTo(px + side * (half + drift), y - 28);
            ctx.stroke();
          }
        }
      }
    }

    ctx.restore();
  }

  function drawVictoryFx() {
    const t = getVictoryPose();
    if (t <= 0) return;

    const radius = 28 + easeOutCubic(t) * 140;
    const fxX = state.finish.x;
    const fxY = state.finish.y;

    ctx.save();
    ctx.translate(fxX, fxY);
    ctx.rotate(t * 4.8);
    ctx.strokeStyle = palette('white', 0.85 - t * 0.45);
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const size = 26 + i * 14 + t * 28;
      ctx.strokeRect(-size, -size, size * 2, size * 2);
      ctx.rotate(0.34);
    }
    ctx.restore();

    ctx.strokeStyle = palette('white', 0.40 + (1 - t) * 0.20);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fxX, fxY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawHint() {
    if (state.hint.timer <= 0 || !state.running) return;

    const fadeIn = clamp((state.hint.duration - state.hint.timer) / 0.72, 0, 1);
    const fadeOut = clamp(state.hint.timer / 0.55, 0, 1);
    const alpha = Math.min(fadeIn, fadeOut);
    const x = 20;
    const y = H - 42 + (1 - alpha) * 4;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '16px "Microsoft YaHei", "Noto Sans SC", sans-serif';
    ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.28})`;
    ctx.lineWidth = 4;
    ctx.strokeText(state.hint.text, x, y, W * 0.62);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.84})`;
    ctx.fillText(state.hint.text, x, y, W * 0.62);
    ctx.restore();
  }

  function drawSakuraLives() {
    const critical = state.running && state.player.hp === 1;
    const criticalPulse = critical ? (0.5 + 0.5 * Math.sin(performance.now() * 0.0105)) : 0;

    const cx = W - 56;
    const cy = 58;
    const size = 31 + state.sakuraPulse * 2.4 + criticalPulse * 1.8;
    const jitterFactor = state.sakuraShock + (critical ? criticalPulse * 0.35 : 0);
    const jitterX = (Math.random() - 0.5) * jitterFactor * 2.4;
    const jitterY = (Math.random() - 0.5) * jitterFactor * 2.4;

    ctx.save();
    ctx.translate(cx + jitterX, cy + jitterY);
    ctx.globalAlpha = critical ? 0.24 + criticalPulse * 0.08 : 0.18;

    for (let layer = 0; layer < 2; layer++) {
      ctx.save();
      ctx.scale(1.22 + layer * 0.08, 1.18 + layer * 0.08);
      for (let i = 0; i < MAX_LIVES; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * i) / MAX_LIVES);
        drawPetalShape(0, 0, size * 0.88, size * 0.55, 'rgba(255,255,255,0.11)', null);
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(cx + jitterX, cy + jitterY);

    for (let i = 0; i < MAX_LIVES; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / MAX_LIVES);

      if (i < state.player.hp) {
        const petalFill = critical
          ? `rgba(255,255,255,${0.72 + criticalPulse * 0.18})`
          : 'rgba(255,255,255,0.72)';
        const petalStroke = critical
          ? `rgba(255,255,255,${0.92 + criticalPulse * 0.08})`
          : 'rgba(255,255,255,0.92)';

        drawPetalShape(0, 0, size, size * 0.62, petalFill, petalStroke);
        drawPetalShape(
          0,
          -2,
          size * 0.78,
          size * 0.45,
          critical ? `rgba(255,255,255,${0.20 + criticalPulse * 0.12})` : 'rgba(255,255,255,0.18)',
          critical ? `rgba(255,255,255,${0.30 + criticalPulse * 0.14})` : 'rgba(255,255,255,0.26)'
        );
      } else {
        drawPetalShape(0, 0, size * 0.96, size * 0.58, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.08)');
      }

      ctx.restore();
    }

    for (let i = 0; i < MAX_LIVES; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / MAX_LIVES);
      ctx.strokeStyle = `rgba(255,255,255,${i < state.player.hp ? (critical ? 0.72 + criticalPulse * 0.16 : 0.65) : 0.18})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size * 0.58);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -size * 0.58, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${i < state.player.hp ? (critical ? 0.95 + criticalPulse * 0.05 : 0.9) : 0.2})`;
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = `rgba(255,255,255,${critical ? 0.84 + criticalPulse * 0.14 : 0.78 + state.sakuraPulse * 0.18})`;
    ctx.beginPath();
    ctx.arc(0, 0, 12 + state.sakuraPulse * 1.2 + criticalPulse * 1.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.arc(0, 0, 7.6, 0, Math.PI * 2);
    ctx.fill();

    if (state.sakuraPulse > 0 || critical) {
      const ringAlpha = state.sakuraPulse > 0
        ? state.sakuraPulse * 0.6
        : 0.22 + criticalPulse * 0.28;
      const ringRadius = 12 + (state.sakuraPulse > 0 ? (1 - state.sakuraPulse) * 10 : 6 + criticalPulse * 6);
      ctx.strokeStyle = `rgba(255,255,255,${ringAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    for (const petal of state.petalDrops) {
      const alpha = 1 - petal.age / petal.ttl;
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rot);
      drawPetalShape(
        0,
        0,
        18 * petal.scale,
        11 * petal.scale,
        `rgba(255,255,255,${0.46 * alpha})`,
        `rgba(255,255,255,${0.75 * alpha})`
      );
      ctx.restore();
    }
  }

  function drawPetalShape(x, y, len, width, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(width * 0.18, -len * 0.08, width * 0.78, -len * 0.28, width * 0.82, -len * 0.68);
    ctx.bezierCurveTo(width * 0.72, -len * 0.9, width * 0.26, -len * 1.04, width * 0.08, -len * 0.84);
    ctx.bezierCurveTo(width * 0.025, -len * 0.96, -width * 0.025, -len * 0.96, -width * 0.08, -len * 0.84);
    ctx.bezierCurveTo(-width * 0.26, -len * 1.04, -width * 0.72, -len * 0.9, -width * 0.82, -len * 0.68);
    ctx.bezierCurveTo(-width * 0.78, -len * 0.28, -width * 0.18, -len * 0.08, 0, 0);
    ctx.closePath();

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    ctx.restore();
  }

  function particleColor(p, alpha) {
    if (p.color) return palette(p.color, p.graze ? Math.min(0.95, alpha + 0.15) : alpha);
    return p.graze ? `rgba(255,255,255,${Math.min(0.95, alpha + 0.2)})` : `rgba(255,255,255,${alpha})`;
  }

  function palette(name, alpha = 1) {
    if (name === 'cyan') return `rgba(118,241,255,${alpha})`;
    if (name === 'magenta') return `rgba(255,94,229,${alpha})`;
    if (name === 'gold') return `rgba(255,205,92,${alpha})`;
    if (name === 'white') return `rgba(255,255,255,${alpha})`;
    return `rgba(255,255,255,${alpha})`;
  }

  function loop(ts) {
    if (state.running) {
      const dt = Math.min(0.033, (ts - state.lastFrame) / 1000 || 0.016);
      state.lastFrame = ts;
      update(dt);
    }
    render();
    requestAnimationFrame(loop);
  }

  function setPointer(clientX, clientY, id = null) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    state.targetX = (clientX - rect.left) * scaleX;
    state.targetY = (clientY - rect.top) * scaleY;

    if (!state.pointerActive) {
      state.pointerActive = true;
      state.touchId = id;
      state.dragAnchor.x = state.targetX;
      state.dragAnchor.y = state.targetY;
      state.dragAnchor.px = state.player.x;
      state.dragAnchor.py = state.player.y;
    }
  }

  function releasePointer() {
    state.pointerActive = false;
    state.touchId = null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    setPointer(e.clientX, e.clientY, e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!state.pointerActive || (state.touchId !== null && e.pointerId !== state.touchId)) return;
    e.preventDefault();
    setPointer(e.clientX, e.clientY, e.pointerId);
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => {
    canvas.addEventListener(name, (e) => {
      if (state.touchId !== null && e.pointerId !== state.touchId) return;
      releasePointer();
    });
  });

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(6, '0');
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function dist(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function circleHit(x1, y1, r1, x2, y2, r2) {
    return dist(x1, y1, x2, y2) < r1 + r2;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  resetGame();
  render();
  requestAnimationFrame(loop);
})();
