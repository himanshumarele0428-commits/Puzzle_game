/* =====================================================================
   PUZZLE QUEST — 9 Puzzle Types, Infinite Runtime Stages
   Each type has a generateFn(stage) that creates a fresh puzzle.
   Difficulty scales with stage number.
   ===================================================================== */

const PUZZLE_TYPES = [];
const STAGE_REGISTRY = {}; // { typeIdx: { stageNum: puzzleInstance } }

function getPuzzle(typeIdx, stage) {
  if (!STAGE_REGISTRY[typeIdx]) STAGE_REGISTRY[typeIdx] = {};
  if (!STAGE_REGISTRY[typeIdx][stage]) {
    STAGE_REGISTRY[typeIdx][stage] = PUZZLE_TYPES[typeIdx].generateFn(stage);
  }
  return STAGE_REGISTRY[typeIdx][stage];
}

// Pre-generate stage 1 for all types on load
function preGenerateStage1() {
  PUZZLE_TYPES.forEach((type, idx) => {
    getPuzzle(idx, 1);
  });
}

// ====================================================================
// TYPE 0 — SLIDING PUZZLE
// ====================================================================
PUZZLE_TYPES.push({
  name: 'Sliding Puzzle',
  icon: '🧩',
  generateFn(stage) {
    const size = stage <= 2 ? 3 : stage <= 5 ? 4 : 5;
    const total = size * size;
    return {
      typeIndex: 0, typeName: 'Sliding Puzzle', stage,
      name: `Sliding Puzzle — Stage ${stage}`,
      instruction: `Arrange tiles 1–${total - 1} in order by sliding into the empty space.`,
      hint: size >= 5 ? 'Solve top rows first, then bottom-left, then remaining 2×2.' :
            size >= 4 ? 'Solve row by row from top to bottom.' :
            'Start with the top-left corner.',
      init() {
        this.size = size;
        this.total = total;
        this.board = [...Array(total - 1).keys()].map(i => i + 1).concat(0);
        do { this.shuffle(30 + stage * 10); } while (!this.isSolvable());
      },
      shuffle(count) {
        for (let k = 0; k < count; k++) {
          const i = Math.floor(Math.random() * this.total);
          const j = Math.floor(Math.random() * this.total);
          [this.board[i], this.board[j]] = [this.board[j], this.board[i]];
        }
      },
      isSolvable() {
        let inv = 0;
        for (let i = 0; i < this.total; i++)
          for (let j = i + 1; j < this.total; j++)
            if (this.board[i] && this.board[j] && this.board[i] > this.board[j]) inv++;
        if (this.size % 2 === 1) return inv % 2 === 0;
        const blankRow = this.size - Math.floor(this.board.indexOf(0) / this.size);
        return (blankRow % 2 === 0) === (inv % 2 === 0);
      },
      emptyIdx() { return this.board.indexOf(0); },
      canMove(idx) {
        const e = this.emptyIdx();
        const r1 = Math.floor(idx / this.size), c1 = idx % this.size;
        const r2 = Math.floor(e / this.size), c2 = e % this.size;
        return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
      },
      move(idx) {
        if (!this.canMove(idx)) return false;
        const e = this.emptyIdx();
        [this.board[idx], this.board[e]] = [this.board[e], this.board[idx]];
        return true;
      },
      isSolved() {
        for (let i = 0; i < this.total - 1; i++) if (this.board[i] !== i + 1) return false;
        return this.board[this.total - 1] === 0;
      },
      render(boardEl) {
        boardEl.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'slide-grid';
        const tileSize = Math.min(60, Math.floor(300 / this.size));
        grid.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
        grid.style.width = grid.style.height = `${tileSize * this.size + 10}px`;
        const self = this;
        this.board.forEach((val, idx) => {
          const tile = document.createElement('div');
          tile.className = 'slide-tile' + (val === 0 ? ' slide-empty' : '');
          tile.textContent = val || '';
          tile.style.fontSize = this.size > 4 ? '0.9rem' : this.size > 3 ? '1.3rem' : '1.8rem';
          tile.addEventListener('click', () => {
            if (self.move(idx)) {
              app.registerMove();
              self.render(boardEl);
              if (self.isSolved()) app.onPuzzleSolved();
            }
          });
          grid.appendChild(tile);
        });
        boardEl.appendChild(grid);
      },
      cleanup() {}
    };
  }
});

