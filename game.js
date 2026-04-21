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

  const PHASE2_RATIO = 1 - (0.8 / 3);      // 0.733333...
  const PHASE3_RATIO = 1 - (0.8 / 3) * 2;  // 0.466666...
  const PHASE4_RATIO = 0.20;

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

  function endGame(victory) {
    state.running = false;

    const clearBonus = victory ? 12000 : 0;
    const rawScore = Math.floor(state.score + clearBonus);
    const timePenalty = Math.floor(state.timePenalty);
    const afterPenalty = Math.max(0, rawScore - timePenalty);
    const lifeMultiplier = 1 + Math.max(0, state.player.hp) * 0.08;
    const noHitMultiplier = state.noHit ? 1.5 : 1.0;
    const finalScore = Math.max(0, Math.floor(afterPenalty * lifeMultiplier * noHitMultiplier));

    resultKicker.textContent = 'COMBAT RESULT';
    resultTitle.textContent = victory ? 'TARGET ELIMINATED' : 'SIMULATION LOST';
    resultStats.innerHTML = [
      `<div class="result-grid">`,
      `<div class="result-row"><span>原始得分</span><strong>${formatScore(rawScore)}</strong></div>`,
      `<div class="result-row"><span>战斗用时</span><strong>${state.elapsed.toFixed(1)}s</strong></div>`,
      `<div class="result-row"><span>擦弹帧数</span><strong>${Math.floor(state.grazeFrames)}</strong></div>`,
      `<div class="result-row"><span>擦弹触发</span><strong>${state.grazeEntries}</strong></div>`,
      `<div class="result-row"><span>峰值倍率</span><strong>×${state.peakRate.toFixed(2)}</strong></div>`,
      `<div class="result-row"><span>时间惩罚</span><strong>${timePenalty}</strong></div>`,
      `<div class="result-row"><span>残机倍率</span><strong>×${lifeMultiplier.toFixed(2)}</strong></div>`,
      `<div class="result-row"><span>无伤倍率</span><strong>×${noHitMultiplier.toFixed(2)}</strong></div>`,
      `<div class="result-row total"><span>最终分数</span><strong>${formatScore(finalScore)}</strong></div>`,
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

  function spawnBurst(x, y, count, speedMin, speedMax) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.12;
      const s = speedMin + Math.random() * (speedMax - speedMin);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.4 + Math.random() * 0.25,
        size: Math.random() < 0.15 ? 3 : 2,
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

  function updateBossPhase() {
    const ratio = state.boss.hp / state.boss.maxHp;
    let nextPhase = 1;

    if (ratio <= PHASE2_RATIO && ratio > PHASE3_RATIO) nextPhase = 2;
    if (ratio <= PHASE3_RATIO && ratio > PHASE4_RATIO) nextPhase = 3;
    if (ratio <= PHASE4_RATIO) nextPhase = 4;

    if (nextPhase !== state.phase) {
      state.phase = nextPhase;
      state.boss.phaseIntro = nextPhase === 4 ? 1.2 : 0.8;
      phaseText.textContent = `PHASE ${nextPhase}`;
      spawnBurst(state.boss.x, state.boss.y, nextPhase === 4 ? 84 : 42, 42, nextPhase === 4 ? 180 : 135);
      state.enemyBullets = state.enemyBullets.filter((b) => b.type === 'laserWarn' || b.type === 'laserBeam');
      state.nextPattern = nextPhase === 4 ? 0.95 : 0.72;
    }
  }

  function aimAngle(fromX, fromY, toX, toY) {
    return Math.atan2(toY - fromY, toX - fromX);
  }

  function bossInvulnerable() {
    return state.boss.phaseIntro > 0;
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
        const speedY = 104 + i * 10; // 约 30 度左右
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

  function updatePatterns(dt) {
    const boss = state.boss;
    boss.timer += dt;
    boss.drift += dt * (state.phase >= 3 ? 1.15 : 0.95);
    boss.phaseIntro = Math.max(0, boss.phaseIntro - dt);
    boss.haloSpin += dt * (state.phase === 4 ? 1.35 : 0.45);
    boss.crownOpen += (((state.phase >= 4) ? 1 : (state.phase >= 3 ? 0.35 : 0.08)) - boss.crownOpen) * 0.08;
    boss.shellShift += (((state.phase >= 4) ? 1 : 0) - boss.shellShift) * 0.06;
    boss.auraPulse += (((state.phase >= 4) ? 1 : (state.phase >= 2 ? 0.45 : 0.18)) - boss.auraPulse) * 0.06;
    boss.iris += (((state.phase >= 4) ? 1.2 : (state.phase === 3 ? 1 : 0.35)) - boss.iris) * 0.06;

    boss.x = W / 2 + Math.sin(boss.drift) * (state.phase >= 4 ? 94 : state.phase === 3 ? 88 : 72);
    boss.y = 124 + Math.sin(boss.timer * 1.4) * (state.phase >= 4 ? 8 : 6);
    boss.leftPodOpen += ((state.phase >= 2 ? 1 : 0.15) - boss.leftPodOpen) * 0.08;
    boss.rightPodOpen += ((state.phase >= 3 ? 1 : 0.2) - boss.rightPodOpen) * 0.08;

    state.nextPattern -= dt;
    if (state.nextPattern > 0 || boss.phaseIntro > 0.15) return;

    const p = state.phase;

    if (p === 1) {
      const roll = Math.random();
      if (roll < 0.48) {
        fireFan(5, 0.38, 160);
        state.nextPattern = 0.78;
      } else if (roll < 0.76) {
        fireRing(16, 128, boss.timer * 0.45);
        state.nextPattern = 0.98;
      } else {
        fireSpiralVolley(2, 118);
        state.nextPattern = 0.70;
      }
    } else if (p === 2) {
      const roll = Math.random();
      if (roll < 0.32) {
        fireRotatingCross(8, 168, boss.timer * 1.05);
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
        fireRing(18, 152, boss.timer * 0.9);
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
        fireRotatingCross(10, 178, boss.timer * 1.45, 'needle');
        fireRing(14, 120, boss.timer * 0.45);
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
        fireRotatingCross(12, 188, boss.timer * 1.68, 'needle');
        fireRing(16, 126, boss.timer * 0.55);
        fireSidePods();
        fireTripleBloomBurst();
        state.nextPattern = 0.68;
      }
    }
  }

  function update(dt) {
    const slowTarget = state.pointerActive ? 1 : 0.2;
    state.timeScale += (slowTarget - state.timeScale) * (state.pointerActive ? 0.2 : 0.08);
    const scaledDt = dt * state.timeScale;
    state.elapsed = (performance.now() - state.startTime) / 1000;
    state.timePenalty = state.elapsed * 90;

    if (state.invuln > 0) state.invuln -= scaledDt;
    if (state.killFlash > 0) state.killFlash -= dt;
    state.sakuraPulse = Math.max(0, state.sakuraPulse - dt * 1.7);
    state.sakuraShock = Math.max(0, state.sakuraShock - dt * 3.8);

    state.stars.forEach((s) => {
      s.y += s.v * (0.45 + state.timeScale * 0.55) * dt;
      if (s.y > H) {
        s.y = -4;
        s.x = Math.random() * W;
      }
    });

    if (state.pointerActive) {
      state.player.x = clamp(state.dragAnchor.px + (state.targetX - state.dragAnchor.x), 18, W - 18);
      state.player.y = clamp(state.dragAnchor.py + (state.targetY - state.dragAnchor.y), 160, H - 26);
    }

    state.player.drawX += (state.player.x - state.player.drawX) * 0.34;
    state.player.drawY += (state.player.y - state.player.drawY) * 0.34;

    state.nextShot -= scaledDt;
    if (state.nextShot <= 0) {
      spawnPlayerShot(state.player.x, state.player.y - 15);
      spawnPlayerShot(state.player.x - 6, state.player.y - 11);
      spawnPlayerShot(state.player.x + 6, state.player.y - 11);
      state.nextShot = 0.082;
    }

    updatePatterns(scaledDt);

    for (const b of state.bullets) {
      b.x += b.vx * scaledDt;
      b.y += b.vy * scaledDt;

      if (dist(b.x, b.y, state.boss.x, state.boss.y) < 34) {
        b.dead = true;

        if (!bossInvulnerable()) {
          state.boss.hp = Math.max(0, state.boss.hp - 2);
          state.boss.damageFlash = 0.08;
          state.bossHitCount += 1;
          state.score += 10 * state.grazeRate;
          if (Math.random() < 0.42) spawnBurst(b.x, b.y, 3, 18, 50);
        } else {
          // 无敌期间给一点轻微的“打在护盾上”的反馈
          if (Math.random() < 0.25) {
            spawnBurst(b.x, b.y, 2, 8, 20);
          }
        }
      }
    }
    state.bullets = state.bullets.filter((b) => !b.dead && b.y > -30);

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

        state.score += (1.6 + (state.grazeRate - 1) * 0.8) * dt * 60;
      } else {
        eb.grazeEntered = false;
      }

      if (eb.x < -60 || eb.x > W + 60 || eb.y < -70 || eb.y > H + 90 || eb.age > eb.ttl) eb.dead = true;
      if (circleHit(state.player.x, state.player.y, state.player.hitR, eb.x, eb.y, eb.r * 0.78)) hitPlayer();
    }

    state.enemyBullets = state.enemyBullets.filter((eb) => !eb.dead);

    state.grazeHeat = Math.max(0, state.grazeHeat - dt * 20);
    state.grazeRate += ((1 + Math.min(2.5, state.grazeHeat / 75)) - state.grazeRate) * 0.08;
    state.peakRate = Math.max(state.peakRate, state.grazeRate);

    for (const p of state.particles) {
      p.life -= scaledDt;
      p.x += p.vx * scaledDt;
      p.y += p.vy * scaledDt;
      p.vx *= 0.985;
      p.vy *= 0.985;
    }
    state.particles = state.particles.filter((p) => p.life > 0);

    for (const petal of state.petalDrops) {
      petal.age += dt;
      petal.x += petal.vx * dt;
      petal.y += petal.vy * dt;
      petal.vy += 22 * dt;
      petal.vx *= 0.992;
      petal.rot += petal.vr * dt;
    }
    state.petalDrops = state.petalDrops.filter((petal) => petal.age < petal.ttl);

    if (state.boss.damageFlash > 0) state.boss.damageFlash -= scaledDt;

    updateBossPhase();

    if (state.boss.hp <= 0) {
      state.killFlash = 0.6;
      endGame(true);
    }
  }

  function hitPlayer() {
    if (state.invuln > 0 || !state.running) return;

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

    for (const s of state.stars) {
      ctx.fillStyle = s.s === 2 ? '#a0a0a0' : '#666';
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
    }

    drawBoss();
    drawBullets();
    drawPlayer();
    drawParticles();
    drawSakuraLives();

    if (!state.pointerActive) {
      const alpha = 0.08 + (1 - state.timeScale) * 0.18;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (state.killFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.55, state.killFlash)})`;
      ctx.fillRect(0, 0, W, H);
    }

    bossFill.style.width = `${(state.boss.hp / state.boss.maxHp) * 100}%`;
    scoreCorner.textContent = formatScore(Math.max(0, Math.floor(state.score)));
  }

  function drawBoss() {
    const b = state.boss;
    const pulse = 0.5 + 0.5 * Math.sin(b.timer * 4.4);
    const wingTilt = Math.sin(b.timer * 2.8) * 6;
    const coreGlow = 190 + Math.floor(pulse * 55) + (b.damageFlash > 0 ? 20 : 0);
    const irisBeat = 0.55 + 0.45 * Math.sin(b.timer * 2.4 + state.phase * 0.8);

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.strokeStyle = `rgb(${220 + (b.damageFlash > 0 ? 25 : 0)},${220 + (b.damageFlash > 0 ? 25 : 0)},${220 + (b.damageFlash > 0 ? 25 : 0)})`;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;

    if (bossInvulnerable()) {
      const shieldAlpha = 0.18 + 0.12 * Math.sin(performance.now() * 0.02);
      ctx.strokeStyle = `rgba(255,255,255,${shieldAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 46 + Math.sin(performance.now() * 0.01) * 3, 0, Math.PI * 2);
      ctx.stroke();
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

    ctx.fillStyle = `rgb(${coreGlow},${coreGlow},${coreGlow})`;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.strokeRect(-4, -20, 8, 8);
    ctx.strokeRect(-4, 12, 8, 8);

    ctx.strokeStyle = `rgba(255,255,255,${0.3 + irisBeat * 0.35})`;
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

    ctx.save();
    ctx.translate(p.drawX, p.drawY);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 10);
    ctx.lineTo(0, 6);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = state.pointerActive ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.arc(0, 0, p.grazeR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, p.hitR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    for (const p of state.particles) {
      const a = Math.max(0, p.life * 1.65);
      ctx.fillStyle = p.graze ? `rgba(255,255,255,${Math.min(0.95, a + 0.2)})` : `rgba(255,255,255,${a})`;
      const size = p.graze ? (p.size || 2) + 1 : (p.size || 2);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
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

  resetGame();
  render();
  requestAnimationFrame(loop);
})();