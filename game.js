import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {
  getDatabase,
  ref,
  query,
  orderByChild,
  limitToLast,
  onValue,
  get,
  set,
  runTransaction,
  remove,
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js';
import { firebaseLeaderboardConfig } from './firebase-config.js';

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const bossFill = document.getElementById('bossFill');
  const phaseText = document.getElementById('phaseText');
  const scoreCorner = document.getElementById('scoreCorner');
  const overlay = document.getElementById('overlay');
  const resultOverlay = document.getElementById('resultOverlay');
  const leaderboardOverlay = document.getElementById('leaderboardOverlay');
  const saveOverlay = document.getElementById('saveOverlay');
  const resultKicker = document.getElementById('resultKicker');
  const resultTitle = document.getElementById('resultTitle');
  const resultStats = document.getElementById('resultStats');
  const leaderboardList = document.getElementById('leaderboardList');
  const leaderboardDetail = document.getElementById('leaderboardDetail');
  const startBtn = document.getElementById('startBtn');
  const menuLeaderboardBtn = document.getElementById('menuLeaderboardBtn');
  const restartBtn = document.getElementById('restartBtn');
  const saveRecordBtn = document.getElementById('saveRecordBtn');
  const resultLeaderboardBtn = document.getElementById('resultLeaderboardBtn');
  const leaderboardExitBtn = document.getElementById('leaderboardExitBtn');
  const saveNameInput = document.getElementById('saveNameInput');
  const saveNameStatus = document.getElementById('saveNameStatus');
  const confirmSaveBtn = document.getElementById('confirmSaveBtn');
  const cancelSaveBtn = document.getElementById('cancelSaveBtn');

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
  const BOMB_DETONATE_TIME = 0.20;
  const BOMB_STALL_TIME = 0.50;
  const BOMB_CHARGE_STAGE_TIME = 0.54;
  const BOMB_SNAP_TIME = 0.08;
  const BOMB_ASSAULT_TIME = 2.22;
  const BOMB_ASSAULT_COLOR_DELAY = 0.68;
  const BOMB_ASSAULT_COLOR_RAMP = 0.58;
  const BOMB_RECOVERY_TIME = 0.82;
  const BOMB_CANCEL_FX_TIME = 0.32;
  const BOMB_PENDING_VICTORY_POSE = 0.76;
  const DEATH_ANIM_TIME = 2.0;
  const RESPAWN_RISE_TIME = 0.78;
  const RESPAWN_INVULN_TIME = 0.96;
  const DEATHBOMB_GHOST_TIME = 1.5;
  const DEATHBOMB_BLAST_TIME = 0.7;
  const VICTORY_ANIM_TIME = 2.35;
  const BOSS_INNER_CORE_HALF = 10;
  const PLAYER_MIN_Y = 24;
  const CLEAR_SCORE_BONUS = 52000;
  const TIME_PENALTY_RATE = 60;
  const LIFE_SCORE_STEP = 0.12;
  const NO_HIT_SCORE_MULTIPLIER = 1.75;
  const BOMB_SCORE_MULTIPLIER = 0.5;
  const PLAYER_HIT_SCORE = 16;
  const GRAZE_SCORE_BASE = 2.6;
  const GRAZE_SCORE_SCALE = 1.1;
  const BOMB_DAMAGE_SCORE = 4;
  const LEADERBOARD_STORAGE_KEY = 'phase0.leaderboard.v1';
  const MAX_LEADERBOARD_RECORDS = 50;
  const FIREBASE_LEADERBOARD_DEFAULTS = {
    records: 'phase0/leaderboard_records',
    names: 'phase0/leaderboard_names',
  };

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
    sakuraPetals: [],
    stars: [],
    pointerActive: false,
    pointerReleaseCount: 0,
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
    deathbombs: 0,
    grazeFrames: 0,
    grazeEntries: 0,
    grazeHeat: 0,
    grazeRate: 1,
    peakRate: 1,
    timePenalty: 0,
    shake: 0,
    lastResult: null,
    selectedLeaderboardId: null,
    leaderboardMode: 'local',
    leaderboardReady: false,
    leaderboardError: '',
    leaderboardRecords: [],
    leaderboardSyncStop: null,
    saveNameCheckToken: 0,
    finish: {
      active: false,
      timer: 0,
      burstTick: 0,
      x: W / 2,
      y: 124,
      pose: 0,
      pendingDuration: 0,
      pendingStartPose: 0,
    },
    hint: {
      text: '',
      timer: 0,
      duration: 0,
      shown: false,
    },
    lifeFlow: {
      mode: 'alive',
      timer: 0,
      duration: 0,
      sourceX: W / 2,
      sourceY: H - 120,
      releaseArmed: false,
      releaseToken: 0,
      pendingGameOver: false,
      lostIndex: -1,
      ringVisible: false,
      ringSpin: 0,
      ringReleaseRadius: 0,
      ringReleaseMax: 0,
      respawnFromY: H + 48,
      respawnTakenOver: false,
      petalTick: 0,
      blastRadius: 0,
      lastBlastRadius: 0,
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
      pendingVictory: false,
    },
  };

  const leaderboardClient = createLeaderboardClient();

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
      motionX: 0,
      motionY: 0,
      bank: 0,
      pitch: 0,
      surge: 0,
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
      phaseFrom: 1,
      phaseShift: 0,
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
    state.sakuraPetals = [];
    state.elapsed = 0;
    state.startTime = performance.now();
    state.pointerActive = false;
    state.pointerReleaseCount = 0;
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
    state.deathbombs = 0;
    state.grazeFrames = 0;
    state.grazeEntries = 0;
    state.grazeHeat = 0;
    state.grazeRate = 1;
    state.peakRate = 1;
    state.timePenalty = 0;
    state.shake = 0;
    state.lastResult = null;
    state.selectedLeaderboardId = null;
    state.finish.active = false;
    state.finish.timer = 0;
    state.finish.burstTick = 0;
    state.finish.x = state.boss.x;
    state.finish.y = state.boss.y;
    state.finish.pose = 0;
    state.finish.pendingDuration = 0;
    state.finish.pendingStartPose = 0;
    state.hint.text = '';
    state.hint.timer = 0;
    state.hint.duration = 0;
    state.hint.shown = false;
    state.lifeFlow.mode = 'alive';
    state.lifeFlow.timer = 0;
    state.lifeFlow.duration = 0;
    state.lifeFlow.sourceX = state.player.x;
    state.lifeFlow.sourceY = state.player.y;
    state.lifeFlow.releaseArmed = false;
    state.lifeFlow.releaseToken = 0;
    state.lifeFlow.pendingGameOver = false;
    state.lifeFlow.lostIndex = -1;
    state.lifeFlow.ringVisible = false;
    state.lifeFlow.ringSpin = 0;
    state.lifeFlow.ringReleaseRadius = 0;
    state.lifeFlow.ringReleaseMax = 0;
    state.lifeFlow.respawnFromY = H + 48;
    state.lifeFlow.petalTick = 0;
    state.lifeFlow.blastRadius = 0;
    state.lifeFlow.lastBlastRadius = 0;
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
    state.bomb.pendingVictory = false;
    phaseText.textContent = 'PHASE 1';
    initStars();
  }

  function startGame() {
    resetGame();
    updateSaveButtonState();
    hideSaveOverlay();
    hideBaseOverlays();
    state.running = true;
    state.lastFrame = performance.now();
  }

  function showHint(text, duration = 4.4) {
    state.hint.text = text;
    state.hint.timer = duration;
    state.hint.duration = duration;
  }

  function createLeaderboardClient() {
    const config = firebaseLeaderboardConfig || {};
    const firebaseConfig = config.firebase || {};
    const paths = {
      ...FIREBASE_LEADERBOARD_DEFAULTS,
      ...(config.paths || {}),
    };

    if (!config.enabled) {
      return {
        mode: 'local',
        startSync() {
          state.leaderboardMode = 'local';
          state.leaderboardReady = true;
          state.leaderboardError = '';
          state.leaderboardRecords = loadLocalLeaderboardFromStorage();
          return () => {};
        },
        async checkNameConflict(name) {
          return findLocalLeaderboardNameConflict(name);
        },
        async saveRecord(record) {
          const records = persistLeaderboard([record, ...loadLocalLeaderboardFromStorage()]);
          state.leaderboardRecords = records;
          return record;
        },
      };
    }

    const missingKey = getMissingFirebaseConfigKey(firebaseConfig);

    if (missingKey) {
      return {
        mode: 'firebase',
        startSync() {
          state.leaderboardMode = 'firebase';
          state.leaderboardReady = true;
          state.leaderboardError = `Firebase 配置缺少 ${missingKey}`;
          state.leaderboardRecords = [];
          return () => {};
        },
        async checkNameConflict() {
          throw new Error(`Firebase 配置缺少 ${missingKey}`);
        },
        async saveRecord() {
          throw new Error(`Firebase 配置缺少 ${missingKey}`);
        },
      };
    }

    let database;

    try {
      const app = initializeApp(firebaseConfig);
      database = getDatabase(app);
    } catch (error) {
      console.warn('Failed to initialize Firebase leaderboard.', error);

      return {
        mode: 'firebase',
        startSync() {
          state.leaderboardMode = 'firebase';
          state.leaderboardReady = true;
          state.leaderboardError = 'Firebase 初始化失败';
          state.leaderboardRecords = [];
          return () => {};
        },
        async checkNameConflict() {
          throw error;
        },
        async saveRecord() {
          throw error;
        },
      };
    }

    return {
      mode: 'firebase',
      startSync() {
        state.leaderboardMode = 'firebase';
        state.leaderboardReady = false;
        state.leaderboardError = '';

        const recordsQuery = query(
          ref(database, paths.records),
          orderByChild('sortScore'),
          limitToLast(MAX_LEADERBOARD_RECORDS)
        );

        return onValue(
          recordsQuery,
          (snapshot) => {
            const records = [];

            snapshot.forEach((childSnapshot) => {
              const normalized = normalizeLeaderboardRecord(childSnapshot.val());
              if (normalized) records.push(normalized);
            });

            state.leaderboardRecords = records
              .sort(sortLeaderboardRecords)
              .slice(0, MAX_LEADERBOARD_RECORDS);
            state.leaderboardReady = true;
            state.leaderboardError = '';

            if (leaderboardOverlay.classList.contains('visible')) {
              renderLeaderboard(state.selectedLeaderboardId);
            }

            if (saveOverlay.classList.contains('visible')) {
              void updateSaveNameStatus();
            }
          },
          (error) => {
            console.warn('Failed to sync Firebase leaderboard.', error);
            state.leaderboardReady = true;
            state.leaderboardError = '云端排行榜同步失败';

            if (leaderboardOverlay.classList.contains('visible')) {
              renderLeaderboard(state.selectedLeaderboardId);
            }

            if (saveOverlay.classList.contains('visible')) {
              void updateSaveNameStatus();
            }
          }
        );
      },
      async checkNameConflict(name) {
        const snapshot = await get(ref(database, `${paths.names}/${normalizeNameKey(name)}`));
        return snapshot.exists();
      },
      async saveRecord(record) {
        const nameKey = normalizeNameKey(record.name);
        const nameClaimRef = ref(database, `${paths.names}/${nameKey}`);
        const claimResult = await runTransaction(nameClaimRef, (currentValue) => {
          if (currentValue === null) return record.id;
          return undefined;
        });

        if (!claimResult.committed) {
          const error = new Error('NAME_TAKEN');
          error.code = 'NAME_TAKEN';
          throw error;
        }

        const nextRecord = normalizeLeaderboardRecord({
          ...record,
          nameKey,
          sortScore: record.finalScore,
        });

        try {
          await set(ref(database, `${paths.records}/${record.id}`), {
            ...nextRecord,
            sortScore: nextRecord.finalScore,
          });
        } catch (error) {
          try {
            await remove(nameClaimRef);
          } catch (cleanupError) {
            console.warn('Failed to rollback Firebase nickname claim.', cleanupError);
          }
          throw error;
        }

        return nextRecord;
      },
    };
  }

  function getMissingFirebaseConfigKey(config) {
    const requiredKeys = [
      'apiKey',
      'authDomain',
      'databaseURL',
      'projectId',
      'storageBucket',
      'messagingSenderId',
      'appId',
    ];

    return requiredKeys.find((key) => !String(config?.[key] ?? '').trim()) || '';
  }

  function initLeaderboardSync() {
    if (typeof state.leaderboardSyncStop === 'function') {
      state.leaderboardSyncStop();
    }

    state.leaderboardSyncStop = leaderboardClient.startSync();
  }

  function setOverlayVisibility(element, visible) {
    element.classList.toggle('hidden', !visible);
    element.classList.toggle('visible', visible);
  }

  function hideBaseOverlays() {
    [overlay, resultOverlay, leaderboardOverlay].forEach((element) => {
      setOverlayVisibility(element, false);
    });
  }

  function showBaseOverlay(target) {
    hideBaseOverlays();
    setOverlayVisibility(target, true);
  }

  function showSaveOverlay() {
    setOverlayVisibility(saveOverlay, true);
    void updateSaveNameStatus();
    saveNameInput.focus();
    saveNameInput.select();
  }

  function hideSaveOverlay() {
    setOverlayVisibility(saveOverlay, false);
    state.saveNameCheckToken += 1;
    saveNameStatus.textContent = getSaveOverlayHint();
    saveNameStatus.className = 'input-hint';
    confirmSaveBtn.disabled = !state.lastResult || state.lastResult.saved;
  }

  async function getSaveNameValidation(name = sanitizePlayerName(saveNameInput.value)) {
    if (!name) {
      return {
        ok: false,
        message: '请输入昵称后再保存。',
        tone: 'error',
      };
    }

    if (state.leaderboardMode === 'firebase' && state.leaderboardError) {
      return {
        ok: false,
        message: state.leaderboardError,
        tone: 'error',
      };
    }

    if (state.leaderboardMode === 'firebase') {
      try {
        const occupied = await leaderboardClient.checkNameConflict(name);

        if (occupied) {
          return {
            ok: false,
            message: '该昵称已被占用，请换一个昵称。',
            tone: 'error',
          };
        }
      } catch (error) {
        console.warn('Failed to validate Firebase nickname.', error);
        return {
          ok: false,
          message: '昵称检查失败，请确认 Firebase 配置和规则。',
          tone: 'error',
        };
      }
    } else if (findLocalLeaderboardNameConflict(name)) {
      return {
        ok: false,
        message: '该昵称已被排行榜占用，请换一个昵称。',
        tone: 'error',
      };
    }

    return {
      ok: true,
      message: state.leaderboardMode === 'firebase'
        ? '昵称可用，保存后会同步到全站共享排行榜。'
        : '昵称可用，保存后会写入当前浏览器的本地排行榜。',
      tone: 'ok',
    };
  }

  async function updateSaveNameStatus() {
    const requestToken = ++state.saveNameCheckToken;
    const name = sanitizePlayerName(saveNameInput.value);

    if (!name) {
      saveNameStatus.textContent = getSaveOverlayHint();
      saveNameStatus.className = 'input-hint';
      confirmSaveBtn.disabled = true;
      return { ok: false, message: '' };
    }

    if (state.leaderboardMode === 'firebase' && !state.leaderboardError) {
      saveNameStatus.textContent = '正在检查云端昵称占用...';
      saveNameStatus.className = 'input-hint';
      confirmSaveBtn.disabled = true;
    }

    const validation = await getSaveNameValidation(name);
    if (requestToken !== state.saveNameCheckToken) return validation;

    saveNameStatus.textContent = validation.message;
    saveNameStatus.className = `input-hint ${validation.tone}`;
    confirmSaveBtn.disabled = !validation.ok;
    return validation;
  }

  function findLocalLeaderboardNameConflict(name) {
    const normalizedName = normalizeNameKey(name);
    if (!normalizedName) return false;

    return loadLocalLeaderboardFromStorage().some((record) => normalizeNameKey(record.name) === normalizedName);
  }

  function getSaveOverlayHint() {
    if (state.leaderboardMode === 'firebase') {
      if (state.leaderboardError) return state.leaderboardError;
      return '昵称将显示在全站共享排行榜中';
    }

    return '昵称将显示在当前浏览器的本地排行榜中';
  }

  function buildRunResult(victory) {
    const clearBonus = victory ? CLEAR_SCORE_BONUS : 0;
    const rawScore = Math.floor(state.score + clearBonus);
    const timePenalty = Math.floor(state.timePenalty);
    const afterPenalty = Math.max(0, rawScore - timePenalty);
    const lifeMultiplier = 1 + Math.max(0, state.player.hp) * LIFE_SCORE_STEP;
    const noHitMultiplier = state.noHit ? NO_HIT_SCORE_MULTIPLIER : 1.0;
    const bombMultiplier = state.bomb.uses > 0 ? BOMB_SCORE_MULTIPLIER : 1.0;
    const deathbombPenalty = deathbombPenaltyPercent(state.deathbombs);
    const deathbombMultiplier = 1 - deathbombPenalty / 100;
    const tacticMultiplier = bombMultiplier * deathbombMultiplier;
    const finalScore = Math.max(0, Math.floor(afterPenalty * lifeMultiplier * noHitMultiplier * tacticMultiplier));

    return {
      victory,
      title: victory ? '目标排除' : '模拟中断',
      finalScore,
      saved: false,
      details: [
        { label: '基础得分', value: formatScore(rawScore) },
        { label: '通关奖励', value: formatScore(clearBonus) },
        { label: '战斗时间', value: `${state.elapsed.toFixed(1)}s` },
        { label: '擦弹帧数', value: Math.floor(state.grazeFrames) },
        { label: '擦弹触发', value: state.grazeEntries },
        { label: '峰值倍率', value: `x${state.peakRate.toFixed(2)}` },
        { label: '炸弹发动', value: state.bomb.uses },
        { label: '决死成功', value: state.deathbombs },
        { label: '时间惩罚', value: formatScore(timePenalty) },
        { label: '残机倍率', value: `x${lifeMultiplier.toFixed(2)}` },
        { label: '无伤倍率', value: `x${noHitMultiplier.toFixed(2)}` },
        { label: '炸弹修正', value: `x${bombMultiplier.toFixed(2)}` },
        { label: '决死修正', value: `x${deathbombMultiplier.toFixed(2)}` },
        { label: '最终得分', value: formatScore(finalScore), total: true },
      ],
    };
  }

  function renderResult(result) {
    resultKicker.textContent = '模拟结果';
    resultTitle.textContent = result.title;
    resultStats.innerHTML = renderResultGrid(result.details);
    updateSaveButtonState();
    hideSaveOverlay();
    showBaseOverlay(resultOverlay);
  }

  function createLeaderboardRecord(name, result) {
    return {
      id: createRecordId(),
      name,
      victory: result.victory,
      title: result.title,
      finalScore: result.finalScore,
      savedAt: Date.now(),
      details: result.details.map((row) => ({ ...row })),
    };
  }

  function loadLeaderboard() {
    if (state.leaderboardMode === 'firebase') {
      return state.leaderboardRecords.slice();
    }

    return loadLocalLeaderboardFromStorage();
  }

  function loadLocalLeaderboardFromStorage() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map(normalizeLeaderboardRecord)
        .filter(Boolean)
        .sort(sortLeaderboardRecords)
        .slice(0, MAX_LEADERBOARD_RECORDS);
    } catch (error) {
      console.warn('Failed to read leaderboard records.', error);
      return [];
    }
  }

  function persistLeaderboard(records) {
    const normalized = records
      .map(normalizeLeaderboardRecord)
      .filter(Boolean)
      .sort(sortLeaderboardRecords)
      .slice(0, MAX_LEADERBOARD_RECORDS);

    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function normalizeLeaderboardRecord(record) {
    if (!record || typeof record !== 'object') return null;

    const detailSource = Array.isArray(record.details)
      ? record.details
      : (record.details && typeof record.details === 'object' ? Object.values(record.details) : []);
    const details = detailSource
      .map((row) => normalizeLeaderboardDetail(row))
      .filter(Boolean);
    const finalScore = Number.isFinite(record.finalScore)
      ? Math.max(0, Math.floor(record.finalScore))
      : 0;
    const normalizedName = sanitizePlayerName(record.name) || 'ANON';

    return {
      id: typeof record.id === 'string' && record.id ? record.id : createRecordId(),
      name: normalizedName,
      nameKey: typeof record.nameKey === 'string' && record.nameKey
        ? record.nameKey
        : normalizeNameKey(normalizedName),
      victory: Boolean(record.victory),
      title: typeof record.title === 'string' && record.title
        ? record.title
        : (record.victory ? '目标排除' : '模拟中断'),
      finalScore,
      sortScore: Number.isFinite(record.sortScore)
        ? Math.max(0, Math.floor(record.sortScore))
        : finalScore,
      savedAt: Number.isFinite(record.savedAt) ? record.savedAt : Date.now(),
      details,
    };
  }

  function normalizeLeaderboardDetail(row) {
    if (!row || typeof row !== 'object') return null;

    return {
      label: String(row.label ?? '').trim(),
      value: String(row.value ?? '').trim(),
      total: Boolean(row.total),
    };
  }

  function sortLeaderboardRecords(a, b) {
    return b.finalScore - a.finalScore
      || Number(b.victory) - Number(a.victory)
      || b.savedAt - a.savedAt;
  }

  function updateSaveButtonState() {
    const saved = Boolean(state.lastResult?.saved);
    saveRecordBtn.disabled = !state.lastResult || saved;
    saveRecordBtn.textContent = saved ? '记录已保存' : '保存记录';
  }

  function saveCurrentResult() {
    if (!state.lastResult || state.lastResult.saved) return;

    saveNameInput.value = '';
    showSaveOverlay();
  }

  async function confirmSaveCurrentResult() {
    if (!state.lastResult || state.lastResult.saved) {
      hideSaveOverlay();
      return;
    }

    const name = sanitizePlayerName(saveNameInput.value);
    const validation = await getSaveNameValidation(name);

    if (!validation.ok) {
      saveNameStatus.textContent = validation.message;
      saveNameStatus.className = `input-hint ${validation.tone}`;
      saveNameInput.focus();
      return;
    }

    try {
      const nextRecord = createLeaderboardRecord(name, state.lastResult);
      const savedRecord = await leaderboardClient.saveRecord(nextRecord);

      state.lastResult.saved = true;
      state.selectedLeaderboardId = savedRecord.id;
      updateSaveButtonState();
      hideSaveOverlay();

      if (state.leaderboardMode === 'firebase') {
        state.leaderboardRecords = [savedRecord, ...state.leaderboardRecords]
          .map(normalizeLeaderboardRecord)
          .filter(Boolean)
          .sort(sortLeaderboardRecords)
          .slice(0, MAX_LEADERBOARD_RECORDS);
      }

      renderLeaderboard(savedRecord.id);
      showBaseOverlay(leaderboardOverlay);
    } catch (error) {
      console.warn('Failed to save leaderboard record.', error);

      if (error?.code === 'NAME_TAKEN' || error?.message === 'NAME_TAKEN') {
        saveNameStatus.textContent = '该昵称刚刚被其他玩家占用了，请换一个昵称。';
        saveNameStatus.className = 'input-hint error';
        saveNameInput.focus();
        return;
      }

      window.alert(
        state.leaderboardMode === 'firebase'
          ? '保存失败，请确认 Firebase Realtime Database 已启用并且规则已配置。'
          : '保存失败，当前环境可能不支持本地持久化。'
      );
    }
  }

  function renderLeaderboard(selectedId = state.selectedLeaderboardId) {
    const records = loadLeaderboard();

    if (state.leaderboardMode === 'firebase' && !state.leaderboardReady && !records.length) {
      state.selectedLeaderboardId = null;
      leaderboardList.innerHTML = '<div class="leaderboard-empty">云端排行榜连接中...</div>';
      leaderboardDetail.innerHTML = '<div class="leaderboard-empty">正在从 Firebase 读取共享排行榜。</div>';
      return;
    }

    if (state.leaderboardMode === 'firebase' && state.leaderboardError && !records.length) {
      state.selectedLeaderboardId = null;
      leaderboardList.innerHTML = `<div class="leaderboard-empty">${escapeHtml(state.leaderboardError)}</div>`;
      leaderboardDetail.innerHTML = '<div class="leaderboard-empty">请先检查 firebase-config.js 和数据库规则配置。</div>';
      return;
    }

    if (!records.length) {
      state.selectedLeaderboardId = null;
      leaderboardList.innerHTML = '<div class="leaderboard-empty">还没有记录，先完成一局并保存吧。</div>';
      leaderboardDetail.innerHTML = `<div class="leaderboard-empty">${escapeHtml(getLeaderboardEmptyDetail())}</div>`;
      return;
    }

    const activeId = records.some((record) => record.id === selectedId)
      ? selectedId
      : records[0].id;

    state.selectedLeaderboardId = activeId;
    leaderboardList.innerHTML = records
      .map((record, index) => buildLeaderboardRow(record, index, record.id === activeId))
      .join('');

    const activeRecord = records.find((record) => record.id === activeId) || records[0];
    leaderboardDetail.innerHTML = buildLeaderboardDetail(activeRecord);

    leaderboardList.querySelectorAll('[data-record-id]').forEach((button) => {
      button.addEventListener('click', () => {
        renderLeaderboard(button.dataset.recordId);
      });
    });
  }

  function buildLeaderboardRow(record, index, active) {
    return [
      `<button type="button" class="leaderboard-row${active ? ' active' : ''}" data-record-id="${escapeHtml(record.id)}">`,
      `<span class="leaderboard-rank">#${String(index + 1).padStart(2, '0')}</span>`,
      `<span class="leaderboard-name">${escapeHtml(record.name)}</span>`,
      `<span class="leaderboard-status ${record.victory ? 'victory' : 'fail'}">${record.victory ? 'V' : 'F'}</span>`,
      `<strong class="leaderboard-score">${formatScore(record.finalScore)}</strong>`,
      '</button>',
    ].join('');
  }

  function buildLeaderboardDetail(record) {
    if (!record) {
      return '<div class="leaderboard-empty">点击一条记录查看详细结算。</div>';
    }

    const outcomeText = record.victory ? 'V / 胜利结算' : 'F / 失败结算';

    return [
      '<div class="leaderboard-detail-head">',
      '<div>',
      `<div class="leaderboard-detail-name">${escapeHtml(record.name)}</div>`,
      `<div class="leaderboard-detail-meta">${escapeHtml(outcomeText)}<br>${escapeHtml(formatSavedAt(record.savedAt))}</div>`,
      '</div>',
      `<div class="leaderboard-detail-score">${formatScore(record.finalScore)}</div>`,
      '</div>',
      renderResultGrid(record.details),
    ].join('');
  }

  function openLeaderboard() {
    hideSaveOverlay();
    renderLeaderboard();
    showBaseOverlay(leaderboardOverlay);
  }

  function getLeaderboardEmptyDetail() {
    if (state.leaderboardMode === 'firebase') {
      return '云端榜单还没有记录。保存后，所有访问这个网址的玩家都会看到它。';
    }

    return '点击“保存记录”后，这里会显示完整结算表。';
  }

  function returnToStartScreen() {
    hideSaveOverlay();
    showBaseOverlay(overlay);
  }

  function endGame(victory) {
    finishRun(victory);
    return;

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

  function finishRun(victory) {
    state.running = false;
    state.finish.active = false;
    state.lifeFlow.mode = 'alive';
    state.lifeFlow.timer = 0;
    state.lifeFlow.duration = 0;
    state.bomb.active = false;

    if (victory) {
      state.shake = Math.max(state.shake, 1.0);
      state.killFlash = Math.max(state.killFlash, 0.42);
    }

    state.lastResult = buildRunResult(victory);
    renderResult(state.lastResult);
    return;

    state.running = false;
    state.finish.active = false;
    state.lifeFlow.mode = 'alive';
    state.lifeFlow.timer = 0;
    state.lifeFlow.duration = 0;
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
    const bombMultiplier = state.bomb.uses > 0 ? BOMB_SCORE_MULTIPLIER : 1.0;
    const deathbombPenalty = deathbombPenaltyPercent(state.deathbombs);
    const deathbombMultiplier = 1 - deathbombPenalty / 100;
    const tacticMultiplier = bombMultiplier * deathbombMultiplier;
    const finalScore = Math.max(0, Math.floor(afterPenalty * lifeMultiplier * noHitMultiplier * tacticMultiplier));

    resultKicker.textContent = '模拟结果';
    resultTitle.textContent = victory ? '目标排除' : '模拟中断';
    resultStats.innerHTML = [
      `<div class="result-grid">`,
      buildResultRow('原始得分', formatScore(rawScore)),
      buildResultRow('战斗用时', `${state.elapsed.toFixed(1)}s`),
      buildResultRow('擦弹帧数', Math.floor(state.grazeFrames)),
      buildResultRow('擦弹触发', state.grazeEntries),
      buildResultRow('峰值倍率', `x${state.peakRate.toFixed(2)}`),
      buildResultRow('炸弹发动', state.bomb.uses),
      buildResultRow('决死成功', state.deathbombs),
      buildResultRow('时间惩罚', formatScore(timePenalty)),
      buildResultRow('残机倍率', `x${lifeMultiplier.toFixed(2)}`),
      buildResultRow('无伤倍率', `x${noHitMultiplier.toFixed(2)}`),
      buildResultRow('炸弹修正', `x${bombMultiplier.toFixed(2)}`),
      buildResultRow(
        '决死修正',
        `x${deathbombMultiplier.toFixed(2)}`
      ),
      buildResultRow('最终分数', formatScore(finalScore), true),
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

  function spawnBossHitFx(x, y, angle, empowered = false) {
    const count = empowered ? 5 : 4;
    const arc = empowered ? 1.15 : 0.9;
    const baseAngle = angle + Math.PI / 2;

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const a = baseAngle - arc / 2 + arc * t + rand(-0.10, 0.10);
      const s = rand(empowered ? 34 : 24, empowered ? 102 : 72);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(empowered ? 0.16 : 0.12, empowered ? 0.28 : 0.22),
        decay: 0.95,
        color: empowered ? pickBombColor(i) : 'white',
        shape: 'line',
        lineAngle: a,
        lineLength: rand(empowered ? 12 : 8, empowered ? 20 : 14),
        lineWidth: empowered ? 1.8 : 1.35,
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

  function spawnSakuraPetals(x, y, count, mode = 'burst', extra = {}) {
    const radiusMin = extra.radiusMin ?? 18;
    const radiusMax = extra.radiusMax ?? 118;
    const lifeMin = extra.lifeMin ?? (mode === 'gather' ? 0.7 : 1.0);
    const lifeSpread = extra.lifeSpread ?? (mode === 'gather' ? 0.35 : 0.8);
    const speedMin = extra.speedMin ?? (mode === 'gather' ? 10 : 42);
    const speedMax = extra.speedMax ?? (mode === 'gather' ? 28 : 180);

    for (let i = 0; i < count; i++) {
      const arcJitter = extra.arcJitter ?? Math.PI;
      const a = extra.baseAngle !== undefined
        ? extra.baseAngle + rand(-arcJitter, arcJitter)
        : Math.random() * Math.PI * 2;
      const radius = rand(radiusMin, radiusMax);
      const startX = mode === 'gather' ? x + Math.cos(a) * radius : x;
      const startY = mode === 'gather' ? y + Math.sin(a) * radius : y;
      const speed = rand(speedMin, speedMax);

      state.sakuraPetals.push({
        x: startX,
        y: startY,
        vx: mode === 'gather' ? Math.cos(a) * rand(-10, 10) : Math.cos(a) * speed,
        vy: mode === 'gather' ? Math.sin(a) * rand(-10, 10) : Math.sin(a) * speed - rand(10, 36),
        rot: Math.random() * Math.PI * 2,
        vr: rand(-4.2, 4.2),
        age: 0,
        ttl: lifeMin + Math.random() * lifeSpread,
        scale: rand(0.7, 1.28),
        widthScale: rand(0.48, 0.68),
        mode,
        decay: extra.decay ?? (mode === 'gather' ? 0.9 : 0.985),
        pull: extra.pull ?? (mode === 'gather' ? 10.5 : 0),
        target: extra.target ?? null,
        targetX: extra.targetX ?? x,
        targetY: extra.targetY ?? y,
      });
    }
  }

  function deathbombWindowForPhase(phase) {
    if (phase === 1) return 1.0;
    if (phase === 2) return 0.5;
    if (phase === 3) return 0.2;
    return 0.1;
  }

  function deathbombPenaltyPercent(count) {
    if (count <= 1) return 0;
    if (count === 2) return 1;

    let total = 1;
    let prev = 1;
    let curr = 2;

    for (let index = 3; index <= count; index++) {
      if (index === 3) {
        total += curr;
        continue;
      }

      const next = prev + curr;
      prev = curr;
      curr = next;
      total += curr;
    }

    return Math.min(40, total);
  }

  function playerLockedMode() {
    return state.lifeFlow.mode === 'window' || state.lifeFlow.mode === 'death';
  }

  function playerRespawning() {
    return state.lifeFlow.mode === 'respawn';
  }

  function playerDissolveRatio() {
    if (state.lifeFlow.mode === 'window') {
      return clamp(state.lifeFlow.timer / Math.max(0.001, state.lifeFlow.duration), 0, 1);
    }
    if (state.lifeFlow.mode === 'death') {
      return 1;
    }
    return 0;
  }

  function maxScreenDistanceFrom(x, y, pad = 0) {
    return Math.max(
      dist(x, y, -pad, -pad),
      dist(x, y, W + pad, -pad),
      dist(x, y, -pad, H + pad),
      dist(x, y, W + pad, H + pad)
    );
  }

  function getWindowRingStartRadius(flow) {
    return Math.max(72, maxScreenDistanceFrom(flow.sourceX, flow.sourceY, 6) * 0.84);
  }

  function getWindowRingRadius(flow) {
    const t = clamp(flow.timer / Math.max(0.001, flow.duration), 0, 1);
    return lerp(getWindowRingStartRadius(flow), 8, easeOutCubic(t));
  }

  function updatePlayerAttitude(prevDrawX, prevDrawY) {
    const p = state.player;
    const rawDX = clamp(p.drawX - prevDrawX, -18, 18);
    const rawDY = clamp(p.drawY - prevDrawY, -18, 18);
    const bankTarget = clamp(rawDX * 0.045, -0.40, 0.40);
    const pitchTarget = clamp((-rawDY) * 0.032, -0.15, 0.20);
    const surgeTarget = clamp(Math.hypot(rawDX, rawDY) / 8.5, 0, 0.88);

    p.motionX += (rawDX - p.motionX) * 0.34;
    p.motionY += (rawDY - p.motionY) * 0.34;
    p.bank += (bankTarget - p.bank) * 0.26;
    p.pitch += (pitchTarget - p.pitch) * 0.20;
    p.surge += (surgeTarget - p.surge) * 0.18;
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

  function getBossPhaseShapeSpec(phase) {
    if (phase === 4) {
      return {
        bodyHalf: 36,
        innerHalf: 14,
        shellInset: 10,
        wingAnchorX: 64,
        wingTipReach: 64,
        wingRootFront: 14,
        wingRootBack: 14,
        wingJointInset: 14,
        wingTop: -22,
        wingBottom: 24,
        wingYOffset: 4,
        sidePodWidth: 16,
        sidePodHalf: 30,
        bottomPodWidth: 40,
        bottomPodHeight: 18,
        cageHalf: 56,
        topTabW: 14,
        topTabH: 12,
        bottomTabW: 14,
        bottomTabH: 12,
        irisHalf: 31,
      };
    }

    if (phase === 3) {
      return {
        bodyHalf: 30,
        innerHalf: 12,
        shellInset: 8,
        wingAnchorX: 52,
        wingTipReach: 50,
        wingRootFront: 12,
        wingRootBack: 12,
        wingJointInset: 12,
        wingTop: -20,
        wingBottom: 22,
        wingYOffset: 5,
        sidePodWidth: 14,
        sidePodHalf: 24,
        bottomPodWidth: 32,
        bottomPodHeight: 14,
        cageHalf: 0,
        topTabW: 12,
        topTabH: 10,
        bottomTabW: 12,
        bottomTabH: 10,
        irisHalf: 25,
      };
    }

    if (phase === 2) {
      return {
        bodyHalf: 28,
        innerHalf: 11,
        shellInset: 8,
        wingAnchorX: 48,
        wingTipReach: 49,
        wingRootFront: 11,
        wingRootBack: 11,
        wingJointInset: 11,
        wingTop: -19,
        wingBottom: 21,
        wingYOffset: 6,
        sidePodWidth: 14,
        sidePodHalf: 20,
        bottomPodWidth: 0,
        bottomPodHeight: 0,
        cageHalf: 0,
        topTabW: 10,
        topTabH: 8,
        bottomTabW: 10,
        bottomTabH: 8,
        irisHalf: 21,
      };
    }

    return {
      bodyHalf: 26,
      innerHalf: BOSS_INNER_CORE_HALF,
      shellInset: 7,
      wingAnchorX: 48,
      wingTipReach: 46,
      wingRootFront: 10,
      wingRootBack: 10,
      wingJointInset: 10,
      wingTop: -18,
      wingBottom: 20,
      wingYOffset: 6,
      sidePodWidth: 0,
      sidePodHalf: 0,
      bottomPodWidth: 0,
      bottomPodHeight: 0,
      cageHalf: 0,
      topTabW: 8,
      topTabH: 8,
      bottomTabW: 8,
      bottomTabH: 8,
      irisHalf: 18,
    };
  }

  function blendBossShapeSpec(fromSpec, toSpec, t) {
    const out = {};
    const keys = new Set([...Object.keys(fromSpec), ...Object.keys(toSpec)]);
    keys.forEach((key) => {
      out[key] = lerp(fromSpec[key] ?? 0, toSpec[key] ?? 0, t);
    });
    return out;
  }

  function getBossShapeData() {
    const b = state.boss;
    const toSpec = getBossPhaseShapeSpec(state.phase);
    const fromPhase = b.phaseFrom ?? state.phase;

    if (b.phaseShift > 0 && fromPhase !== state.phase) {
      const fromSpec = getBossPhaseShapeSpec(fromPhase);
      const morph = easeOutCubic(1 - b.phaseShift);
      return {
        spec: blendBossShapeSpec(fromSpec, toSpec, morph),
        fromSpec,
        toSpec,
        morph,
        fromPhase,
        toPhase: state.phase,
      };
    }

    return {
      spec: toSpec,
      fromSpec: toSpec,
      toSpec,
      morph: 1,
      fromPhase: state.phase,
      toPhase: state.phase,
    };
  }

  function getBossCoreRect() {
    const { spec } = getBossShapeData();
    return {
      x: state.boss.x - spec.bodyHalf,
      y: state.boss.y - spec.bodyHalf,
      w: spec.bodyHalf * 2,
      h: spec.bodyHalf * 2,
    };
  }

  function getBossContactRects() {
    const b = state.boss;
    const { spec } = getBossShapeData();
    const bodyHalf = spec.bodyHalf;
    const bodyRect = getBossCoreRect();
    const rects = [bodyRect];

    if (spec.sidePodWidth > 4) {
      const sideHalf = spec.sidePodHalf * (0.35 + b.leftPodOpen * 0.65);
      rects.push(
        {
          x: b.x - bodyHalf - spec.sidePodWidth - 6,
          y: b.y - sideHalf,
          w: spec.sidePodWidth,
          h: sideHalf * 2,
        },
        {
          x: b.x + bodyHalf + 6,
          y: b.y - sideHalf,
          w: spec.sidePodWidth,
          h: sideHalf * 2,
        }
      );
    }

    if (spec.bottomPodHeight > 4) {
      const bottomHeight = spec.bottomPodHeight * (0.40 + b.rightPodOpen * 0.60);
      rects.push({
        x: b.x - spec.bottomPodWidth * 0.5,
        y: b.y + bodyHalf + 4,
        w: spec.bottomPodWidth,
        h: bottomHeight,
      });
    }

    if (spec.cageHalf > bodyHalf + 6) {
      const outerHalf = lerp(bodyHalf + 8, spec.cageHalf, 0.42 + b.crownOpen * 0.58);
      const edge = 6 + b.shellShift * 4;
      rects.push(
        { x: b.x - outerHalf, y: b.y - outerHalf, w: outerHalf * 2, h: edge },
        { x: b.x - outerHalf, y: b.y + outerHalf - edge, w: outerHalf * 2, h: edge },
        { x: b.x - outerHalf, y: b.y - outerHalf, w: edge, h: outerHalf * 2 },
        { x: b.x + outerHalf - edge, y: b.y - outerHalf, w: edge, h: outerHalf * 2 }
      );
    }

    return rects;
  }

  function shotHitsBossCore(shot) {
    const rect = getBossCoreRect();
    const shotW = Math.max(2, shot.r ?? 2);
    const shotH = shot.h ?? 10;
    const shotX = shot.x - shotW * 0.5;
    const shotY = shot.y - shotH;

    if (!rectsOverlap(shotX, shotY, shotW, shotH, rect.x, rect.y, rect.w, rect.h)) return null;
    return rect;
  }

  function getShotBossImpactPoint(shot, rect) {
    return {
      x: clamp(shot.x, rect.x, rect.x + rect.w),
      y: clamp(shot.y - (shot.h ?? 10) * 0.55, rect.y, rect.y + rect.h),
    };
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

  function startHitSequence() {
    const flow = state.lifeFlow;
    flow.mode = 'window';
    flow.timer = 0;
    flow.duration = deathbombWindowForPhase(state.phase);
    flow.sourceX = state.player.x;
    flow.sourceY = state.player.y;
    flow.releaseArmed = state.pointerActive;
    flow.releaseToken = state.pointerReleaseCount;
    flow.pendingGameOver = false;
    flow.lostIndex = state.player.hp - 1;
    flow.ringVisible = state.phase < 4;
    flow.ringSpin = Math.random() * Math.PI * 2;
    flow.ringReleaseRadius = 0;
    flow.ringReleaseMax = 0;
    flow.petalTick = 0;
    flow.blastRadius = 0;
    flow.lastBlastRadius = 0;

    state.noHit = false;
    state.sakuraPulse = Math.max(state.sakuraPulse, 0.36);
    state.sakuraShock = Math.max(state.sakuraShock, 0.5);
    state.killFlash = Math.max(state.killFlash, 0.10);
    state.shake = Math.max(state.shake, 0.44);
    state.bomb.freezeHold = 0;
    state.bomb.freezeFxTime = 0;
    state.bomb.cancelFx = 0;
    spawnBurst(flow.sourceX, flow.sourceY, 10, 12, 48, {
      color: 'white',
      lifeMin: 0.10,
      lifeSpread: 0.08,
      size: 2,
    });
    spawnSakuraPetals(flow.sourceX, flow.sourceY, 12, 'burst', {
      radiusMin: 10,
      radiusMax: 18,
      speedMin: 18,
      speedMax: 76,
      lifeMin: 0.42,
      lifeSpread: 0.28,
    });
  }

  function beginDeathAnimation() {
    const flow = state.lifeFlow;
    if (flow.mode !== 'window') return;

    state.player.hp = Math.max(0, state.player.hp - 1);
    flow.mode = 'death';
    flow.timer = 0;
    flow.duration = DEATH_ANIM_TIME;
    flow.pendingGameOver = state.player.hp <= 0;

    state.sakuraPulse = 0.9;
    state.sakuraShock = 1.0;
    state.killFlash = Math.max(state.killFlash, 0.22);
    state.shake = Math.max(state.shake, 0.8);

    if (flow.lostIndex >= 0) spawnPetalDrop(flow.lostIndex, W - 54, 56);

    spawnSakuraPetals(flow.sourceX, flow.sourceY, 44, 'burst', {
      radiusMin: 12,
      radiusMax: 28,
      speedMin: 44,
      speedMax: 210,
      lifeMin: 0.9,
      lifeSpread: 1.1,
    });
    spawnBurst(flow.sourceX, flow.sourceY, 24, 24, 116, {
      color: 'white',
      lifeMin: 0.18,
      lifeSpread: 0.12,
      size: 2,
    });
  }

  function startRespawnSequence() {
    const flow = state.lifeFlow;
    flow.mode = 'respawn';
    flow.timer = 0;
    flow.duration = RESPAWN_RISE_TIME + RESPAWN_INVULN_TIME;
    flow.respawnFromY = H + 44;
    flow.respawnTakenOver = false;
    flow.petalTick = 0;

    state.player.x = W / 2;
    state.player.y = flow.respawnFromY;
    state.player.drawX = W / 2;
    state.player.drawY = flow.respawnFromY;
    state.targetX = state.player.x;
    state.targetY = H - 120;
    state.dragAnchor.x = state.targetX;
    state.dragAnchor.y = state.targetY;
    state.dragAnchor.px = state.player.x;
    state.dragAnchor.py = state.targetY;
    state.invuln = flow.duration + 0.08;
    state.sakuraPulse = Math.max(state.sakuraPulse, 0.8);
    state.sakuraShock = Math.max(state.sakuraShock, 0.34);

    spawnSakuraPetals(W / 2, H - 120, 14, 'gather', {
      target: 'player',
      radiusMin: 24,
      radiusMax: 72,
      lifeMin: 0.55,
      lifeSpread: 0.22,
      pull: 13.5,
    });
  }

  function finishRespawnSequence() {
    state.lifeFlow.mode = 'alive';
    state.lifeFlow.timer = 0;
    state.lifeFlow.duration = 0;
    state.lifeFlow.respawnTakenOver = false;
    state.lifeFlow.petalTick = 0;
  }

  function startDeathbombSequence() {
    const flow = state.lifeFlow;
    if (flow.mode !== 'window') return;

    const releaseRadius = flow.ringVisible ? getWindowRingRadius(flow) : 0;
    const releaseMax = flow.ringVisible ? maxScreenDistanceFrom(flow.sourceX, flow.sourceY, 54) : 0;

    flow.mode = 'deathbomb';
    flow.timer = 0;
    flow.duration = DEATHBOMB_GHOST_TIME + DEATHBOMB_BLAST_TIME;
    flow.petalTick = 0;
    flow.blastRadius = 0;
    flow.lastBlastRadius = 0;
    flow.ringReleaseRadius = releaseRadius;
    flow.ringReleaseMax = releaseMax;

    state.deathbombs += 1;
    state.timeScale = 1;
    state.invuln = flow.duration + 0.1;
    state.sakuraPulse = Math.max(state.sakuraPulse, 0.82);
    state.sakuraShock = Math.max(state.sakuraShock, 0.52);
    state.killFlash = Math.max(state.killFlash, 0.14);
    state.shake = Math.max(state.shake, 0.62);
    state.bomb.ready = false;
    state.bomb.charge = 0;
    state.bomb.freezeHold = 0;
    state.bomb.freezeFxTime = 0;
    state.bomb.cancelFx = 0;

    spawnSakuraPetals(flow.sourceX, flow.sourceY, 40, 'gather', {
      target: 'player',
      radiusMin: 44,
      radiusMax: 150,
      lifeMin: 0.8,
      lifeSpread: 0.45,
      pull: 14.5,
    });
  }

  function clearBulletsInDeathbombBlast(radius) {
    if (!state.enemyBullets.length) return;

    const cx = state.lifeFlow.sourceX;
    const cy = state.lifeFlow.sourceY;
    const survivors = [];

    for (const eb of state.enemyBullets) {
      if (eb.type === 'laserWarn' || eb.type === 'laserBeam') {
        const beamHalf = eb.type === 'laserBeam' ? 10 : 6;
        if (Math.abs((eb.x ?? cx) - cx) <= radius + beamHalf) {
          spawnBurst(eb.x ?? cx, cy, 6, 12, 56, {
            color: 'white',
            lifeMin: 0.12,
            lifeSpread: 0.10,
            size: 2,
          });
          continue;
        }
        survivors.push(eb);
        continue;
      }

      const x = typeof eb.x === 'number' ? eb.x : cx;
      const y = typeof eb.y === 'number' ? eb.y : cy;
      const hitRadius = (eb.r ?? 6) + radius;
      if (dist(cx, cy, x, y) <= hitRadius) {
        spawnBurst(x, y, 6, 14, 62, {
          color: 'white',
          lifeMin: 0.12,
          lifeSpread: 0.10,
          size: 2,
        });
        continue;
      }

      survivors.push(eb);
    }

    state.enemyBullets = survivors;
  }

  function updateLifeFlow(dt) {
    const flow = state.lifeFlow;
    if (flow.mode === 'alive') return;

    flow.timer += dt;
    flow.ringSpin += dt * (flow.mode === 'deathbomb' ? 1.15 : 2.6);

    if (flow.mode === 'window') {
      const windowT = clamp(flow.timer / Math.max(0.001, flow.duration), 0, 1);
      const cadence = lerp(0.085, 0.034, easeInOutCubic(windowT));
      flow.petalTick += dt;
      state.player.x = flow.sourceX;
      state.player.y = flow.sourceY;
      state.player.drawX += (flow.sourceX - state.player.drawX) * 0.34;
      state.player.drawY += (flow.sourceY - state.player.drawY) * 0.34;

      if (flow.petalTick >= cadence) {
        flow.petalTick = 0;
        spawnSakuraPetals(flow.sourceX + rand(-5, 5), flow.sourceY + rand(-7, 7), 2 + Math.floor(windowT * 4), 'burst', {
          radiusMin: 8,
          radiusMax: 18 + windowT * 8,
          speedMin: 14 + windowT * 24,
          speedMax: 62 + windowT * 84,
          lifeMin: 0.36,
          lifeSpread: 0.34,
        });
      }

      if (flow.releaseArmed && state.pointerReleaseCount > flow.releaseToken) {
        startDeathbombSequence();
        return;
      }

      if (flow.timer >= flow.duration) beginDeathAnimation();
      return;
    }

    if (flow.mode === 'death') {
      state.player.x = flow.sourceX;
      state.player.y = flow.sourceY;
      state.player.drawX += (flow.sourceX - state.player.drawX) * 0.24;
      state.player.drawY += (flow.sourceY - state.player.drawY) * 0.24;

      if (flow.timer >= flow.duration) {
        if (flow.pendingGameOver) finishRun(false);
        else startRespawnSequence();
      }
      return;
    }

    if (flow.mode === 'respawn') {
      flow.petalTick += dt;
      if (flow.petalTick >= 0.12) {
        flow.petalTick = 0;
        spawnSakuraPetals(state.player.x, state.player.y, 2, 'gather', {
          target: 'player',
          radiusMin: 16,
          radiusMax: 44,
          lifeMin: 0.36,
          lifeSpread: 0.14,
          pull: 13.5,
        });
      }

      if (flow.timer >= flow.duration) finishRespawnSequence();
      return;
    }

    if (flow.mode === 'deathbomb') {
      flow.petalTick += dt;

      if (flow.timer < DEATHBOMB_GHOST_TIME) {
        while (flow.petalTick >= 0.10) {
          flow.petalTick -= 0.10;
          spawnSakuraPetals(state.player.x, state.player.y, 3, 'gather', {
            target: 'player',
            radiusMin: 28,
            radiusMax: 90,
            lifeMin: 0.52,
            lifeSpread: 0.20,
            pull: 16,
          });
        }
      } else {
        const blastT = clamp((flow.timer - DEATHBOMB_GHOST_TIME) / DEATHBOMB_BLAST_TIME, 0, 1);
        const blastRadiusMax = maxScreenDistanceFrom(flow.sourceX, flow.sourceY, 84);
        flow.blastRadius = lerp(20, blastRadiusMax, easeInOutCubic(blastT));
        clearBulletsInDeathbombBlast(flow.blastRadius);
        state.shake = Math.max(state.shake, 0.18 + (1 - blastT) * 0.72);
      }

      if (flow.timer >= flow.duration) {
        flow.mode = 'alive';
        flow.timer = 0;
        flow.duration = 0;
        flow.petalTick = 0;
        flow.blastRadius = 0;
        flow.lastBlastRadius = 0;
        state.invuln = 0;
      }
    }
  }

  function updateBossPhase() {
    if (state.finish.active) return;

    const ratio = state.boss.hp / state.boss.maxHp;
    let nextPhase = 1;

    if (ratio <= PHASE2_RATIO && ratio > PHASE3_RATIO) nextPhase = 2;
    if (ratio <= PHASE3_RATIO && ratio > PHASE4_RATIO) nextPhase = 3;
    if (ratio <= PHASE4_RATIO) nextPhase = 4;

    if (nextPhase !== state.phase) {
      state.boss.phaseFrom = state.phase;
      state.phase = nextPhase;
      state.boss.phaseShift = 1;
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
    const { spec } = getBossShapeData();
    const wingSpread = spec.wingAnchorX + 4 + Math.sin(b.timer * 2.2) * 6;
    const emitters = [
      { x: b.x - wingSpread, y: b.y + spec.wingYOffset + 6 },
      { x: b.x + wingSpread, y: b.y + spec.wingYOffset + 6 },
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
    const phaseShiftDuration = state.phase === 4 ? 1.18 : 0.84;
    boss.phaseShift = Math.max(0, boss.phaseShift - dt / phaseShiftDuration);
    boss.haloSpin += dt * (state.phase === 4 ? 1.35 : 0.45);
    boss.crownOpen += (((state.phase >= 4) ? 1 : (state.phase >= 3 ? 0.35 : 0.08)) - boss.crownOpen) * 0.08;
    boss.shellShift += (((state.phase >= 4) ? 1 : 0) - boss.shellShift) * 0.06;
    boss.auraPulse += (((state.phase >= 4) ? 1 : (state.phase >= 2 ? 0.45 : 0.18)) - boss.auraPulse) * 0.06;
    boss.iris += (((state.phase >= 4) ? 1.2 : (state.phase === 3 ? 1 : 0.35)) - boss.iris) * 0.06;

    const targetRadius = state.phase >= 4 ? 94 : state.phase === 3 ? 88 : 72;
    const targetYAmplitude = state.phase >= 4 ? 8 : 6;

    boss.orbitRadius += (targetRadius - boss.orbitRadius) * 0.08;
    boss.orbitYAmplitude += (targetYAmplitude - boss.orbitYAmplitude) * 0.08;

    if (state.finish.active || state.bomb.pendingVictory) {
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
    if (state.lifeFlow.mode !== 'alive') {
      state.bomb.freezeHold = 0;
      state.bomb.freezeFxTime = 0;
      return;
    }

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
        showHint('觉得太难就松手吧，可能会引发奇迹喔', 5.2);
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

  function queueBombVictory() {
    if (state.bomb.pendingVictory || state.finish.active) return;

    const remainingBombTime = Math.max(0.001, (
      state.bomb.stage === 'assault' ? Math.max(0, BOMB_ASSAULT_TIME - state.bomb.stageTimer) : 0
    ) + (
      state.bomb.stage === 'recover' ? Math.max(0, BOMB_RECOVERY_TIME - state.bomb.stageTimer) : BOMB_RECOVERY_TIME
    ));
    const startPose = Math.max(state.finish.pose, 0.02);

    state.bomb.pendingVictory = true;
    state.boss.hp = 0;
    state.boss.damageFlash = 0.36;
    state.finish.x = state.boss.x;
    state.finish.y = state.boss.y;
    state.finish.pose = startPose;
    state.finish.timer = 0;
    state.finish.burstTick = 0;
    state.finish.pendingDuration = remainingBombTime;
    state.finish.pendingStartPose = startPose;
    state.shake = Math.max(state.shake, 0.72);
    state.killFlash = Math.max(state.killFlash, 0.12);
    state.invuln = Math.max(state.invuln, 0.9);
    clearEnemyBullets(true);
  }

  function finishBombSequence() {
    const queuedVictory = state.bomb.pendingVictory;

    state.bomb.active = false;
    state.bomb.stage = 'idle';
    state.bomb.stageTimer = 0;
    state.bomb.damageTick = 0;
    state.bomb.trailTick = 0;
    state.bomb.freezeFxTime = 0;
    state.bomb.cancelFx = 0;
    state.timeScale = 1;
    state.nextPattern = Math.max(state.nextPattern, 0.85);
    state.dragAnchor.px = state.player.x;
    state.dragAnchor.py = state.player.y;
    state.dragAnchor.x = state.targetX;
    state.dragAnchor.y = state.targetY;
    state.bomb.pendingVictory = false;

    if (queuedVictory) {
      startVictorySequence();
    }
  }

  function updateBombSequence(dt) {
    if (state.bomb.pendingVictory && !state.finish.active) {
      const pendingDuration = Math.max(0.001, state.finish.pendingDuration || BOMB_RECOVERY_TIME);
      state.finish.timer = Math.min(pendingDuration, state.finish.timer + dt);
      state.finish.burstTick += dt;
      state.finish.pose = lerp(
        state.finish.pendingStartPose || 0.02,
        BOMB_PENDING_VICTORY_POSE,
        clamp(state.finish.timer / pendingDuration, 0, 1)
      );

      if (state.finish.burstTick >= 0.09) {
        state.finish.burstTick = 0;
        state.shake = Math.max(state.shake, 0.14 + (1 - state.finish.pose) * 0.16);
        spawnBurst(
          state.finish.x + rand(-18, 18),
          state.finish.y + rand(-18, 18),
          8,
          20,
          120,
          {
            color: 'white',
            lifeMin: 0.16,
            lifeSpread: 0.10,
            size: 2,
          }
        );
      }
    }
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
        if (state.bomb.pendingVictory) continue;
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
        if (state.boss.hp <= 0) {
        queueBombVictory();
        break;
      }
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

    state.bomb.pendingVictory = false;
    state.finish.x = state.boss.x;
    state.finish.y = state.boss.y;

    const carriedPose = clamp(state.finish.pose || 0, 0, BOMB_PENDING_VICTORY_POSE);
    const carriedTimer = carriedPose * VICTORY_ANIM_TIME;

    state.finish.active = true;
    state.finish.timer = carriedTimer;
    state.finish.burstTick = 0;
    state.finish.pose = carriedPose;
    state.finish.pendingDuration = 0;
    state.finish.pendingStartPose = 0;
    state.lifeFlow.mode = 'alive';
    state.lifeFlow.timer = 0;
    state.lifeFlow.duration = 0;
    state.boss.hp = 0;
    state.bomb.active = false;
    state.bomb.ready = false;
    state.bomb.charge = 0;
    state.bomb.freezeHold = 0;
    state.bomb.stage = 'idle';
    state.bomb.pendingVictory = false;
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
      finishRun(true);
    }
  }

  function updateTimeScale(dt) {
    if (state.bomb.active || state.finish.active) {
      state.bomb.freezeHold = 0;
      state.timeScale += (1 - state.timeScale) * 0.16;
      return;
    }

    if (state.lifeFlow.mode === 'deathbomb') {
      state.bomb.freezeHold = 0;
      state.bomb.freezeFxTime = 0;
      state.timeScale += (1 - state.timeScale) * 0.22;
      return;
    }

    if (state.lifeFlow.mode === 'window') {
      state.bomb.freezeHold = 0;
      state.bomb.freezeFxTime = 0;
      const windowTarget = state.pointerActive ? 1 : 0.14;
      state.timeScale += (windowTarget - state.timeScale) * (state.pointerActive ? 0.26 : 0.42);
      return;
    }

    if (playerLockedMode() || playerRespawning()) {
      state.bomb.freezeHold = 0;
      state.bomb.freezeFxTime = 0;
      state.timeScale += (1 - state.timeScale) * 0.18;
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
    const flow = state.lifeFlow;
    const prevDrawX = state.player.drawX;
    const prevDrawY = state.player.drawY;

    if (playerLockedMode()) {
      state.player.x = flow.sourceX;
      state.player.y = flow.sourceY;
      state.player.drawX += (flow.sourceX - state.player.drawX) * 0.34;
      state.player.drawY += (flow.sourceY - state.player.drawY) * 0.34;
      updatePlayerAttitude(prevDrawX, prevDrawY);
      return;
    }

    if (playerRespawning()) {
      if (state.pointerActive) {
        if (!flow.respawnTakenOver) {
          flow.respawnTakenOver = true;
          state.dragAnchor.x = state.targetX;
          state.dragAnchor.y = state.targetY;
          state.dragAnchor.px = state.player.x;
          state.dragAnchor.py = state.player.y;
        }
        const desiredX = clamp(state.dragAnchor.px + (state.targetX - state.dragAnchor.x), 18, W - 18);
        const desiredY = clamp(state.dragAnchor.py + (state.targetY - state.dragAnchor.y), PLAYER_MIN_Y, H - 26);
        state.player.x = desiredX;
        state.player.y = desiredY;
      } else if (!flow.respawnTakenOver && flow.timer < RESPAWN_RISE_TIME) {
        const riseT = clamp(flow.timer / RESPAWN_RISE_TIME, 0, 1);
        state.player.x = W / 2;
        state.player.y = lerp(flow.respawnFromY, H - 120, easeOutCubic(riseT));
      } else if (!flow.respawnTakenOver) {
        state.player.x += (W / 2 - state.player.x) * 0.04;
        state.player.y += ((H - 120) - state.player.y) * 0.08;
      }

      state.player.drawX += (state.player.x - state.player.drawX) * 0.24;
      state.player.drawY += (state.player.y - state.player.drawY) * 0.24;
      updatePlayerAttitude(prevDrawX, prevDrawY);
      return;
    }

    if (state.pointerActive) {
      const desiredX = clamp(state.dragAnchor.px + (state.targetX - state.dragAnchor.x), 18, W - 18);
      const desiredY = clamp(state.dragAnchor.py + (state.targetY - state.dragAnchor.y), PLAYER_MIN_Y, H - 26);

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
    updatePlayerAttitude(prevDrawX, prevDrawY);
  }

  function updatePlayerFire(scaledDt) {
    if (state.bomb.active || state.finish.active || playerLockedMode()) return;
    if (playerRespawning() && state.lifeFlow.timer < RESPAWN_RISE_TIME) return;
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
      const coreRect = shotHitsBossCore(b);
      if (!coreRect) continue;

      b.dead = true;
      const empowered = state.bomb.active && state.bomb.stage === 'assault';
      if (!bossInvulnerable() || empowered) {
        const impact = getShotBossImpactPoint(b, coreRect);
        state.boss.hp = Math.max(0, state.boss.hp - (empowered ? 5 : 2));
        state.boss.damageFlash = empowered ? 0.12 : 0.08;
        state.bossHitCount += empowered ? 3 : 1;
        state.score += (empowered ? 12 : PLAYER_HIT_SCORE) * state.grazeRate;
        spawnBossHitFx(impact.x, impact.y, Math.atan2(impact.y - state.boss.y, impact.x - state.boss.x), empowered);
        if (Math.random() < (empowered ? 0.85 : 0.42)) {
          spawnBurst(impact.x, impact.y, empowered ? 5 : 3, 18, empowered ? 80 : 50, {
            color: empowered ? pickBombColor(Math.floor(state.boss.timer * 22)) : null,
            lifeMin: empowered ? 0.12 : 0.18,
            lifeSpread: empowered ? 0.10 : 0.12,
            size: empowered ? 3 : 2,
          });
        }
      } else if (Math.random() < 0.25) {
        const impact = getShotBossImpactPoint(b, coreRect);
        spawnBurst(impact.x, impact.y, 2, 8, 20);
      }
    }

    state.bullets = state.bullets.filter((b) => !b.dead && b.y > -30);
  }

  function updateBossContactDamage() {
    if (state.finish.active || state.bomb.active) return;
    if (state.lifeFlow.mode !== 'alive' || state.invuln > 0) return;

    for (const rect of getBossContactRects()) {
      if (circleRectHit(state.player.x, state.player.y, state.player.hitR, rect.x, rect.y, rect.w, rect.h)) {
        hitPlayer();
        return;
      }
    }
  }

  function updateEnemyProjectiles(scaledDt, dt) {
    if (state.bomb.active || state.finish.active) {
      clearEnemyBullets(false);
      return;
    }

    const canGraze = state.lifeFlow.mode === 'alive' && state.invuln <= 0;

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

      if (canGraze && d < grazeRadius && d > hitRadius + 1.4) {
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
      if (p.shape === 'line') p.lineAngle = Math.atan2(p.vy, p.vx);
    }
    state.particles = state.particles.filter((p) => p.life > 0);
  }

  function updateSakuraPetals(dt) {
    for (const petal of state.sakuraPetals) {
      petal.age += dt;

      if (petal.mode === 'gather') {
        const targetX = petal.target === 'player' ? state.player.drawX : petal.targetX;
        const targetY = petal.target === 'player' ? state.player.drawY : petal.targetY;
        const dx = targetX - petal.x;
        const dy = targetY - petal.y;
        petal.vx += dx * petal.pull * dt;
        petal.vy += dy * petal.pull * dt;
      } else {
        petal.vy += 22 * dt;
      }

      petal.vx *= petal.decay ?? 0.985;
      petal.vy *= petal.decay ?? 0.985;
      petal.x += petal.vx * dt;
      petal.y += petal.vy * dt;
      petal.rot += petal.vr * dt;
    }

    state.sakuraPetals = state.sakuraPetals.filter((petal) => petal.age < petal.ttl);
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
    if (state.hint.timer > 0) state.hint.timer = Math.max(0, state.hint.timer - scaledDt);
    state.sakuraPulse = Math.max(0, state.sakuraPulse - dt * 1.7);
    state.sakuraShock = Math.max(0, state.sakuraShock - dt * 3.8);
    state.shake = Math.max(0, state.shake - dt * 1.9);

    if (state.finish.active) updateVictorySequence(dt);
    updateLifeFlow(dt);
    if (!state.running) return;

    updateStars(dt);
    updatePlayerMovement();
    updatePlayerFire(scaledDt);

    if (state.bomb.active) updateBombSequence(dt);

    updatePatterns(scaledDt);
    updateBossContactDamage();
    updatePlayerBullets(scaledDt);
    updateEnemyProjectiles(scaledDt, dt);

    state.grazeHeat = Math.max(0, state.grazeHeat - dt * 20);
    state.grazeRate += ((1 + Math.min(2.5, state.grazeHeat / 75)) - state.grazeRate) * 0.08;
    state.peakRate = Math.max(state.peakRate, state.grazeRate);

    updateParticlesState(scaledDt);
    updateSakuraPetals(dt);
    updatePetalDrops(dt);

    if (state.boss.damageFlash > 0) state.boss.damageFlash = Math.max(0, state.boss.damageFlash - scaledDt);

    updateBossPhase();
    if (state.boss.hp <= 0 && state.bomb.active && !state.bomb.pendingVictory) {
      queueBombVictory();
    }
    if (
      state.boss.hp <= 0 &&
      !state.finish.active &&
      state.running &&
      !state.bomb.active &&
      !state.bomb.pendingVictory
    ) {
      startVictorySequence();
    }
  }

  function hitPlayer() {
    if (state.invuln > 0 || !state.running || state.bomb.active || state.finish.active) return;
    if (state.lifeFlow.mode !== 'alive') return;

    startHitSequence();
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
    drawSakuraPetalFx();
    drawBombFx();
    drawLifeFlowFx();
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
        const recoverT = clamp(state.bomb.stageTimer / BOMB_RECOVERY_TIME, 0, 1);
        const collapseT = easeInCubic(clamp(recoverT / 0.78, 0, 1));
        const flashT = clamp((recoverT - 0.78) / 0.22, 0, 1);
        const endFlash = Math.pow(Math.sin(flashT * Math.PI * 2), 6);
        return 0.01 + (1 - collapseT) * 0.03 + endFlash * 0.20;
      }
      return 0;
    }

    const victoryPose = getVictoryPose();
    if (victoryPose > 0) {
      return 0.04 + (1 - victoryPose) * 0.04;
    }

    if (state.lifeFlow.mode === 'window') {
      const t = clamp(state.lifeFlow.timer / state.lifeFlow.duration, 0, 1);
      return 0.04 + (1 - t) * (state.lifeFlow.ringVisible ? 0.10 : 0.03) + (!state.pointerActive ? 0.06 : 0);
    }

    if (state.lifeFlow.mode === 'death') {
      const t = clamp(state.lifeFlow.timer / state.lifeFlow.duration, 0, 1);
      return 0.04 + (1 - t) * 0.08;
    }

    if (state.lifeFlow.mode === 'respawn') {
      const t = clamp(state.lifeFlow.timer / state.lifeFlow.duration, 0, 1);
      return 0.02 + (1 - t) * 0.03;
    }

    if (state.lifeFlow.mode === 'deathbomb') {
      if (state.lifeFlow.timer < DEATHBOMB_GHOST_TIME) {
        return 0.03 + (0.5 + 0.5 * Math.sin(state.lifeFlow.timer * 12)) * 0.02;
      }
      const burstT = clamp((state.lifeFlow.timer - DEATHBOMB_GHOST_TIME) / DEATHBOMB_BLAST_TIME, 0, 1);
      return 0.04 + (1 - burstT) * 0.10;
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
    const { spec, fromSpec, toSpec, morph, toPhase } = getBossShapeData();
    const pulse = 0.5 + 0.5 * Math.sin(b.timer * 4.4);
    const wingTilt = Math.sin(b.timer * 2.8) * 6;
    const coreGlow = 190 + Math.floor(pulse * 55) + (b.damageFlash > 0 ? 20 : 0);
    const irisBeat = 0.55 + 0.45 * Math.sin(b.timer * 2.4 + state.phase * 0.8);
    const defeat = getVictoryPose();
    const empowered = state.bomb.active && (state.bomb.stage === 'assault' || state.bomb.stage === 'recover');
    const chroma = empowered ? bombAssaultColorRatio() : 0;
    const bodyHalf = spec.bodyHalf;
    const bodyTop = state.phase === 4 ? -bodyHalf : -(bodyHalf + 2);
    const bodyHeight = state.phase === 4 ? bodyHalf * 2 : bodyHalf * 2 + 4;
    const bodyBottom = bodyTop + bodyHeight;
    const sidePodHalf = spec.sidePodHalf * (0.35 + b.leftPodOpen * 0.65);
    const bottomPodHeight = spec.bottomPodHeight > 0 ? spec.bottomPodHeight * (0.45 + b.rightPodOpen * 0.55) : 0;
    const outerFrameHalf = spec.cageHalf > bodyHalf + 6
      ? lerp(bodyHalf + 8, spec.cageHalf, 0.42 + b.crownOpen * 0.58)
      : 0;
    const frameAlpha = outerFrameHalf > 0 ? clamp((outerFrameHalf - bodyHalf) / 22, 0, 1) : 0;

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
      if (state.phase === 4) {
        const shieldHalf = (outerFrameHalf || bodyHalf + 18) + 8 + Math.sin(performance.now() * 0.01) * 3;
        ctx.strokeRect(-shieldHalf, -shieldHalf, shieldHalf * 2, shieldHalf * 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 46 + Math.sin(performance.now() * 0.01) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = '#fff';
    }

    if (b.phaseShift > 0) {
      const echoColor = 'white';
      for (let i = 0; i < 2; i++) {
        const p = clamp(morph - i * 0.24, 0, 1);
        if (p <= 0) continue;
        const echoHalf = lerp(fromSpec.bodyHalf, toSpec.bodyHalf + (toPhase === 4 ? 8 : 3), p);
        ctx.strokeStyle = palette(echoColor, (1 - p) * (0.16 - i * 0.04));
        ctx.lineWidth = 1.0 + (1 - p) * 0.9;
        ctx.strokeRect(-echoHalf, -echoHalf, echoHalf * 2, echoHalf * 2);
      }
      ctx.strokeStyle = `rgb(${220 + (b.damageFlash > 0 ? 25 : 0)},${220 + (b.damageFlash > 0 ? 25 : 0)},${220 + (b.damageFlash > 0 ? 25 : 0)})`;
      ctx.lineWidth = 2;
    }

    const drawWing = (side) => {
      ctx.save();
      ctx.translate(side * spec.wingAnchorX, spec.wingYOffset);
      ctx.rotate(side * ((state.phase === 4 ? 0.08 : 0.1) + wingTilt * 0.01));
      ctx.beginPath();
      if (state.phase === 4) {
        ctx.moveTo(side * 14, -22);
        ctx.lineTo(side * (spec.wingTipReach + 4), -2);
        ctx.lineTo(side * 14, 24);
        ctx.lineTo(side * -8, 6);
      } else {
        ctx.moveTo(side * 10, -18);
        ctx.lineTo(side * spec.wingTipReach, 0);
        ctx.lineTo(side * 10, 20);
        ctx.lineTo(side * -10, 4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    drawWing(-1);
    drawWing(1);

    ctx.beginPath();
    ctx.rect(-bodyHalf, bodyTop, bodyHalf * 2, bodyHeight);
    ctx.fill();
    ctx.stroke();

    if (state.phase >= 2 && sidePodHalf > 4) {
      ctx.strokeRect(-bodyHalf - spec.sidePodWidth - 8, -sidePodHalf, spec.sidePodWidth, sidePodHalf * 2);
      ctx.strokeRect(bodyHalf + 8, -sidePodHalf, spec.sidePodWidth, sidePodHalf * 2);
    }

    if (state.phase >= 3 && bottomPodHeight > 4) {
      ctx.strokeRect(-spec.bottomPodWidth * 0.5, bodyBottom + 4, spec.bottomPodWidth, bottomPodHeight);
    }

    if (state.phase === 4 && outerFrameHalf > 0) {
      ctx.strokeStyle = chroma > 0.05
        ? palette('cyan', 0.14 + frameAlpha * 0.18)
        : palette('white', 0.14 + frameAlpha * 0.18);
      ctx.lineWidth = 2;
      ctx.strokeRect(-outerFrameHalf, -outerFrameHalf, outerFrameHalf * 2, outerFrameHalf * 2);

      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-bodyHalf - 8, 0);
      ctx.lineTo(-outerFrameHalf + 10, 0);
      ctx.moveTo(bodyHalf + 8, 0);
      ctx.lineTo(outerFrameHalf - 10, 0);
      ctx.moveTo(0, bodyTop - 8);
      ctx.lineTo(0, -outerFrameHalf + 10);
      ctx.moveTo(0, bodyBottom + 8);
      ctx.lineTo(0, outerFrameHalf - 10);
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgb(${220 + (b.damageFlash > 0 ? 25 : 0)},${220 + (b.damageFlash > 0 ? 25 : 0)},${220 + (b.damageFlash > 0 ? 25 : 0)})`;
    }

    ctx.fillStyle = chroma > 0.05
      ? `rgb(${Math.min(255, coreGlow)},${Math.min(255, coreGlow + 20)},255)`
      : `rgb(${coreGlow},${coreGlow},${coreGlow})`;
    ctx.fillRect(-spec.innerHalf, -spec.innerHalf, spec.innerHalf * 2, spec.innerHalf * 2);
    ctx.strokeRect(-spec.innerHalf, -spec.innerHalf, spec.innerHalf * 2, spec.innerHalf * 2);
    ctx.strokeRect(-4, -20, 8, 8);
    ctx.strokeRect(-4, 12, 8, 8);

    ctx.strokeStyle = chroma > 0.05
      ? palette('cyan', 0.45 + irisBeat * 0.25)
      : `rgba(255,255,255,${0.3 + irisBeat * 0.35})`;
    ctx.beginPath();
    ctx.arc(0, 0, (state.phase === 4 ? 22 : 18) + b.iris * (state.phase === 4 ? 7 : 6), 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, (state.phase === 4 ? 10 : 8) + irisBeat * (state.phase === 4 ? 5 : 4), 0, Math.PI * 2);
    ctx.stroke();
    if (state.phase === 4) {
      ctx.beginPath();
      ctx.arc(0, 0, 30 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 2;

    if (b.phaseIntro > 0) {
      const introColor = 'white';
      const introHalf = (outerFrameHalf || bodyHalf + 10) + b.phaseIntro * (state.phase === 4 ? 16 : 12);
      ctx.strokeStyle = palette(introColor, Math.min(0.85, b.phaseIntro));
      ctx.lineWidth = 1.6;
      ctx.strokeRect(-introHalf, -introHalf, introHalf * 2, introHalf * 2);
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
    if (state.lifeFlow.mode === 'death') return;
    if (state.invuln > 0 && state.lifeFlow.mode !== 'window' && Math.floor(state.invuln * 18) % 2 === 0) return;
    const p = state.player;
    const bombReady = state.lifeFlow.mode === 'alive' && state.bomb.ready;
    const chargeRatio = state.lifeFlow.mode === 'alive' ? (bombReady ? 1 : bombChargeRatio()) : 0;
    const freezeRatio = bombReady && !state.pointerActive ? bombFreezeProgress() : 0;
    const dissolveRatio = playerDissolveRatio();
    const shipAlpha = 1 - dissolveRatio * 0.82;
    const bombAura = state.bomb.active
      ? (state.bomb.stage === 'assault' || state.bomb.stage === 'recover' ? 1 : 0.55)
      : 0;
    const bank = p.bank ?? 0;
    const pitch = p.pitch ?? 0;
    const surge = p.surge ?? 0;
    const motionX = p.motionX ?? 0;
    const motionY = p.motionY ?? 0;
    const tilt = clamp(-bank / 0.30, -1, 1);
    const absTilt = Math.abs(tilt);
    const ringAlpha = 0.32;

    ctx.save();
    ctx.translate(p.drawX, p.drawY);
    ctx.translate(0, -pitch * 7);
    ctx.globalAlpha = shipAlpha;

    const traceHull = (scale = 1, yOffset = 0, noseStretch = 0, tailLift = 0, xOffset = 0) => {
      const nearWingScale = 1 + absTilt * 0.22;
      const farWingScale = 1 - absTilt * 0.34;
      const rightScale = tilt >= 0 ? nearWingScale : farWingScale;
      const leftScale = tilt < 0 ? nearWingScale : farWingScale;
      const rightY = 10 * scale + yOffset + (tilt >= 0 ? absTilt * 2.8 : -absTilt * 1.2);
      const leftY = 10 * scale + yOffset + (tilt < 0 ? absTilt * 2.8 : -absTilt * 1.2);
      const tailX = xOffset + tilt * 2.0 * scale;
      const noseX = xOffset + tilt * 3.2 * scale;
      ctx.beginPath();
      ctx.moveTo(noseX, (-12 - noseStretch) * scale + yOffset);
      ctx.lineTo(10 * rightScale * scale + xOffset, rightY);
      ctx.lineTo(tailX, (6 + tailLift) * scale + yOffset);
      ctx.lineTo(-10 * leftScale * scale + xOffset, leftY);
      ctx.closePath();
    };

    const noseStretch = pitch * 5.4 + surge * 0.55;
    const tailLift = -pitch * 2.5;
    const canopyShiftX = tilt * 3.4;
    const canopyRadiusX = 6.5 - absTilt * 2.1;
    const canopyRadiusY = 6.5 + absTilt * 0.65;
    const bellyAlpha = 0.09 + absTilt * 0.13;

    if (surge > 0.08) {
      for (let i = 0; i < 2; i++) {
        const fade = (1 - i / 2) * surge;
        const trailX = -motionX * (0.8 + i * 0.42);
        const trailY = -motionY * (1.0 + i * 0.65) + 4 + i * 5;
        ctx.strokeStyle = `rgba(255,255,255,${0.07 + fade * 0.10})`;
        ctx.lineWidth = 1.0;
        traceHull(1 - i * 0.04, trailY, Math.max(0, noseStretch - i * 0.3), tailLift + i * 0.45, trailX);
        ctx.stroke();
      }
    }

    if (bombAura > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(state.bomb.stageTimer * 7.5);

      for (let i = 0; i < 3; i++) {
        const fade = (1 - i / 3) * bombAura;
        ctx.strokeStyle = `rgba(255,255,255,${0.10 + fade * 0.10})`;
        ctx.lineWidth = 1.2;
        traceHull(1 + i * 0.08, 4 + i * 6, i * 0.8 + Math.max(0, noseStretch * 0.2), tailLift);
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

    ctx.strokeStyle = `rgba(255,255,255,${0.90 - dissolveRatio * 0.34})`;
    ctx.fillStyle = `rgba(255,255,255,${0.14 + bombAura * 0.06 + dissolveRatio * 0.03})`;
    ctx.lineWidth = 2;
    traceHull(1, 0, noseStretch, tailLift);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(255,255,255,${bellyAlpha})`;
    traceHull(0.74, 0.3, noseStretch * 0.26, tailLift * 0.42 + 0.2, canopyShiftX * 0.10);
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${0.16 + surge * 0.12})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-8 + canopyShiftX * 0.16, 6.5 + tailLift * 0.2 - absTilt * 0.8);
    ctx.lineTo(canopyShiftX * 0.34, 2.2 + tailLift * 0.12);
    ctx.lineTo(8 + canopyShiftX * 0.16, 6.5 + tailLift * 0.2 - absTilt * 0.8);
    ctx.stroke();

    if (bombAura > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + bombAura * 0.08})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-7.5 + canopyShiftX * 0.14, 5 - absTilt * 0.55);
      ctx.lineTo(canopyShiftX * 0.30, -0.3);
      ctx.lineTo(7.5 + canopyShiftX * 0.14, 5 - absTilt * 0.55);
      ctx.stroke();
    }

    ctx.strokeStyle = state.pointerActive ? 'rgba(255,255,255,0.35)' : `rgba(255,255,255,${0.8 - dissolveRatio * 0.26})`;
    ctx.beginPath();
    ctx.ellipse(canopyShiftX, 0, canopyRadiusX, canopyRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,255,255,${0.14 + dissolveRatio * 0.04})`;
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

    ctx.fillStyle = `rgba(255,255,255,${0.95 - dissolveRatio * 0.22})`;
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
      if (p.shape === 'line') {
        const len = p.lineLength ?? 8;
        const angle = p.lineAngle ?? 0;
        const half = len * 0.5;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.strokeStyle = particleColor(p, alpha);
        ctx.lineWidth = p.lineWidth ?? 1.2;
        ctx.beginPath();
        ctx.moveTo(-half, 0);
        ctx.lineTo(half, 0);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.fillStyle = particleColor(p, alpha);
      const size = p.graze ? (p.size || 2) + 1 : (p.size || 2);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
  }

  function drawSakuraPetalFx() {
    for (const petal of state.sakuraPetals) {
      const t = clamp(petal.age / petal.ttl, 0, 1);
      const alpha = (1 - t) * (petal.mode === 'gather' ? 0.88 : 0.76);

      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rot);
      drawPetalShape(
        0,
        0,
        16 * petal.scale,
        9 * petal.scale * petal.widthScale,
        `rgba(255,255,255,${alpha * 0.52})`,
        `rgba(255,255,255,${alpha})`
      );
      ctx.restore();
    }
  }

  function drawLifeFlowFx() {
    const flow = state.lifeFlow;
    if (flow.mode === 'alive') return;

    const drawShipEcho = (x, y, alpha, scale = 1, rotation = 0) => {
      if (alpha <= 0) return;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = palette('white', alpha);
      ctx.fillStyle = palette('white', alpha * 0.10);
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 10);
      ctx.lineTo(0, 6);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    if (flow.mode === 'window' && flow.ringVisible) {
      const t = clamp(flow.timer / flow.duration, 0, 1);
      const radius = getWindowRingRadius(flow);

      ctx.save();
      ctx.translate(flow.sourceX, flow.sourceY);
      ctx.rotate(flow.ringSpin);
      ctx.strokeStyle = palette('white', 0.46 * (1 - t));
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = palette('white', 0.24 * (1 - t));
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, radius + 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (flow.mode === 'death') {
      const t = clamp(flow.timer / flow.duration, 0, 1);
      const fade = 1 - easeOutCubic(Math.min(1, t * 1.25));
      drawShipEcho(flow.sourceX, flow.sourceY, fade * 0.56, 1 + t * 0.15, t * 0.22);

      ctx.strokeStyle = palette('white', fade * 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(flow.sourceX, flow.sourceY, 12 + easeOutCubic(t) * 46, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (flow.mode === 'respawn') {
      const riseT = clamp(flow.timer / RESPAWN_RISE_TIME, 0, 1);
      const appear = flow.timer < RESPAWN_RISE_TIME ? riseT : 1;
      const trailLen = (1 - riseT) * 90;

      ctx.strokeStyle = palette('white', 0.16 + appear * 0.18);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(state.player.drawX, state.player.drawY + 18);
      ctx.lineTo(state.player.drawX, state.player.drawY + 18 + trailLen);
      ctx.stroke();

      ctx.strokeStyle = palette('white', 0.22 + appear * 0.22);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(state.player.drawX, state.player.drawY, 14 + (1 - appear) * 16, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (flow.mode === 'deathbomb') {
      const ghostT = clamp(flow.timer / DEATHBOMB_GHOST_TIME, 0, 1);

      if (flow.ringVisible && flow.ringReleaseRadius > 0 && flow.ringReleaseMax > flow.ringReleaseRadius) {
        const releaseT = clamp(flow.timer / 0.46, 0, 1);
        const radius = lerp(flow.ringReleaseRadius, flow.ringReleaseMax, easeOutCubic(releaseT));

        ctx.save();
        ctx.translate(flow.sourceX, flow.sourceY);
        ctx.rotate(flow.ringSpin);
        ctx.strokeStyle = palette('white', (1 - releaseT) * 0.50);
        ctx.lineWidth = 2.6 - releaseT * 0.4;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = palette('white', (1 - releaseT) * 0.24);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (flow.timer < DEATHBOMB_GHOST_TIME) {
        const blink = 0.5 + 0.5 * Math.sin(flow.timer * 13.5);
        drawShipEcho(flow.sourceX, flow.sourceY, (0.18 + blink * 0.22) * (1 - ghostT * 0.2), 1, -ghostT * 0.12);
        return;
      }

      const burstT = clamp((flow.timer - DEATHBOMB_GHOST_TIME) / DEATHBOMB_BLAST_TIME, 0, 1);
      const burstRadiusMax = maxScreenDistanceFrom(flow.sourceX, flow.sourceY, 84);
      const radius = lerp(22, burstRadiusMax, easeInOutCubic(burstT));

      ctx.save();
      ctx.translate(flow.sourceX, flow.sourceY);
      ctx.rotate(flow.ringSpin);

      const tracePolygon = (polyRadius, sides, rotation) => {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const a = rotation + (Math.PI * 2 * i) / sides;
          const x = Math.cos(a) * polyRadius;
          const y = Math.sin(a) * polyRadius;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };

      ctx.strokeStyle = palette('white', (1 - burstT) * 0.52);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      [0, 0.34, -0.28].forEach((offset, index) => {
        tracePolygon(28 + radius * (0.42 + index * 0.18), index === 1 ? 6 : 8, offset + burstT * (index === 1 ? -1.6 : 1.9));
        ctx.strokeStyle = palette('white', (1 - burstT) * (0.28 - index * 0.05));
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });

      ctx.restore();
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
      const recoverT = state.bomb.stage === 'recover'
        ? clamp(state.bomb.stageTimer / BOMB_RECOVERY_TIME, 0, 1)
        : 0;
      const collapseT = state.bomb.stage === 'recover'
        ? easeInCubic(clamp(recoverT / 0.78, 0, 1))
        : 0;
      const flashT = state.bomb.stage === 'recover'
        ? clamp((recoverT - 0.78) / 0.22, 0, 1)
        : 0;
      const endFlash = state.bomb.stage === 'recover'
        ? Math.pow(Math.sin(flashT * Math.PI * 2), 6)
        : 0;
      const attackRatio = state.bomb.stage === 'assault'
        ? 1
        : 1 - Math.min(0.42, recoverT * 0.42);
      const towerFade = state.bomb.stage === 'recover'
        ? 1 - easeOutCubic(clamp(recoverT / 0.58, 0, 1))
        : 1;
      const pulse = 0.5 + 0.5 * Math.sin((state.bomb.stageTimer + performance.now() * 0.001) * 4.2);
      const beamLen = H + 280;
      const tipY = py - 12;
      const emitY = py - 24;
      const throatY = py - 44;
      const playerBias = clamp((px - W * 0.5) / Math.max(1, W * 0.5), -1, 1);
      const towerCenter = lerp(W * 0.5, px, 0.12);
      const layerCount = 5;
      const towerEdgeOverscan = 112;
      const towerDepthSwing = 0.5 + 0.5 * Math.sin(state.bomb.stageTimer * 1.9);

      ctx.save();
      ctx.globalAlpha = towerFade;

      for (const side of [-1, 1]) {
        const oppositeBoost = Math.max(0, -side * playerBias);
        const sameSidePull = Math.max(0, side * playerBias);

        for (let layer = 0; layer < layerCount; layer++) {
          const frontSegments = [];
          const backSegments = [];
          const coreSegments = [];
          const rungCount = 15 + Math.max(0, 2 - layer);
          const layerDepth = layer / Math.max(1, layerCount - 1);
          const scroll = state.bomb.stageTimer * (0.16 + layer * 0.026) + layer * 0.11;

          for (let rung = 0; rung < rungCount; rung++) {
            const phase = (scroll + rung / rungCount) % 1;
            const cell = Math.floor(scroll * rungCount) + rung;
            const y = H + 34 - phase * (H + 250);
            const spreadT = easeOutCubic(phase);

            const farBase = lerp(
              120 + layer * 18,
              W * (0.72 + layer * 0.026),
              spreadT
            );
            const nearBase = lerp(
              34 + layer * 7,
              150 + layer * 22,
              spreadT
            );
            const lift = lerp(10 + layer * 2.0, 32 + layer * 6.0, spreadT);
            const depthSkew = lerp(5 + layer * 1.2, 24 + layer * 4.2, spreadT);
            const overscan = lerp(0, towerEdgeOverscan + layer * 18, spreadT) * oppositeBoost;
            const pull = lerp(8 + layer * 2, 26 + layer * 5, spreadT) * sameSidePull;
            const widthBoost = spreadT * (14 + layer * 4) * (0.55 + towerDepthSwing * 0.45);

            const outer = farBase + overscan - pull + widthBoost;
            const inner = Math.max(
              nearBase + overscan * 0.18 - pull * 0.08 + widthBoost * 0.14,
              24 + layer * 5
            );
            const middle = lerp(inner, outer, 0.46 + layerDepth * 0.08);
            const flip = cell % 2 === 0 ? 1 : -1;

            const frontX = towerCenter + side * (flip > 0 ? outer : inner);
            const backX = towerCenter + side * (flip > 0 ? inner : outer) + side * depthSkew;
            const coreX = towerCenter + side * middle + side * depthSkew * 0.34;

            frontSegments.push({ x: frontX, y, phase });
            backSegments.push({ x: backX, y: y - lift, phase });
            coreSegments.push({ x: coreX, y: y - lift * 0.52, phase });
          }

          const accent = colorRatio > 0.20 && layer <= 1
            ? (side < 0 ? 'magenta' : 'cyan')
            : 'white';

          const frontAlpha = attackRatio * (0.10 + layer * 0.020);
          const backAlpha = attackRatio * (0.058 + layer * 0.016);
          const coreAlpha = attackRatio * (0.038 + layer * 0.010);

          ctx.strokeStyle = palette(accent, frontAlpha);
          ctx.lineWidth = layer === 0 ? 2.1 : layer === 1 ? 1.7 : 1.35;
          ctx.beginPath();
          frontSegments.forEach((seg, index) => {
            if (index === 0) ctx.moveTo(seg.x, seg.y);
            else ctx.lineTo(seg.x, seg.y);
          });
          ctx.stroke();

          ctx.strokeStyle = palette('white', backAlpha);
          ctx.lineWidth = layer === 0 ? 1.35 : 1.05;
          ctx.beginPath();
          backSegments.forEach((seg, index) => {
            if (index === 0) ctx.moveTo(seg.x, seg.y);
            else ctx.lineTo(seg.x, seg.y);
          });
          ctx.stroke();

          ctx.strokeStyle = palette(accent, coreAlpha);
          ctx.lineWidth = 1;
          ctx.beginPath();
          coreSegments.forEach((seg, index) => {
            if (index === 0) ctx.moveTo(seg.x, seg.y);
            else ctx.lineTo(seg.x, seg.y);
          });
          ctx.stroke();

          for (let i = 0; i < frontSegments.length; i++) {
            const f = frontSegments[i];
            const b = backSegments[i];
            const c = coreSegments[i];
            const alpha = attackRatio * (0.040 + (1 - f.phase) * 0.034 + layer * 0.006);

            ctx.strokeStyle = palette(i % 2 === 0 ? accent : 'white', alpha);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            ctx.strokeStyle = palette(accent, alpha * 0.72);
            ctx.beginPath();
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(c.x, c.y);
            ctx.stroke();

            ctx.strokeStyle = palette('white', alpha * 0.60);
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }

          for (let i = 0; i < frontSegments.length - 1; i++) {
            const f0 = frontSegments[i];
            const f1 = frontSegments[i + 1];
            const b0 = backSegments[i];
            const b1 = backSegments[i + 1];
            const c0 = coreSegments[i];
            const c1 = coreSegments[i + 1];

            ctx.strokeStyle = palette(accent, attackRatio * (0.034 + layer * 0.010));
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(f0.x, f0.y);
            ctx.lineTo(b1.x, b1.y);
            ctx.stroke();

            ctx.strokeStyle = palette('white', attackRatio * (0.026 + layer * 0.008));
            ctx.beginPath();
            ctx.moveTo(b0.x, b0.y);
            ctx.lineTo(f1.x, f1.y);
            ctx.stroke();

            ctx.strokeStyle = palette(accent, attackRatio * (0.018 + layer * 0.006));
            ctx.beginPath();
            ctx.moveTo(c0.x, c0.y);
            ctx.lineTo(c1.x, c1.y);
            ctx.stroke();

            if (i % 2 === 0) {
              ctx.strokeStyle = palette('white', attackRatio * (0.014 + layer * 0.005));
              ctx.beginPath();
              ctx.moveTo(f0.x, f0.y);
              ctx.lineTo(c1.x, c1.y);
              ctx.stroke();
            } else {
              ctx.strokeStyle = palette(accent, attackRatio * (0.014 + layer * 0.005));
              ctx.beginPath();
              ctx.moveTo(c0.x, c0.y);
              ctx.lineTo(b1.x, b1.y);
              ctx.stroke();
            }
          }

          for (let i = 0; i < frontSegments.length - 3; i += 3) {
            const f0 = frontSegments[i];
            const f1 = frontSegments[i + 3];
            const b0 = backSegments[i];
            const b1 = backSegments[i + 3];
            const c0 = coreSegments[i];
            const c1 = coreSegments[i + 3];

            ctx.strokeStyle = palette(accent, attackRatio * (0.020 + layer * 0.005));
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(f0.x, f0.y);
            ctx.lineTo(f1.x, f1.y);
            ctx.stroke();

            ctx.strokeStyle = palette('white', attackRatio * (0.014 + layer * 0.004));
            ctx.beginPath();
            ctx.moveTo(b0.x, b0.y);
            ctx.lineTo(b1.x, b1.y);
            ctx.stroke();

            ctx.strokeStyle = palette(accent, attackRatio * (0.012 + layer * 0.003));
            ctx.beginPath();
            ctx.moveTo(c0.x, c0.y);
            ctx.lineTo(c1.x, c1.y);
            ctx.stroke();
          }

          if (frontSegments.length > 1) {
            const topFront = frontSegments[frontSegments.length - 1];
            const topBack = backSegments[backSegments.length - 1];
            const topCore = coreSegments[coreSegments.length - 1];

            ctx.strokeStyle = palette(accent, attackRatio * (0.026 + layer * 0.008));
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(topFront.x, topFront.y);
            ctx.lineTo(topCore.x, topCore.y);
            ctx.lineTo(topBack.x, topBack.y);
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

      ctx.restore();

      const beamLayers = [
        {
          color: 'magenta',
          alpha: (0.05 * colorRatio * attackRatio) * (1 - flashT * 0.72),
          root: lerp(28, 2.4, collapseT),
          throat: lerp(48, 3.2, collapseT),
          far: lerp(216, 3.2, collapseT),
        },
        {
          color: 'cyan',
          alpha: (0.055 * colorRatio * attackRatio) * (1 - flashT * 0.72),
          root: lerp(22, 2.0, collapseT),
          throat: lerp(38, 2.8, collapseT),
          far: lerp(176, 2.6, collapseT),
        },
        {
          color: 'white',
          alpha: (0.12 * attackRatio) * (1 - flashT * 0.55),
          root: lerp(18, 1.8, collapseT),
          throat: lerp(30, 2.4, collapseT),
          far: lerp(142, 2.1, collapseT),
        },
        {
          color: 'white',
          alpha: (0.32 * attackRatio) * (1 - flashT * 0.35),
          root: lerp(10, 1.2, collapseT),
          throat: lerp(18, 1.6, collapseT),
          far: lerp(72, 1.35, collapseT),
        },
        {
          color: 'white',
          alpha: (0.96 * attackRatio) * (1 - flashT * 0.18),
          root: lerp(4.5, 0.7, collapseT),
          throat: lerp(8, 1.0, collapseT),
          far: lerp(14, 0.85, collapseT),
        },
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

      const tipSpread = lerp(13, 4.2, collapseT);
      ctx.fillStyle = palette('white', attackRatio * (0.10 + pulse * 0.03 + endFlash * 0.10));
      ctx.beginPath();
      ctx.moveTo(px, tipY - 4);
      ctx.lineTo(px - tipSpread, emitY + 6);
      ctx.lineTo(px, emitY - 8);
      ctx.lineTo(px + tipSpread, emitY + 6);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = palette('white', attackRatio * (0.28 + endFlash * 0.20));
      ctx.lineWidth = lerp(1.8, 1.2, collapseT);
      ctx.beginPath();
      ctx.moveTo(px, tipY - 4);
      ctx.lineTo(px - tipSpread, emitY + 6);
      ctx.lineTo(px, emitY - 8);
      ctx.lineTo(px + tipSpread, emitY + 6);
      ctx.closePath();
      ctx.stroke();

      for (let i = 0; i < 7; i++) {
        const phase = ((state.bomb.stageTimer * 0.42) + i / 7) % 1;
        const depth = 48 + phase * (beamLen - 86);
        const beamHalf = lerp(bombSprayHalfWidth(depth, 0.92), 0.9, collapseT);
        const shell = lerp(beamHalf + 36 + i * 12 + pulse * 5, beamHalf + 3 + i * 0.5, collapseT);
        const flare = lerp(14 + i * 5, 1.4, collapseT);
        const y = emitY - depth;
        const color = colorRatio > 0.24 && i % 2 === 0 ? pickBombColor(i) : 'white';

        ctx.strokeStyle = palette(color, attackRatio * (0.05 + (1 - phase) * 0.05) * (1 - flashT * 0.55));
        ctx.lineWidth = lerp(1.45, 1.0, collapseT);
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
        const farX = lerp(px + rail.side * (rail.lane * 92), px + rail.side * 1.4, collapseT);

        ctx.strokeStyle = palette(rail.color, attackRatio * rail.alpha * (1 - flashT * 0.50));
        ctx.lineWidth = lerp(rail.width, Math.max(1, rail.width * 0.48), collapseT);
        ctx.beginPath();
        ctx.moveTo(px + rail.side * 6, tipY - 2);
        ctx.lineTo(px + rail.side * (rail.lane * 14), throatY + 8);
        ctx.lineTo(px + rail.side * (rail.lane * 30), emitY - 120);
        ctx.lineTo(farX, emitY - beamLen);
        ctx.stroke();
      });

      const finalRayHalf = lerp(4.2, 0.8, collapseT);
      ctx.fillStyle = palette('white', attackRatio * (0.12 + collapseT * 0.22 + endFlash * 0.82));
      ctx.fillRect(px - finalRayHalf, emitY - beamLen - 8, finalRayHalf * 2, beamLen + 18);

      if (state.bomb.stage === 'recover' && endFlash > 0.001) {
        const flashWidth = lerp(10, 52, endFlash);

        ctx.fillStyle = palette('white', endFlash * 0.18);
        ctx.fillRect(px - flashWidth * 0.5, emitY - beamLen - 24, flashWidth, beamLen + 44);

        ctx.strokeStyle = palette('white', 0.26 + endFlash * 0.60);
        ctx.lineWidth = 1.1 + endFlash * 2.2;
        ctx.beginPath();
        ctx.moveTo(px, tipY - 10);
        ctx.lineTo(px, emitY - beamLen - 10);
        ctx.stroke();
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
    ctx.bezierCurveTo(width * 0.10, -len * 0.04, width * 0.42, -len * 0.14, width * 0.62, -len * 0.36);
    ctx.bezierCurveTo(width * 0.77, -len * 0.52, width * 0.79, -len * 0.72, width * 0.56, -len * 0.88);
    ctx.bezierCurveTo(width * 0.36, -len * 1.02, width * 0.16, -len * 1.05, width * 0.06, -len * 1.00);
    ctx.bezierCurveTo(width * 0.02, -len * 1.05, width * 0.01, -len * 1.00, 0, -len * 0.96);
    ctx.bezierCurveTo(-width * 0.01, -len * 1.00, -width * 0.02, -len * 1.05, -width * 0.06, -len * 1.00);
    ctx.bezierCurveTo(-width * 0.16, -len * 1.05, -width * 0.36, -len * 1.02, -width * 0.56, -len * 0.88);
    ctx.bezierCurveTo(-width * 0.79, -len * 0.72, -width * 0.77, -len * 0.52, -width * 0.62, -len * 0.36);
    ctx.bezierCurveTo(-width * 0.42, -len * 0.14, -width * 0.10, -len * 0.04, 0, 0);
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
    state.pointerReleaseCount += 1;
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
  menuLeaderboardBtn.addEventListener('click', openLeaderboard);
  restartBtn.addEventListener('click', startGame);
  saveRecordBtn.addEventListener('click', saveCurrentResult);
  resultLeaderboardBtn.addEventListener('click', openLeaderboard);
  leaderboardExitBtn.addEventListener('click', returnToStartScreen);
  confirmSaveBtn.addEventListener('click', confirmSaveCurrentResult);
  cancelSaveBtn.addEventListener('click', hideSaveOverlay);
  saveNameInput.addEventListener('input', updateSaveNameStatus);
  saveNameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmSaveCurrentResult();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      hideSaveOverlay();
    }
  });

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(6, '0');
  }

  function buildResultRow(label, value, total = false) {
    return `<div class="result-row${total ? ' total' : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function renderResultGrid(rows) {
    return [
      '<div class="result-grid">',
      ...rows.map((row) => buildResultRow(row.label, row.value, row.total)),
      '</div>',
    ].join('');
  }

  function sanitizePlayerName(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 16);
  }

  function normalizeNameKey(value) {
    return sanitizePlayerName(value).toLocaleLowerCase('zh-CN');
  }

  function createRecordId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function formatSavedAt(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '保存时间未知';

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  function circleRectHit(cx, cy, cr, rx, ry, rw, rh) {
    const nearestX = clamp(cx, rx, rx + rw);
    const nearestY = clamp(cy, ry, ry + rh);
    return dist(cx, cy, nearestX, nearestY) < cr;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInCubic(t) {
    return t * t * t;
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

  initLeaderboardSync();
  resetGame();
  updateSaveButtonState();
  render();
  requestAnimationFrame(loop);
})();