// ====================================================================
// TYPE 1 — MEMORY MATCH
// ====================================================================
PUZZLE_TYPES.push({
  name: 'Memory Match',
  icon: '🃏',
  generateFn(stage) {
    const allEmojis = ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥝','🍌','🥭','🍍','🫐',
                       '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮',
                       '🌞','🌝','⭐','🔥','💧','🌈','❄️','🎵','🎸','🎯','🚀','🎈'];
    const pairs = Math.min(4 + stage, allEmojis.length);
    const cols = pairs <= 4 ? 4 : pairs <= 6 ? 4 : pairs <= 8 ? 4 : 6;
    return {
      typeIndex: 1, typeName: 'Memory Match', stage,
      name: `Memory Match — Stage ${stage}`,
      instruction: `Flip cards to find all ${pairs} matching pairs.`,
      hint: pairs >= 10 ? 'Divide the grid mentally and memorize one section at a time.' :
            pairs >= 6 ? 'Start from top-left and memorize two cards at a time.' :
            'Flip one card, then search for its match from what you remember.',
      init() {
        const shuffled = [...allEmojis].sort(() => Math.random() - 0.5);
        const emojis = shuffled.slice(0, pairs);
        const deck = [...emojis, ...emojis];
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        this.cards = deck;
        this.total = deck.length;
        this.flipped = new Array(this.total).fill(false);
        this.matched = new Array(this.total).fill(false);
        this.selected = [];
        this.locked = false;
        this.pairsFound = 0;
        this.totalPairs = pairs;
        this.cols = cols;
      },
      flip(idx) {
        if (this.locked || this.flipped[idx] || this.matched[idx]) return;
        app.registerMove();
        this.flipped[idx] = true;
        this.selected.push(idx);
        if (this.selected.length === 2) {
          const [a, b] = this.selected;
          if (this.cards[a] === this.cards[b]) {
            this.matched[a] = this.matched[b] = true;
            this.pairsFound++;
            this.selected = [];
            if (this.pairsFound === this.totalPairs) app.onPuzzleSolved();
          } else {
            this.locked = true;
            setTimeout(() => {
              this.flipped[a] = this.flipped[b] = false;
              this.selected = [];
              this.locked = false;
              this.render(app.boardEl);
            }, 700);
          }
        }
        this.render(app.boardEl);
      },
      render(boardEl) {
        boardEl.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'memory-grid';
        grid.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        const self = this;
        this.cards.forEach((emoji, idx) => {
          const card = document.createElement('div');
          card.className = 'memory-card';
          if (this.flipped[idx] || this.matched[idx]) card.classList.add('flipped');
          if (this.matched[idx]) card.classList.add('matched');
          if (this.flipped[idx] || this.matched[idx]) card.textContent = emoji;
          card.addEventListener('click', () => self.flip(idx));
          grid.appendChild(card);
        });
        boardEl.appendChild(grid);
      },
      cleanup() {}
    };
  }
});

// ====================================================================
// TYPE 2 — WORD SCRAMBLE
// ====================================================================
PUZZLE_TYPES.push({
  name: 'Word Scramble',
  icon: '🔤',
  generateFn(stage) {
    const wordBank = [
      { word: 'PYTHON', category: 'Programming', hint: '🐍 Named after a snake' },
      { word: 'JUNGLE', category: 'Nature', hint: '🌴 Dense forest' },
      { word: 'GALAXY', category: 'Space', hint: '🌌 A system of stars' },
      { word: 'PUZZLE', category: 'Game', hint: '🧩 What you\'re playing!' },
      { word: 'TEMPLE', category: 'Architecture', hint: '🏛️ Sacred building' },
      { word: 'BRIDGE', category: 'Structure', hint: '🌉 Crosses water' },
      { word: 'CASTLE', category: 'History', hint: '🏰 Royal fortress' },
      { word: 'NATURE', category: 'World', hint: '🌿 The great outdoors' },
      { word: 'PLANET', category: 'Space', hint: '🌍 Orbits a star' },
      { word: 'DIAMOND', category: 'Gemstone', hint: '💎 Hardest material' },
      { word: 'FALCON', category: 'Animal', hint: '🦅 Fastest bird' },
      { word: 'ELEPHANT', category: 'Animal', hint: '🐘 Largest land animal' },
      { word: 'MYSTERY', category: 'Concept', hint: '🕵️ Something unknown' },
      { word: 'OCTAGON', category: 'Shape', hint: '🛑 Eight-sided figure' },
      { word: 'PHANTOM', category: 'Spooky', hint: '👻 A ghostly figure' },
      { word: 'CRYSTAL', category: 'Mineral', hint: '💎 Clear and shiny' },
      { word: 'HARMONY', category: 'Music', hint: '🎵 Pleasing sounds' },
      { word: 'JUPITER', category: 'Space', hint: '🪐 Largest planet' },
      { word: 'LANTERN', category: 'Object', hint: '🏮 Source of light' },
      { word: 'ASTRONAUT', category: 'Space', hint: '🧑‍🚀 Space traveler' },
      { word: 'VOLCANOES', category: 'Nature', hint: '🌋 Erupts with lava' },
      { word: 'CHOCOLATE', category: 'Food', hint: '🍫 Sweet brown treat' },
      { word: 'KANGAROO', category: 'Animal', hint: '🦘 Hops in Australia' },
      { word: 'MICROSCOPE', category: 'Science', hint: '🔬 Magnifies tiny things' },
      { word: 'RAINBOW', category: 'Nature', hint: '🌈 Colors after rain' },
      { word: 'SCARECROW', category: 'Farm', hint: '🧑‍🌾 Guards the fields' },
      { word: 'WATERFALL', category: 'Nature', hint: '💧 Cascading water' },
      { word: 'BUTTERFLY', category: 'Insect', hint: '🦋 Beautiful winged insect' },
      { word: 'ADVENTURE', category: 'Concept', hint: '🗺️ Exciting journey' },
      { word: 'TELEPHONE', category: 'Device', hint: '📞 Makes calls' },
      { word: 'UMBRELLA', category: 'Object', hint: '☂️ Keeps you dry' },
      { word: 'DINOSAUR', category: 'History', hint: '🦖 Ancient reptile' },
    ];

    const targetLen = Math.min(5 + stage, 12);
    const candidates = wordBank.filter(w => w.word.length === targetLen);
    // If no exact match, use closest length
    const closest = candidates.length > 0 ? candidates :
      wordBank.filter(w => Math.abs(w.word.length - targetLen) <= 1);

    const data = closest[Math.floor(Math.random() * closest.length)] || wordBank[Math.floor(Math.random() * wordBank.length)];
    return {
      typeIndex: 2, typeName: 'Word Scramble', stage,
      name: `Word Scramble — Stage ${stage}`,
      instruction: 'Arrange the letters to form the correct word.',
      hint: null,
      init() {
        this.data = data;
        this.targetWord = this.data.word;
        this.letters = this.targetWord.split('');
        do {
          for (let i = this.letters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.letters[i], this.letters[j]] = [this.letters[j], this.letters[i]];
          }
        } while (this.letters.join('') === this.targetWord);
        this.solved = false;
        this.slots = new Array(this.targetWord.length).fill(null);
        this.selectedLetters = [];
        this.hint = this.data.hint;
      },
      selectLetter(idx) {
        if (this.solved) return;
        app.registerMove();
        const pos = this.selectedLetters.indexOf(idx);
        if (pos !== -1) {
          this.selectedLetters.splice(pos, 1);
          this.slots.fill(null);
          let si = 0;
          this.selectedLetters.forEach(li => { this.slots[si++] = this.letters[li]; });
          this.render(app.boardEl);
          return;
        }
        if (this.selectedLetters.length >= this.targetWord.length) return;
        this.selectedLetters.push(idx);
        this.slots[this.selectedLetters.length - 1] = this.letters[idx];
        if (this.selectedLetters.length === this.targetWord.length) {
          if (this.selectedLetters.map(i => this.letters[i]).join('') === this.targetWord) {
            this.solved = true;
            this.render(app.boardEl);
            setTimeout(() => app.onPuzzleSolved(), 500);
          } else {
            app.showFailure('Wrong word! Try again.');
            setTimeout(() => {
              this.selectedLetters = [];
              this.slots.fill(null);
              this.render(app.boardEl);
            }, 600);
          }
        }
        this.render(app.boardEl);
      },
      render(boardEl) {
        boardEl.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'scramble-container';
        const cat = document.createElement('div');
        cat.className = 'scramble-category';
        cat.textContent = `📂 ${this.data.category}`;
        container.appendChild(cat);
        const slotsRow = document.createElement('div');
        slotsRow.className = 'scramble-slots';
        this.slots.forEach(val => {
          const slot = document.createElement('div');
          slot.className = 'scramble-slot' + (val ? ' filled' : '');
          slot.textContent = val || '';
          slot.style.animation = val ? 'popIn 0.25s ease' : '';
          slotsRow.appendChild(slot);
        });
        container.appendChild(slotsRow);
        const lettersRow = document.createElement('div');
        lettersRow.className = 'scramble-letters';
        const self = this;
        this.letters.forEach((letter, idx) => {
          const el = document.createElement('div');
          el.className = 'scramble-letter' + (this.selectedLetters.includes(idx) ? ' selected' : '');
          el.textContent = letter;
          if (!this.selectedLetters.includes(idx)) {
            el.addEventListener('click', () => self.selectLetter(idx));
          }
          lettersRow.appendChild(el);
        });
        container.appendChild(lettersRow);
        const hintArea = document.createElement('div');
        hintArea.className = 'scramble-hint-text';
        hintArea.textContent = this.solved ? '✅ Correct!' : '';
        container.appendChild(hintArea);
        boardEl.appendChild(container);
      },
      cleanup() {}
    };
  }
});

