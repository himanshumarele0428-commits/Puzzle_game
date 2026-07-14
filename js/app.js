/* =====================================================================
   PUZZLE QUEST — Game Controller (Dynamic Runtime Stages)
   Progress tracked per puzzle type. Stages generated at runtime.
   ===================================================================== */

const STORAGE_KEY = 'puzzlequest_progress';

const app = {
  currentPuzzleType: 0,
  currentStage: 1,
  moves: 0,
  stars: 0,
  timerInterval: null,
  seconds: 0,
  puzzle: null,
  boardEl: null,
  hintsUsed: 0,

  // progress[typeIdx] = { highestStage: N, stars: total stars for that type, stages: { stageNum: { stars, time, moves } } }
  progress: {},

  els: {},

  init() {
    this.els = {
      introScreen: document.getElementById('intro-screen'),
      gameScreen: document.getElementById('game-screen'),
      victoryScreen: document.getElementById('victory-screen'),
      completeScreen: document.getElementById('complete-screen'),
      levelSelectScreen: document.getElementById('level-select-screen'),
      puzzleBoard: document.getElementById('puzzle-board'),
      puzzleName: document.getElementById('puzzle-name'),
      puzzleInstruction: document.getElementById('puzzle-instruction'),
      levelBadge: document.getElementById('level-badge'),
      progressFill: document.getElementById('progress-fill'),
      statTimer: document.querySelector('#stat-timer span'),
      statMoves: document.querySelector('#stat-moves span'),
      statStars: document.querySelector('#stat-stars span'),
      victoryTime: document.getElementById('victory-time'),
      victoryMoves: document.getElementById('victory-moves'),
      starsDisplay: document.getElementById('stars-display'),
      finalTime: document.getElementById('final-time'),
      finalStarsCount: document.getElementById('final-stars-count'),
      canvas: document.getElementById('confetti-canvas'),
      hintBtn: document.getElementById('hint-btn'),
      resetBtn: document.getElementById('reset-btn'),
      levelGrid: document.getElementById('level-grid'),
      lsProgress: document.getElementById('ls-progress'),
      lsStars: document.getElementById('ls-stars'),
      victoryNextLabel: document.getElementById('victory-next-label'),
    };
    this.boardEl = this.els.puzzleBoard;

    // Restore progress from localStorage
    this.loadProgress();

    document.getElementById('start-btn').addEventListener('click', () => this.showLevelSelect());
    document.getElementById('next-btn').addEventListener('click', () => this.nextStage());
    document.getElementById('victory-levels-btn').addEventListener('click', () => this.goToLevels());
    document.getElementById('replay-btn').addEventListener('click', () => this.replayAll());
    document.getElementById('ls-back-btn').addEventListener('click', () => { this.showScreen('intro'); });
    document.getElementById('game-back-btn').addEventListener('click', () => this.goToLevels());
    this.els.hintBtn.addEventListener('click', () => this.useHint());
    this.els.resetBtn.addEventListener('click', () => this.resetPuzzle());

    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  },

  resizeCanvas() {
    this.els.canvas.width = window.innerWidth;
    this.els.canvas.height = window.innerHeight;
  },

  loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.progress = JSON.parse(raw);
    } catch (e) { this.progress = {}; }
  },

  saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch (e) { /* localStorage may be full/unavailable */ }
  },

  getTypeProgress(typeIdx) {
    if (!this.progress[typeIdx]) {
      this.progress[typeIdx] = { highestStage: 0, stars: 0, stages: {} };
    }
    return this.progress[typeIdx];
  },

  getTotalStars() {
    let total = 0;
    Object.values(this.progress).forEach(tp => { total += tp.stars || 0; });
    return total;
  },

  getTotalCompletedStages() {
    let count = 0;
    Object.values(this.progress).forEach(tp => {
      count += Object.keys(tp.stages || {}).length;
    });
    return count;
  },

  showLevelSelect() {
    const grid = this.els.levelGrid;
    grid.innerHTML = '';

    const typeIcons = ['🧩', '🃏', '🔤', '🔢', '➗', '💧', '🔐', '💡', '🔓'];
    const diffColors = ['#4caf50', '#f7971e', '#e74c3c', '#9b59b6', '#3498db', '#e91e63', '#00bcd4'];

    PUZZLE_TYPES.forEach((type, typeIdx) => {
      const tp = this.getTypeProgress(typeIdx);
      const highest = tp.highestStage || 0;
      const nextStage = highest + 1;
      const stageStars = tp.stars || 0;

      const groupDiv = document.createElement('div');
      groupDiv.className = 'puzzle-type-row';

      // Type info section
      const infoDiv = document.createElement('div');
      infoDiv.className = 'type-info';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'type-icon';
      iconSpan.textContent = typeIcons[typeIdx] || '🧩';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'type-name-section';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'type-name';
      nameSpan.textContent = type.name;

      const progressSpan = document.createElement('span');
      progressSpan.className = 'type-progress';
      progressSpan.textContent = highest > 0 ? `Stage ${highest} cleared` : 'Not started';
      if (highest > 0) progressSpan.style.color = '#4caf50';

      nameDiv.appendChild(nameSpan);
      nameDiv.appendChild(progressSpan);

      infoDiv.appendChild(iconSpan);
      infoDiv.appendChild(nameDiv);
      groupDiv.appendChild(infoDiv);

      // Stage cards row
      const cardsRow = document.createElement('div');
      cardsRow.className = 'stage-cards';

      // Show completed stages
      const completedStages = tp.stages || {};
      const showStages = Math.max(3, highest + 2); // show at least 3 cards + next

      for (let s = 1; s <= showStages; s++) {
        const card = document.createElement('div');
        card.className = 'stage-card';

        const isCompleted = !!completedStages[s];
        const isCurrent = s === nextStage;

        if (isCompleted) {
          card.classList.add('completed');
          const starInfo = completedStages[s];
          card.innerHTML = `
            <div class="stage-num">${s}</div>
            <div class="stage-status">${'⭐'.repeat(starInfo.stars || 1)}</div>
            <div class="stage-action">Replay</div>
          `;
          card.addEventListener('click', () => this.playStage(typeIdx, s));
        } else if (isCurrent) {
          card.classList.add('current');
          card.innerHTML = `
            <div class="stage-num">${s}</div>
            <div class="stage-status">🔒</div>
            <div class="stage-action play-action">▶ Play</div>
          `;
          card.addEventListener('click', () => this.playStage(typeIdx, s));
        } else {
          card.classList.add('locked');
          card.innerHTML = `
            <div class="stage-num">${s}</div>
            <div class="stage-status">🔒</div>
          `;
        }

        cardsRow.appendChild(card);
      }

      groupDiv.appendChild(cardsRow);
      grid.appendChild(groupDiv);
    });

    const completed = this.getTotalCompletedStages();
    const totalStars = this.getTotalStars();
    this.els.lsProgress.textContent = `${completed} stages cleared`;
    this.els.lsStars.textContent = `⭐ ${totalStars} stars earned`;
    this.showScreen('level-select');
  },

  playStage(typeIdx, stage) {
    this.currentPuzzleType = typeIdx;
    this.currentStage = stage;
    this.loadPuzzle(typeIdx, stage);
  },

  loadPuzzle(typeIdx, stage) {
    if (this.puzzle && this.puzzle.cleanup) this.puzzle.cleanup();

    this.moves = 0;
    this.seconds = 0;
    this.stars = 0;
    this.hintsUsed = 0;

    // Get or generate puzzle
    this.puzzle = getPuzzle(typeIdx, stage);
    this.puzzle.init();

    this._transitioning = false;
    this.els.puzzleName.textContent = `📋 ${this.puzzle.name}`;
    this.els.puzzleInstruction.textContent = this.puzzle.instruction;
    this.els.puzzleInstruction.style.color = '#8888bb';
    this.els.levelBadge.textContent = `Type ${typeIdx + 1} — Stage ${stage}`;
    this.els.progressFill.style.width = '0%';

    this.puzzle.render(this.boardEl);

    this.startTimer();
    this.updateStats();
    this.showScreen('game');
    this.els.hintBtn.style.display = '';
    this.els.resetBtn.style.display = '';
  },

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.seconds++;
      this.els.statTimer.textContent = this.formatTime(this.seconds);
    }, 1000);
  },

  stopTimer() {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  },

  formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  },

  updateStats() {
    this.els.statMoves.textContent = this.moves;
  },

  registerMove() {
    this.moves++;
    this.els.statMoves.textContent = this.moves;
  },

  onPuzzleSolved() {
    if (this._transitioning) return;
    this._transitioning = true;
    this.stopTimer();
    this.stars = this.calculateStars();

    // Save progress
    const tp = this.getTypeProgress(this.currentPuzzleType);
    tp.stages = tp.stages || {};
    tp.stages[this.currentStage] = {
      stars: this.stars,
      time: this.seconds,
      moves: this.moves,
    };

    // Update highest stage
    if (this.currentStage > (tp.highestStage || 0)) {
      tp.highestStage = this.currentStage;
    }

    // Recalculate total stars for this type
    tp.stars = Object.values(tp.stages).reduce((sum, s) => sum + (s.stars || 0), 0);

    this.saveProgress();

    this.showScorePopup(this.stars);
    setTimeout(() => this.showVictory(), 600);
  },

  calculateStars() {
    // Dynamic thresholds based on stage difficulty
    const s = this.currentStage;
    const typeIdx = this.currentPuzzleType;

    // Base thresholds that scale with stage
    const baseGreat = 8;
    const baseGood = 20;
    const baseTime = 20;

    const scale = 1 + (s - 1) * 0.3;
    const great = Math.floor(baseGreat * scale);
    const good = Math.floor(baseGood * scale);
    const greatTime = Math.floor(baseTime * scale);

    if (this.moves <= great && this.seconds <= greatTime) return 3;
    if (this.moves <= good) return 2;
    return 1;
  },

  showScorePopup(stars) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = '⭐'.repeat(stars);
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1200);
  },

  showFailure(msg) {
    // Shake the board
    this.els.puzzleBoard.classList.add('shake-anim');
    setTimeout(() => this.els.puzzleBoard.classList.remove('shake-anim'), 500);

    // Flash red on the instruction line
    this.els.puzzleInstruction.style.color = '#e74c3c';
    this.els.puzzleInstruction.textContent = `❌ ${msg}`;
    setTimeout(() => {
      this.els.puzzleInstruction.style.color = '#8888bb';
      this.els.puzzleInstruction.textContent = this.puzzle.instruction;
    }, 2000);

    // Show failure toast
    const toast = document.createElement('div');
    toast.className = 'failure-toast';
    toast.textContent = `❌ ${msg}`;
    document.body.appendChild(toast);
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 1500);
  },

  showVictory() {
    this.els.victoryTime.textContent = this.formatTime(this.seconds);
    this.els.victoryMoves.textContent = this.moves;
    this.els.starsDisplay.textContent = '⭐'.repeat(this.stars);

    const type = PUZZLE_TYPES[this.currentPuzzleType];
    const nextStage = this.currentStage + 1;

    // Update victory title
    const victoryTitle = document.getElementById('victory-title');
    victoryTitle.textContent = `${type.name} — Stage ${this.currentStage} Complete!`;

    const nextBtn = document.getElementById('next-btn');
    nextBtn.textContent = `Next: Stage ${nextStage} →`;

    this.showScreen('victory');
    this.startConfetti();
  },

  nextStage() {
    this.stopConfetti();
    const nextStage = this.currentStage + 1;
    this.playStage(this.currentPuzzleType, nextStage);
  },

  goToLevels() {
    this.stopConfetti();
    if (this.puzzle && this.puzzle.cleanup) this.puzzle.cleanup();
    if (this.timerInterval) this.stopTimer();
    this.showLevelSelect();
  },

  showComplete() {
    // Not really used with infinite stages, but kept for reset flow
    this.showLevelSelect();
  },

  replayAll() {
    this.stopConfetti();
    this.progress = {};
    localStorage.removeItem(STORAGE_KEY);
    // Clear stage registry so puzzles regenerate
    Object.keys(STAGE_REGISTRY).forEach(k => delete STAGE_REGISTRY[k]);
    preGenerateStage1();
    this.showLevelSelect();
  },

  useHint() {
    if (this.puzzle && this.puzzle.solved) return;
    const hint = this.puzzle.hint || 'Think carefully — you can do this!';
    this.els.puzzleInstruction.textContent = `💡 ${hint}`;
    this.els.puzzleInstruction.style.color = '#ffd200';
    this.hintsUsed++;
  },

  resetPuzzle() {
    if (this.puzzle && this.puzzle.solved) return;
    this.loadPuzzle(this.currentPuzzleType, this.currentStage);
  },

  showScreen(name) {
    ['intro', 'game', 'victory', 'complete', 'level-select'].forEach(s => {
      document.getElementById(`${s}-screen`).classList.toggle('active', s === name);
    });
    document.getElementById('bottom-actions').style.display = name === 'game' ? 'flex' : 'none';
  },

  // CONFETTI
  confettiPieces: [],
  confettiRunning: false,

  startConfetti() {
    const canvas = this.els.canvas;
    const ctx = canvas.getContext('2d');
    canvas.style.display = 'block';
    this.confettiPieces = [];
    this.confettiRunning = true;

    const colors = ['#ffd200','#f7971e','#e74c3c','#3498db','#2ecc71','#9b59b6','#1abc9c','#e67e22'];
    for (let i = 0; i < 120; i++) {
      this.confettiPieces.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5, h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.random() * 4 - 2, vy: Math.random() * 3 + 2,
        rot: Math.random() * 360, rotSpeed: Math.random() * 10 - 5, opacity: 1,
      });
    }

    const animate = () => {
      if (!this.confettiRunning) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.confettiPieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed; p.vy += 0.04;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      this.confettiPieces = this.confettiPieces.filter(p => p.y < canvas.height + 20);
      if (this.confettiPieces.length < 80) {
        for (let i = 0; i < 3; i++) this.confettiPieces.push({
          x: Math.random() * canvas.width, y: -20,
          w: Math.random() * 10 + 5, h: Math.random() * 6 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: Math.random() * 4 - 2, vy: Math.random() * 2 + 1,
          rot: Math.random() * 360, rotSpeed: Math.random() * 10 - 5, opacity: 1,
        });
      }
      requestAnimationFrame(animate);
    };
    animate();
  },

  stopConfetti() {
    this.confettiRunning = false;
    this.els.canvas.style.display = 'none';
    this.els.canvas.getContext('2d').clearRect(0, 0, this.els.canvas.width, this.els.canvas.height);
  },
};

document.addEventListener('DOMContentLoaded', () => app.init());