// ====================================================================
// TYPE 3 — NUMBER SEQUENCE
// ====================================================================
PUZZLE_TYPES.push({
  name: 'Number Sequence',
  icon: '🔢',
  generateFn(stage) {
    // Generate patterns dynamically based on stage
    const patterns = [
      // Stage 1-2: Simple arithmetic
      ...Array.from({length: 5}, () => {
        const start = Math.floor(Math.random() * 10) + 1;
        const step = Math.floor(Math.random() * 5) + 2;
        const seq = Array.from({length: 5}, (_, i) => start + step * i);
        const miss = 2 + Math.floor(Math.random() * 2);
        const ans = seq[miss];
        seq[miss] = null;
        const opts = [ans, ans + Math.floor(Math.random() * 3) - 1, ans + step, ans - step + 1];
        return { seq, options: [...new Set(opts.filter(x => x > 0).slice(0, 4))], answer: ans };
      }),
      // Stage 3-4: Multiplicative / squares
      ...Array.from({length: 5}, () => {
        const start = Math.floor(Math.random() * 3) + 1;
        const seq = [start, start * 2, start * 4, start * 8, start * 16];
        const miss = 2 + Math.floor(Math.random() * 2);
        const ans = seq[miss];
        seq[miss] = null;
        const opts = [ans, ans + start, ans - start, Math.floor(ans / 2)];
        return { seq, options: [...new Set(opts.filter(x => x > 0).slice(0, 4))], answer: ans };
      }),
      // Stage 5+: Complex
      ...Array.from({length: 5}, () => {
        const b = Math.floor(Math.random() * 5) + 2;
        const seq = [b, b * b, b * b * b, b * b * b * b, b * b * b * b * b];
        const miss = 2 + Math.floor(Math.random() * 2);
        const ans = seq[miss];
        seq[miss] = null;
        const opts = [ans, ans + b, ans * 2, ans - b * 2];
        return { seq: seq.map(x => x > 1000 ? null : x).map((x, i) => i === miss ? null : x), options: [...new Set(opts.filter(x => x > 0).slice(0, 4))], answer: ans };
      }),
    ];

    const bank = stage <= 2 ? patterns.slice(0, 5) : stage <= 4 ? patterns.slice(5, 10) : patterns.slice(10);
    const data = bank[Math.floor(Math.random() * bank.length)];

    return {
      typeIndex: 3, typeName: 'Number Sequence', stage,
      name: `Number Sequence — Stage ${stage}`,
      instruction: 'Find the missing number in the sequence.',
      hint: stage >= 5 ? 'Look for exponential patterns or higher-order sequences.' :
            stage >= 3 ? 'Check for multiplication or square number patterns.' :
            'Look at the difference between consecutive numbers.',
      init() {
        this.data = data;
        this.options = [...this.data.options];
        this.solved = false;
        this.missingIdx = this.data.seq.indexOf(null);
        this.answer = this.data.answer;
      },
      render(boardEl) {
        boardEl.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'sequence-container';
        const display = document.createElement('div');
        display.className = 'sequence-display';
        this.data.seq.forEach((val, idx) => {
          const el = document.createElement('div');
          el.className = 'sequence-number' + (val === null ? ' missing' : '');
          el.textContent = val !== null ? val : '?';
          if (val !== null) { el.style.animationDelay = `${idx * 0.1}s`; el.classList.add('pop-in'); }
          display.appendChild(el);
        });
        container.appendChild(display);
        const ops = document.createElement('div');
        ops.className = 'sequence-options';
        const self = this;
        this.options.forEach(val => {
          const el = document.createElement('div');
          el.className = 'sequence-option pop-in';
          el.textContent = val;
          el.addEventListener('click', () => {
            if (self.solved) return;
            app.registerMove();
            if (val === self.answer) {
              self.solved = true;
              self.data.seq[self.missingIdx] = val;
              self.render(boardEl);
              setTimeout(() => app.onPuzzleSolved(), 400);
            } else {
              el.classList.add('shake-anim');
              setTimeout(() => el.classList.remove('shake-anim'), 400);
            }
          });
          ops.appendChild(el);
        });
        container.appendChild(ops);
        boardEl.appendChild(container);
      },
      cleanup() {}
    };
  }
});

// ====================================================================
// TYPE 4 — MATH GRID
// ====================================================================
PUZZLE_TYPES.push({
  name: 'Math Grid',
  icon: '➗',
  generateFn(stage) {
    const size = stage <= 3 ? 3 : 4;
    const maxVal = size * size;

    // Generate a valid magic square (or near-magic)
    function generateGrid(sz) {
      if (sz === 3) {
        // Standard 3x3 magic square variation
        const bases = [
          [[2,9,4],[7,5,3],[6,1,8]],
          [[8,3,4],[1,5,9],[6,7,2]],
          [[4,9,2],[3,5,7],[8,1,6]],
          [[8,1,6],[3,5,7],[4,9,2]],
        ];
        return bases[Math.floor(Math.random() * bases.length)];
      } else {
        // 4x4 magic square
        return [
          [1,14,15,4],
          [8,11,10,5],
          [12,7,6,9],
          [13,2,3,16]
        ];
      }
    }

    const solution = generateGrid(size);
    const targetSum = size === 3 ? 15 : 34;

    // Remove cells based on stage difficulty
    const removeCount = Math.min(stage + 3, size * size - 4);
    const grid = solution.map(row => [...row]);
    const cells = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        cells.push({ r, c });

    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    const removed = new Set();
    for (let i = 0; i < removeCount; i++) {
      grid[cells[i].r][cells[i].c] = 0;
      removed.add(`${cells[i].r},${cells[i].c}`);
    }

    const emptyCells = cells.slice(0, removeCount);
    return {
      typeIndex: 4, typeName: 'Math Grid', stage,
      name: `Math Grid — Stage ${stage}`,
      instruction: size === 4
        ? `Fill empty cells (1-${maxVal}) so every row and column sums to ${targetSum}.`
        : `Fill empty cells (1-${maxVal}) so every row and column sums to ${targetSum}.`,
      hint: size === 4 ? 'Rows and columns each use 1-16 exactly once. Look for forced placements.' :
            'Start with the row or column that has the most numbers filled in.',
      init() {
        this.grid = grid;
        this.solution = solution;
        this.targetSum = targetSum;
        this.size = size;
        this.emptyCells = emptyCells;
        this.userValues = {};
        this.emptyCells.forEach(({ r, c }) => { this.userValues[`${r},${c}`] = ''; });
        this.solved = false;
        this.numRange = maxVal;
      },
      checkInput(r, c, val) {
        if (this.solved) return;
        const oldVal = this.userValues[`${r},${c}`];
        if (val === '') {
          this.userValues[`${r},${c}`] = '';
          if (oldVal !== '') app.registerMove();
          this.render(app.boardEl);
          return;
        }
        const n = parseInt(val);
        if (isNaN(n) || n < 1 || n > this.numRange) return;
        if (this.userValues[`${r},${c}`] === n) return;
        app.registerMove();
        this.userValues[`${r},${c}`] = n;
        const allFilled = this.emptyCells.every(({ r: er, c: ec }) => this.userValues[`${er},${ec}`] !== '');
        if (allFilled) {
          const solved = this.emptyCells.every(({ r: er, c: ec }) => this.userValues[`${er},${ec}`] === this.solution[er][ec]);
          if (solved) { this.solved = true; app.onPuzzleSolved(); }
          else {
            app.showFailure('Some numbers are wrong. Check your sums!');
            setTimeout(() => {
              this.userValues = {};
              this.emptyCells.forEach(({ r: er, c: ec }) => { this.userValues[`${er},${ec}`] = ''; });
              this.render(app.boardEl);
            }, 600);
          }
        }
        this.render(app.boardEl);
      },
      render(boardEl) {
        boardEl.innerHTML = '';
        const container = document.createElement('div');
        container.style.textAlign = 'center';
        const targetLabel = document.createElement('div');
        targetLabel.style.cssText = 'color: #ffd200; font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem;';
        targetLabel.textContent = `🎯 Each row & column sums to ${this.targetSum}`;
        container.appendChild(targetLabel);
        const elGrid = document.createElement('div');
        elGrid.className = 'math-grid-container';
        elGrid.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
        elGrid.style.width = `${this.size * 80 + 4}px`;
        const self = this;
        for (let r = 0; r < this.size; r++) {
          for (let c = 0; c < this.size; c++) {
            const cell = document.createElement('div');
            cell.className = 'math-cell';
            if (this.grid[r][c] !== 0) {
              cell.classList.add('given');
              cell.textContent = this.grid[r][c];
            } else {
              const input = document.createElement('input');
              input.type = 'number'; input.min = 1; input.max = this.numRange;
              const uv = this.userValues[`${r},${c}`];
              input.value = uv || '';
              if (uv !== '') input.classList.add(uv === this.solution[r][c] ? 'correct' : 'wrong');
              input.addEventListener('input', (e) => { self.checkInput(r, c, e.target.value); });
              cell.appendChild(input);
            }
            elGrid.appendChild(cell);
          }
        }
        container.appendChild(elGrid);
        if (this.size === 4) {
          const note = document.createElement('div');
          note.style.cssText = 'color: #8888bb; font-size: 0.8rem; margin-top: 0.5rem;';
          note.textContent = 'Use numbers 1-16, each exactly once per row & column';
          container.appendChild(note);
        }
        boardEl.appendChild(container);
      },
      cleanup() {}
    };
  }
});

// ====================================================================
// TYPE 5 — WATER JUG PROBLEM
// ====================================================================
PUZZLE_TYPES.push({
  name: 'Water Jug',
  icon: '💧',
  generateFn(stage) {
    // Generate solvable jug capacities and target using GCD rule
    function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

    const jugSets = [
      // Small easy sets
      { a: 3, b: 5 }, { a: 4, b: 7 },
      // Medium
      { a: 5, b: 8 }, { a: 6, b: 10 },
      // Harder
      { a: 7, b: 11 }, { a: 8, b: 13 }, { a: 5, b: 12 },
    ];

    const set = jugSets[Math.min(stage - 1, jugSets.length - 1)];
    const maxTarget = Math.max(set.a, set.b);
    const g = gcd(set.a, set.b);
    // Target must be a multiple of GCD and <= max capacity
    const possibleTargets = [];
    for (let t = g; t <= maxTarget; t += g) {
      possibleTargets.push(t);
    }
    const target = possibleTargets[Math.min(stage, possibleTargets.length - 1)];

    // Ensure some challenge: target shouldn't be equal to a jug capacity in early stages
    const finalTarget = (stage === 1 && (target === set.a || target === set.b))
      ? Math.max(1, target - g)
      : target;

    const optJugA = finalTarget > set.a ? set.b : set.a;
    const optJugB = finalTarget > set.a ? set.a : set.b;

    return {
      typeIndex: 5, typeName: 'Water Jug', stage,
      name: `Water Jug — Stage ${stage}`,
      instruction: `Measure exactly ${finalTarget} liters using a ${set.a}L and a ${set.b}L jug. Fill, empty, or pour between jugs.`,
      hint: stage >= 5
        ? 'Use the larger jug as your measuring container. Pour from smaller to larger systematically.'
        : stage >= 3
          ? 'Fill one jug, pour into the other. Repeat — the difference is your key.'
          : 'Fill the smaller jug and pour into the larger. Keep the larger jug as your target.',
      init() {
        this.jugA = set.a;
        this.jugB = set.b;
        this.target = finalTarget;
        this.levelA = 0;
        this.levelB = 0;
        this.actionCount = 0;
        this.solved = false;
      },
      // Actions: fillA, fillB, emptyA, emptyB, pourAtoB, pourBtoA
      doAction(action) {
        if (this.solved) return;
        app.registerMove();
        this.actionCount++;

        switch (action) {
          case 'fillA':
            this.levelA = this.jugA;
            break;
          case 'fillB':
            this.levelB = this.jugB;
            break;
          case 'emptyA':
            this.levelA = 0;
            break;
          case 'emptyB':
            this.levelB = 0;
            break;
          case 'pourAtoB': {
            const space = this.jugB - this.levelB;
            const pour = Math.min(this.levelA, space);
            this.levelA -= pour;
            this.levelB += pour;
            break;
          }
          case 'pourBtoA': {
            const space = this.jugA - this.levelA;
            const pour = Math.min(this.levelB, space);
            this.levelB -= pour;
            this.levelA += pour;
            break;
          }
        }
        this.render(app.boardEl);
        if (this.levelA === this.target || this.levelB === this.target) {
          this.solved = true;
          setTimeout(() => app.onPuzzleSolved(), 300);
        }
      },
      render(boardEl) {
        boardEl.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'jug-container';
        container.style.textAlign = 'center';

        // Target display
        const targetEl = document.createElement('div');
        targetEl.style.cssText = 'color: #ffd200; font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem;';
        targetEl.textContent = `🎯 Target: ${this.target} liters`;
        container.appendChild(targetEl);

        // Jugs row
        const jugsRow = document.createElement('div');
        jugsRow.style.cssText = 'display: flex; gap: 30px; justify-content: center; align-items: flex-end; margin-bottom: 1rem;';

        function renderJug(label, capacity, level, color) {
          const jugWrapper = document.createElement('div');
          jugWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 6px;';

          const jug = document.createElement('div');
          jug.style.cssText = `width:70px; height:160px; background:rgba(255,255,255,0.03); border:2px solid rgba(255,255,255,0.2); border-radius:10px 10px 14px 14px; position:relative; overflow:hidden;`;

          // Water fill
          const fillPct = (level / capacity) * 100;
          const water = document.createElement('div');
          water.style.cssText = `position:absolute; bottom:0; left:0; right:0; height:${fillPct}%; background:${color}; border-radius:0 0 12px 12px; transition: height 0.4s ease;`;

          // Water surface ripple
          if (level > 0) {
            const surface = document.createElement('div');
            surface.style.cssText = 'position:absolute; top:0; left:3px; right:3px; height:6px; background:rgba(255,255,255,0.3); border-radius:3px;';
            water.appendChild(surface);
          }
          jug.appendChild(water);

          // Capacity label at bottom
          const capLabel = document.createElement('div');
          capLabel.style.cssText = 'position:absolute; bottom:4px; left:0; right:0; text-align:center; font-size:0.6rem; color:#666;';
          capLabel.textContent = `${capacity}L`;
          jug.appendChild(capLabel);

          // Level label overlay
          const levelLabel = document.createElement('div');
          levelLabel.style.cssText = 'position:absolute; top:50%; left:0; right:0; transform:translateY(-50%); text-align:center; font-size:1.1rem; font-weight:700; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.5);';
          levelLabel.textContent = level > 0 ? `${level}L` : '';
          jug.appendChild(levelLabel);

          jugWrapper.appendChild(jug);

          // Label
          const nameLabel = document.createElement('div');
          nameLabel.style.cssText = 'color:#ccccee; font-size:0.8rem; font-weight:600;';
          nameLabel.textContent = label;
          jugWrapper.appendChild(nameLabel);

          return jugWrapper;
        }

        jugsRow.appendChild(renderJug('Jug A', this.jugA, this.levelA, 'linear-gradient(0deg, #2980b9, #3498db)'));
        jugsRow.appendChild(renderJug('Jug B', this.jugB, this.levelB, 'linear-gradient(0deg, #27ae60, #2ecc71)'));
        container.appendChild(jugsRow);

        // Passed/not passed info
        if (this.solved) {
          const msg = document.createElement('div');
          msg.style.cssText = 'color: #4caf50; font-size: 1.2rem; font-weight: 700; margin-bottom: 0.8rem;';
          msg.textContent = `✅ Got ${this.target}L!`;
          container.appendChild(msg);
        }

        // Action buttons
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; justify-content:center; max-width:360px; margin:0 auto;';

        const btnStyle = 'padding:0.5rem 0.9rem; border-radius:20px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.06); color:#ccccee; cursor:pointer; font-size:0.82rem; font-weight:600; transition:all 0.2s;';
        const btnHover = 'background:rgba(255,255,255,0.15); border-color:rgba(255,255,255,0.4);';
        const self = this;

        function makeBtn(text, action) {
          const b = document.createElement('button');
          b.style.cssText = btnStyle;
          b.textContent = text;
          b.addEventListener('mouseenter', () => { b.style.background = 'rgba(255,255,255,0.15)'; b.style.borderColor = 'rgba(255,255,255,0.4)'; });
          b.addEventListener('mouseleave', () => { b.style.background = 'rgba(255,255,255,0.06)'; b.style.borderColor = 'rgba(255,255,255,0.2)'; });
          b.addEventListener('click', () => self.doAction(action));
          return b;
        }

        actions.appendChild(makeBtn('Fill A', 'fillA'));
        actions.appendChild(makeBtn('Fill B', 'fillB'));
        actions.appendChild(makeBtn('Empty A', 'emptyA'));
        actions.appendChild(makeBtn('Empty B', 'emptyB'));
        actions.appendChild(makeBtn('Pour A → B', 'pourAtoB'));
        actions.appendChild(makeBtn('Pour B → A', 'pourBtoA'));

        container.appendChild(actions);
        boardEl.appendChild(container);
      },
      cleanup() {}
    };
  }
});

// ====================================================================
// TYPE 6 — CIPHER CRACK
// ====================================================================
PUZZLE_TYPES.push({
  name: 'Cipher Crack',
  icon: '🔐',
  generateFn(stage) {
    const cipherWords = [
      'HELLO', 'WORLD', 'SNAKE', 'EAGLE', 'START', 'LEARN', 'SOLVE', 'FINAL',
      'MAVEN', 'ATTACK', 'WORKING', 'MESSAGE', 'SECRET', 'HIDDEN', 'CIPHER',
      'DECODE', 'ENIGMA', 'HACKER', 'PYTHON', 'JAVASCRIPT', 'PROGRAM',
      'ALGORITHM', 'COMPUTER', 'SOFTWARE', 'DEVELOPER', 'FUNCTION',
      'VARIABLE', 'TERMINAL', 'DATABASE', 'NETWORK',
    ];

    const targetLen = Math.min(5 + stage, 10);
    const candidates = cipherWords.filter(w => w.length === targetLen);
    const word = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : cipherWords[Math.floor(Math.random() * cipherWords.length)];

    const shift = 1 + Math.floor(Math.random() * 5);

    function encode(text, s) {
      return text.split('').map(ch => {
        if (ch === ' ') return ' ';
        const code = ch.charCodeAt(0);
        return String.fromCharCode(((code - 65 + s) % 26) + 65);
      }).join('');
    }

    const encoded = encode(word, shift);

    return {
      typeIndex: 6, typeName: 'Cipher Crack', stage,
      name: `Cipher Crack — Stage ${stage}`,
      instruction: `Decode the message shifted by ${shift} positions.`,
      hint: `Each letter is shifted forward by ${shift}. Shift backward by ${shift} to decode.`,
      init() {
        this.data = { encoded, decoded: word, shift };
        this.encoded = encoded;
        this.decoded = word;
        this.shift = shift;
        this.userInput = new Array(this.decoded.length).fill('');
        this.solved = false;
      },
      handleInput(idx, val) {
        if (this.solved) return;
        if (this.decoded[idx] === ' ') { this.render(app.boardEl); return; }
        const upper = val.toUpperCase().replace(/[^A-Z]/g, '');
        this.userInput[idx] = upper;
        this.render(app.boardEl);
        if (upper && idx < this.decoded.length - 1) {
          const inputs = app.boardEl.querySelectorAll('.cipher-input');
          const inputIdx = Array.from(inputs).findIndex(inp => inp.dataset.charIdx == idx);
          if (inputIdx >= 0 && inputs[inputIdx + 1]) inputs[inputIdx + 1].focus();
        }
        const allFilled = this.decoded.split('').every((ch, i) => ch === ' ' || this.userInput[i] !== '');
        if (allFilled) {
          const formed = this.decoded.split('').map((ch, i) => ch === ' ' ? ' ' : this.userInput[i]).join('');
          if (formed === this.decoded) {
            this.solved = true;
            app.onPuzzleSolved();
          } else {
            // Wrong answer — show failure and reset
            app.showFailure('Incorrect! Try again.');
            setTimeout(() => {
              this.userInput = new Array(this.decoded.length).fill('');
              this._hasFocus = false;
              this.render(app.boardEl);
            }, 600);
          }
        }
      },
      render(boardEl) {
        boardEl.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'cipher-container';

        const encodedLabel = document.createElement('div');
        encodedLabel.style.cssText = 'color: #8888bb; margin-bottom: 0.5rem; font-size: 0.9rem;';
        encodedLabel.textContent = '🔐 Encoded message:';
        container.appendChild(encodedLabel);

        const msgRow = document.createElement('div');
        msgRow.className = 'cipher-message';
        this.encoded.split('').forEach(ch => {
          const el = document.createElement('div');
          el.className = 'cipher-char';
          el.textContent = ch;
          msgRow.appendChild(el);
        });
        container.appendChild(msgRow);

        const decodedLabel = document.createElement('div');
        decodedLabel.style.cssText = 'color: #8888bb; margin: 0.8rem 0 0.3rem; font-size: 0.9rem;';
        decodedLabel.textContent = '✏️ Type the decoded message:';
        container.appendChild(decodedLabel);

        const inputRow = document.createElement('div');
        inputRow.className = 'cipher-input-row';
        const self = this;
        this.decoded.split('').forEach((ch, idx) => {
          if (ch === ' ') {
            const spacer = document.createElement('div');
            spacer.style.width = '20px';
            inputRow.appendChild(spacer);
          } else {
            const input = document.createElement('input');
            input.className = 'cipher-input';
            input.type = 'text'; input.maxLength = 1;
            input.dataset.charIdx = idx;
            input.value = this.userInput[idx] || '';
            if (this.solved) input.classList.add('correct');
            input.addEventListener('input', (e) => {
              app.registerMove();
              self.handleInput(idx, e.target.value);
            });
            inputRow.appendChild(input);
          }
        });
        container.appendChild(inputRow);

        const shiftInfo = document.createElement('div');
        shiftInfo.className = 'cipher-shift-info';
        shiftInfo.textContent = `💡 Shift: ${this.shift} positions backward`;
        container.appendChild(shiftInfo);

        boardEl.appendChild(container);
        const first = boardEl.querySelector('.cipher-input');
        if (first && !this._hasFocus) {
          this._hasFocus = true;
          setTimeout(() => first.focus(), 50);
        }
      },
      cleanup() {}
    };
  }
});

// ====================================================================
// TYPE 7 — LIGHT SWITCH GRID
// ====================================================================
PUZZLE_TYPES.push({
  name: 'Light Switch Grid',
  icon: '💡',
  generateFn(stage) {
    const size = stage <= 2 ? 3 : stage <= 5 ? 4 : 5;
    const total = size * size;
    // Start from solved state (all ON) and apply random clicks to scramble
    const scramble = 5 + stage * 3;
    const clicks = [];
    for (let k = 0; k < scramble; k++) {
      clicks.push(Math.floor(Math.random() * total));
    }
    // Compute the initial board from the clicks
    // Each click toggles: self + up + down + left + right (edges drop out)
    const initial = new Array(total).fill(true); // true = ON
    function toggle(idx) {
      initial[idx] = !initial[idx];
      const r = Math.floor(idx / size);
      const c = idx % size;
      if (r > 0) initial[idx - size] = !initial[idx - size];
      if (r < size - 1) initial[idx + size] = !initial[idx + size];
      if (c > 0) initial[idx - 1] = !initial[idx - 1];
      if (c < size - 1) initial[idx + 1] = !initial[idx + 1];
    }
    clicks.forEach(idx => toggle(idx));

    return {
      typeIndex: 7, typeName: 'Light Switch Grid', stage,
      name: `Light Switch Grid — Stage ${stage}`,
      instruction: 'Turn all lights ON by clicking cells. Each click toggles that cell and its 4 neighbors.',
      hint: size >= 5 ? 'Work from the top row downward — click cells below any OFF light in the current row.' :
            'Click cells to toggle them and their neighbors. Find the pattern that lights up the whole board.',
      init() {
        this.size = size;
        this.total = total;
        this.board = [...initial];
        this.moves = 0;
        this.solved = false;
        this.minMoves = scramble;
      },
      pressCell(idx) {
        if (this.solved) return;
        app.registerMove();
        this.moves++;
        this.board[idx] = !this.board[idx];
        const r = Math.floor(idx / this.size);
        const c = idx % this.size;
        if (r > 0) this.board[idx - this.size] = !this.board[idx - this.size];
        if (r < this.size - 1) this.board[idx + this.size] = !this.board[idx + this.size];
        if (c > 0) this.board[idx - 1] = !this.board[idx - 1];
        if (c < this.size - 1) this.board[idx + 1] = !this.board[idx + 1];
        this.render(app.boardEl);
        if (this.board.every(v => v === true)) {
          this.solved = true;
          setTimeout(() => app.onPuzzleSolved(), 300);
        }
      },
      render(boardEl) {
        boardEl.innerHTML = '';
        const container = document.createElement('div');
        container.style.textAlign = 'center';

        const countOn = this.board.filter(v => v).length;
        const info = document.createElement('div');
        info.style.cssText = 'color: #8888bb; font-size: 0.9rem; margin-bottom: 0.8rem;';
        info.textContent = `💡 ${countOn} / ${this.total} lights ON`;
        container.appendChild(info);

        const grid = document.createElement('div');
        grid.className = 'light-grid';
        grid.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
        const cellSize = Math.min(70, Math.floor(320 / this.size));
        grid.style.width = grid.style.height = `${cellSize * this.size + this.size * 4}px`;

        const self = this;
        this.board.forEach((on, idx) => {
          const cell = document.createElement('div');
          cell.className = 'light-cell' + (on ? ' on' : ' off');
          cell.style.width = cell.style.height = `${cellSize}px`;
          cell.style.fontSize = cellSize > 50 ? '1.8rem' : '1.2rem';
          cell.textContent = on ? '💡' : '🌑';
          cell.addEventListener('click', () => self.pressCell(idx));
          grid.appendChild(cell);
        });
        container.appendChild(grid);

        if (this.solved) {
          const msg = document.createElement('div');
          msg.style.cssText = 'color: #4caf50; font-size: 1.2rem; font-weight: 700; margin-top: 0.8rem;';
          msg.textContent = '✅ All lights ON!';
          container.appendChild(msg);
        }

        boardEl.appendChild(container);
      },
      cleanup() {}
    };
  }
});

// ====================================================================
// TYPE 8 — LOGIC LOCK
// ====================================================================
PUZZLE_TYPES.push({
  name: 'Logic Lock',
  icon: '🔓',
  generateFn(stage) {
    const numDials = Math.min(2 + Math.floor((stage + 1) / 2), 6);
    const dialRange = Math.min(3 + Math.floor((stage + 1) / 2), 9);

    return {
      typeIndex: 8, typeName: 'Logic Lock', stage,
      name: `Logic Lock — Stage ${stage}`,
      instruction: `Set each of the ${numDials} dials correctly using the clues below.`,
      hint: numDials >= 5 ? 'Process of elimination. Check each clue against your current values systematically.' :
            numDials >= 3 ? 'Use process of elimination — start with the most informative clue.' :
            'More clues turn green as you get closer!',
      init() {
        this.numDials = numDials;
        this.dialRange = dialRange;
        this.solution = [];
        for (let i = 0; i < this.numDials; i++) {
          this.solution.push(Math.floor(Math.random() * this.dialRange) + 1);
        }
        this.values = new Array(this.numDials).fill(1);
        this.labels = [];
        for (let i = 0; i < this.numDials; i++) {
          this.labels.push(String.fromCharCode(65 + i));
        }
        this.solved = false;

        const sum = this.solution.reduce((a, b) => a + b, 0);
        this.clues = [
          { text: `The sum of all dials is ${sum}`, check: (vals) => vals.reduce((a, b) => a + b, 0) === sum },
        ];
        // Individual position clues
        this.labels.forEach((label, idx) => {
          const val = this.solution[idx];
          const desc = val <= 2 ? 'low' : val >= this.dialRange - 1 ? 'high' : 'mid-range';
          this.clues.push({
            text: `Dial ${label} is ${desc}`,
            check: (vals) => vals[idx] === val
          });
        });
        // Product clue for 3+ dials
        if (this.numDials >= 3) {
          const prod = this.solution[0] * this.solution[1];
          this.clues.push({
            text: `Dial A × Dial B = ${prod}`,
            check: (vals) => vals[0] * vals[1] === prod
          });
        }
        // Additional relationship clue for 4+ dials
        if (this.numDials >= 4) {
          const diff = Math.abs(this.solution[2] - this.solution[3]);
          this.clues.push({
            text: `Dial C and Dial D differ by ${diff}`,
            check: (vals) => Math.abs(vals[2] - vals[3]) === diff
          });
        }
      },
      adjust(dialIdx, delta) {
        if (this.solved) return;
        app.registerMove();
        this.values[dialIdx] = Math.max(1, Math.min(this.dialRange, this.values[dialIdx] + delta));
        this.render(app.boardEl);
        if (this.values.every((v, i) => v === this.solution[i])) {
          this.solved = true;
          setTimeout(() => app.onPuzzleSolved(), 400);
        }
      },
      render(boardEl) {
        boardEl.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'lock-container';
        const dialsRow = document.createElement('div');
        dialsRow.className = 'lock-dials';
        const self = this;
        this.labels.forEach((label, idx) => {
          const dial = document.createElement('div');
          dial.className = 'lock-dial';
          const lbl = document.createElement('label');
          lbl.textContent = `Dial ${label}`;
          dial.appendChild(lbl);
          const controls = document.createElement('div');
          controls.className = 'lock-dial-controls';
          const up = document.createElement('div');
          up.className = 'lock-arrow'; up.textContent = '▲';
          up.addEventListener('click', () => self.adjust(idx, 1));
          controls.appendChild(up);
          const val = document.createElement('div');
          val.className = 'lock-value' + (this.values[idx] === this.solution[idx] ? ' correct' : '');
          val.textContent = this.values[idx];
          controls.appendChild(val);
          const down = document.createElement('div');
          down.className = 'lock-arrow'; down.textContent = '▼';
          down.addEventListener('click', () => self.adjust(idx, -1));
          controls.appendChild(down);
          dial.appendChild(controls);
          dialsRow.appendChild(dial);
        });
        container.appendChild(dialsRow);
        if (this.solved) {
          const solvedMsg = document.createElement('div');
          solvedMsg.style.cssText = 'color: #4caf50; font-size: 1.3rem; font-weight: 700; margin-top: 0.5rem;';
          solvedMsg.textContent = '🔓 Unlocked!';
          container.appendChild(solvedMsg);
        }
        const cluesDiv = document.createElement('div');
        cluesDiv.className = 'lock-clues';
        this.clues.forEach((clue, idx) => {
          const p = document.createElement('div');
          p.className = 'lock-clue' + (clue.check(this.values) ? ' solved' : '');
          p.textContent = `📌 ${clue.text}`;
          p.style.animationDelay = `${idx * 0.1}s`;
          p.classList.add('fade-in-up');
          cluesDiv.appendChild(p);
        });
        container.appendChild(cluesDiv);
        boardEl.appendChild(container);
      },
      cleanup() {}
    };
  }
});

// Pre-generate stage 1 for all types
preGenerateStage1();
