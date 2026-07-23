// ==============================
// Web Audio API Synthesizer for Media Art FX
// ==============================
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isEnabled = true;
    this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00]; // Pentatonic C Major
  }

  initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  getEnabled() {
    return this.isEnabled;
  }

  // Soft tone when block falls/lands
  playDropTone(columnRatio, volume = 0.05) {
    if (!this.isEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const noteIdx = Math.floor(columnRatio * (this.scale.length - 1));
      const freq = this.scale[Math.max(0, Math.min(this.scale.length - 1, noteIdx))];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch {
      // Ignore audio errors
    }
  }

  // Granular shuffle sound effect when user drags over stacked blocks
  playShuffleSound(intensity = 0.5) {
    if (!this.isEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Random frequency in pentatonic range
      const randomFreq = this.scale[Math.floor(Math.random() * this.scale.length)] * (1 + (Math.random() - 0.5) * 0.2);
      osc.type = Math.random() > 0.5 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(randomFreq, now);

      const vol = Math.min(0.08, 0.02 + intensity * 0.04);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.09);
    } catch {
      // Ignore
    }
  }

  // Clear canvas sweep sound
  playClearSound() {
    if (!this.isEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.45);
    } catch {
      // Ignore
    }
  }
}

const audioEngine = new AudioEngine();

// ==============================
// Canvas Manager - Pure HTML5 Canvas & JS Media Art Engine
// ==============================
class CanvasManager {
  constructor(canvas) {
    this.canvas = canvas;
    const context = this.canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    // Grid Data Structure
    // stackedGrid[col] = Array of GridCell from bottom (index 0) going upwards
    this.stackedGrid = [];
    this.cols = 0;
    this.rows = 0;

    // Active Falling Blocks
    this.fallingBlocks = [];
    this.nextBlockId = 1;

    // Settings & Palette
    this.settings = {
      blockSize: 4,
      fallSpeed: 14,
      autoStream: false,
      soundEnabled: true,
      brushRadius: 40,
      paletteName: 'Cyber Neon',
    };

    this.currentColor = {
      id: 'cyan',
      name: 'Cyber Cyan',
      hex: '#00F0FF',
      glow: 'rgba(0, 240, 255, 0.6)',
    };

    // Emitter Drop Position State
    this.emitterXRatio = 0.5; // 0.0 to 1.0 across full screen width
    this.isDraggingEmitter = false;
    this.onEmitterPositionChange = undefined;

    // Drag state
    this.isPointerDown = false;
    this.pointerX = -1000;
    this.pointerY = -1000;
    this.isHoveringStacked = false;
    this.dragParticleEffects = [];

    // Stream timing
    this.lastAutoStreamTime = 0;
    this.animationFrameId = 0;
    this.lastToneTime = 0;

    // Stats
    this.onStatsUpdate = undefined;

    // Background image (user-loaded)
    this.backgroundImage = null;

    this.initCanvas();
    this.bindEvents();
    this.startLoop();
  }

  initCanvas() {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);
    this.rebuildGrid();
  }

  rebuildGrid() {
    const bs = this.settings.blockSize;
    const oldCols = this.cols;
    const oldGrid = this.stackedGrid;

    this.cols = Math.ceil(this.width / bs);
    this.rows = Math.ceil(this.height / bs);

    this.stackedGrid = [];
    for (let c = 0; c < this.cols; c++) {
      this.stackedGrid[c] = [];
      // If resizing, transfer previous stacked blocks if available
      if (oldGrid && c < oldCols && oldGrid[c]) {
        this.stackedGrid[c] = oldGrid[c].filter(Boolean);
      }
    }
  }

  setBlockSize(size) {
    if (this.settings.blockSize === size) return;
    this.settings.blockSize = size;
    this.rebuildGrid();
  }

  setSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }

  setCurrentColor(color) {
    this.currentColor = color;
  }

  getCurrentColor() {
    return this.currentColor;
  }

  setBackgroundImage(img) {
    this.backgroundImage = img;
  }

  clearBackgroundImage() {
    this.backgroundImage = null;
  }

  setEmitterXRatio(ratio) {
    this.emitterXRatio = Math.max(0.02, Math.min(0.98, ratio));
    if (this.onEmitterPositionChange) {
      this.onEmitterPositionChange(this.emitterXRatio);
    }
  }

  getEmitterXRatio() {
    return this.emitterXRatio;
  }

  // Trigger drop motion from current moveable emitter location
  triggerDrop(color, count = 20) {
    const activeColor = color || this.currentColor;
    const bs = this.settings.blockSize;
    const targetCol = Math.floor(this.cols * this.emitterXRatio);

    for (let i = 0; i < count; i++) {
      // Single spout with slight micro-variance around emitter location
      const colOffset = Math.floor((Math.random() - 0.5) * 3); // -1, 0, or 1
      const c = Math.max(0, Math.min(this.cols - 1, targetCol + colOffset));

      const startY = -i * (bs * 1.2) - Math.random() * 10 - bs;

      this.fallingBlocks.push({
        id: this.nextBlockId++,
        col: c,
        x: c * bs,
        y: startY,
        targetY: 0,
        vy: this.settings.fallSpeed * (0.85 + Math.random() * 0.3),
        color: activeColor.hex,
        glowColor: activeColor.glow,
        size: bs,
        isStacked: false,
        alpha: 1.0,
        creationTime: performance.now(),
      });
    }

    if (this.settings.soundEnabled) {
      audioEngine.playDropTone(this.emitterXRatio, 0.08);
    }
  }

  // Spawn concentrated waterfall stream from specific X
  triggerStreamAtX(x, widthPx = 80) {
    const bs = this.settings.blockSize;
    const centerCol = Math.floor(x / bs);
    const radiusCols = Math.ceil(widthPx / (2 * bs));

    const minC = Math.max(0, centerCol - radiusCols);
    const maxC = Math.min(this.cols - 1, centerCol + radiusCols);

    for (let c = minC; c <= maxC; c++) {
      if (Math.random() > 0.3) {
        const stack = this.stackedGrid[c] || [];
        const targetY = this.height - (stack.length + 1) * bs;
        if (targetY < 0) continue;

        this.fallingBlocks.push({
          id: this.nextBlockId++,
          col: c,
          x: c * bs,
          y: -Math.random() * 15 - bs,
          targetY,
          vy: this.settings.fallSpeed * (0.9 + Math.random() * 0.2),
          color: this.currentColor.hex,
          glowColor: this.currentColor.glow,
          size: bs,
          isStacked: false,
          alpha: 1.0,
          creationTime: performance.now(),
        });
      }
    }
  }

  // Clear all stacked and falling blocks
  clearCanvas() {
    this.fallingBlocks = [];
    for (let c = 0; c < this.cols; c++) {
      this.stackedGrid[c] = [];
    }
    this.dragParticleEffects = [];
    if (this.settings.soundEnabled) {
      audioEngine.playClearSound();
    }
  }

  // Randomize all existing stacked blocks instantly
  shuffleAllStacked() {
    const allCells = [];
    for (let c = 0; c < this.cols; c++) {
      const colArr = this.stackedGrid[c];
      for (let r = 0; r < colArr.length; r++) {
        if (colArr[r]) {
          allCells.push(colArr[r]);
        }
      }
    }

    // Fisher-Yates shuffle
    for (let i = allCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
    }

    // Repopulate
    let idx = 0;
    for (let c = 0; c < this.cols; c++) {
      const colLen = this.stackedGrid[c].length;
      for (let r = 0; r < colLen; r++) {
        if (idx < allCells.length) {
          this.stackedGrid[c][r] = allCells[idx++];
        }
      }
    }

    if (this.settings.soundEnabled) {
      audioEngine.playShuffleSound(1.0);
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.initCanvas();
    });

    const updatePointer = (clientX, clientY) => {
      this.pointerX = clientX;
      this.pointerY = clientY;
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      updatePointer(e.clientX, e.clientY);

      const bs = this.settings.blockSize;
      const emitterCol = Math.floor(this.cols * this.emitterXRatio);
      const emitterX = emitterCol * bs + bs / 2;

      // Check if clicking near top emitter nozzle or top bar
      if (e.clientY <= 90 || Math.abs(e.clientX - emitterX) < 60) {
        this.isDraggingEmitter = true;
        this.setEmitterXRatio(e.clientX / this.width);
      } else {
        this.handleDragShuffle();
      }
    });

    window.addEventListener('pointermove', (e) => {
      updatePointer(e.clientX, e.clientY);

      if (this.isDraggingEmitter) {
        this.setEmitterXRatio(e.clientX / this.width);
      } else if (this.isPointerDown) {
        this.handleDragShuffle();
      } else {
        this.checkHoverStacked();

        // Update cursor style
        const bs = this.settings.blockSize;
        const emitterCol = Math.floor(this.cols * this.emitterXRatio);
        const emitterX = emitterCol * bs + bs / 2;
        if (e.clientY <= 90 || Math.abs(e.clientX - emitterX) < 50) {
          this.canvas.style.cursor = 'ew-resize';
        } else {
          this.canvas.style.cursor = 'crosshair';
        }
      }
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
      this.isDraggingEmitter = false;
    });

    window.addEventListener('pointercancel', () => {
      this.isPointerDown = false;
      this.isDraggingEmitter = false;
    });
  }

  checkHoverStacked() {
    const bs = this.settings.blockSize;
    const col = Math.floor(this.pointerX / bs);
    if (col >= 0 && col < this.cols) {
      const stackHeight = this.stackedGrid[col]?.length || 0;
      const topY = this.height - stackHeight * bs;
      this.isHoveringStacked = this.pointerY >= topY - 10 && stackHeight > 0;
    } else {
      this.isHoveringStacked = false;
    }
  }

  // DRAG SHUFFLING ENGINE (드래그 시 해당 블럭들의 위치가 랜덤하게 섞임)
  handleDragShuffle() {
    if (this.pointerX < 0 || this.pointerY < 0) return;

    const bs = this.settings.blockSize;
    const radius = this.settings.brushRadius;
    const radiusSq = radius * radius;

    // Identify all grid coordinates (col, row) within radius of pointer
    const centerCol = Math.floor(this.pointerX / bs);
    const colRadius = Math.ceil(radius / bs);

    const targetCoords = [];

    const minC = Math.max(0, centerCol - colRadius);
    const maxC = Math.min(this.cols - 1, centerCol + colRadius);

    for (let c = minC; c <= maxC; c++) {
      const stack = this.stackedGrid[c];
      if (!stack || stack.length === 0) continue;

      for (let r = 0; r < stack.length; r++) {
        const cell = stack[r];
        if (!cell) continue;

        // Cell pixel coordinates
        const cellX = c * bs + bs / 2;
        const cellY = this.height - (r + 1) * bs + bs / 2;

        const dx = cellX - this.pointerX;
        const dy = cellY - this.pointerY;

        if (dx * dx + dy * dy <= radiusSq) {
          targetCoords.push({ col: c, row: r, cell });
        }
      }
    }

    if (targetCoords.length > 1) {
      // Extract cells
      const cellsToShuffle = targetCoords.map((item) => item.cell);

      // Fisher-Yates shuffle
      for (let i = cellsToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cellsToShuffle[i], cellsToShuffle[j]] = [cellsToShuffle[j], cellsToShuffle[i]];
      }

      // Reassign shuffled cells back to coordinates
      for (let i = 0; i < targetCoords.length; i++) {
        const { col, row } = targetCoords[i];
        this.stackedGrid[col][row] = cellsToShuffle[i];
      }

      // Spawn media art particle sparks on drag shuffle
      const sampleCount = Math.min(6, targetCoords.length);
      for (let i = 0; i < sampleCount; i++) {
        const p = targetCoords[Math.floor(Math.random() * targetCoords.length)];
        const px = p.col * bs;
        const py = this.height - (p.row + 1) * bs;
        this.dragParticleEffects.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          color: p.cell.color,
          alpha: 1.0,
          size: Math.max(2, bs * 0.8),
        });
      }

      // Sound FX
      if (this.settings.soundEnabled) {
        audioEngine.playShuffleSound(Math.min(1.0, targetCoords.length / 30));
      }
    }
  }

  update() {
    const bs = this.settings.blockSize;
    const now = performance.now();

    // 1. Auto Stream check
    if (this.settings.autoStream && now - this.lastAutoStreamTime > 50) {
      this.triggerDrop(undefined, 2);
      this.lastAutoStreamTime = now;
    }

    // 2. Update Falling Blocks (Mountain / Pyramid Stacking Physics)
    const remainingFalling = [];
    for (let i = 0; i < this.fallingBlocks.length; i++) {
      const b = this.fallingBlocks[i];

      b.y += b.vy;

      // Re-evaluate targetY based on current stack count in b.col
      const colStackLen = this.stackedGrid[b.col]?.length || 0;
      const targetY = this.height - (colStackLen + 1) * bs;

      // Stacking / Landing condition reached
      if (b.y >= targetY) {
        // Mountain Slope check: Does left or right column have a lower stack height?
        const leftCol = b.col - 1;
        const rightCol = b.col + 1;

        const leftLen = leftCol >= 0 ? (this.stackedGrid[leftCol]?.length || 0) : Infinity;
        const rightLen = rightCol < this.cols ? (this.stackedGrid[rightCol]?.length || 0) : Infinity;

        const leftLower = leftLen < colStackLen;
        const rightLower = rightLen < colStackLen;

        if (leftLower || rightLower) {
          // Slide block down the mountain slope to the lower adjacent column
          let slideCol = b.col;
          if (leftLower && rightLower) {
            if (leftLen < rightLen) slideCol = leftCol;
            else if (rightLen < leftLen) slideCol = rightCol;
            else slideCol = Math.random() < 0.5 ? leftCol : rightCol;
          } else if (leftLower) {
            slideCol = leftCol;
          } else {
            slideCol = rightCol;
          }

          b.col = slideCol;
          b.x = slideCol * bs;
          // Keep block falling until it lands on a stable level
          b.y = Math.min(b.y, this.height - colStackLen * bs);
          remainingFalling.push(b);
        } else {
          // Stable position reached! Settle block on top of b.col
          b.y = Math.max(0, targetY);
          b.isStacked = true;

          if (!this.stackedGrid[b.col]) {
            this.stackedGrid[b.col] = [];
          }
          this.stackedGrid[b.col].push({
            color: b.color,
            glowColor: b.glowColor,
            size: b.size,
            id: b.id,
            creationTime: now,
          });

          // Soft audio feedback
          if (this.settings.soundEnabled && now - this.lastToneTime > 40) {
            audioEngine.playDropTone(b.col / this.cols, 0.03);
            this.lastToneTime = now;
          }
        }
      } else {
        remainingFalling.push(b);
      }
    }
    this.fallingBlocks = remainingFalling;

    // 3. Update Drag Particles
    for (let i = this.dragParticleEffects.length - 1; i >= 0; i--) {
      const p = this.dragParticleEffects[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.04;
      if (p.alpha <= 0) {
        this.dragParticleEffects.splice(i, 1);
      }
    }

    // 4. Calculate Stats
    if (this.onStatsUpdate && Math.random() < 0.2) {
      let stackedCount = 0;
      let maxHeight = 0;
      for (let c = 0; c < this.cols; c++) {
        const len = this.stackedGrid[c]?.length || 0;
        stackedCount += len;
        if (len > maxHeight) maxHeight = len;
      }
      const heightPercent = Math.min(100, Math.round((maxHeight * bs / this.height) * 100));
      this.onStatsUpdate(stackedCount, this.fallingBlocks.length, heightPercent);
    }
  }

  render() {
    const bs = this.settings.blockSize;

    // Dark sleek background (or user-loaded image, cropped to cover the canvas)
    this.ctx.fillStyle = '#08090d';
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.backgroundImage) {
      const img = this.backgroundImage;
      const scale = Math.max(this.width / img.width, this.height / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const dx = (this.width - drawW) / 2;
      const dy = (this.height - drawH) / 2;
      this.ctx.drawImage(img, dx, dy, drawW, drawH);
    }

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    this.ctx.lineWidth = 1;

    // 1. Render Stacked Blocks
    for (let c = 0; c < this.cols; c++) {
      const stack = this.stackedGrid[c];
      if (!stack) continue;

      const px = c * bs;
      for (let r = 0; r < stack.length; r++) {
        const cell = stack[r];
        if (!cell) continue;

        const py = this.height - (r + 1) * bs;

        this.ctx.fillStyle = cell.color;
        this.ctx.fillRect(px, py, bs, bs);

        // Optional micro seam for block definition if block size > 2
        if (bs >= 6) {
          this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
          this.ctx.fillRect(px, py + bs - 1, bs, 1);
          this.ctx.fillRect(px + bs - 1, py, 1, bs);
        }
      }
    }

    // 2. Render Falling Blocks with glowing motion trail
    for (let i = 0; i < this.fallingBlocks.length; i++) {
      const b = this.fallingBlocks[i];

      // Motion trail
      if (bs >= 2) {
        const trailHeight = Math.min(25, b.vy * 1.8);
        const grad = this.ctx.createLinearGradient(b.x, b.y - trailHeight, b.x, b.y + bs);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, b.color);

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(b.x, Math.max(0, b.y - trailHeight), bs, trailHeight + bs);
      }

      // Main Block head
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(b.x, b.y, bs, bs);
      this.ctx.fillStyle = b.color;
      this.ctx.fillRect(b.x, b.y, bs, bs);
    }

    // 3. Render Drag Sparkle Particles
    for (let i = 0; i < this.dragParticleEffects.length; i++) {
      const p = this.dragParticleEffects[i];
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, p.size, p.size);
      this.ctx.restore();
    }

    // 4. Render Drag Pointer Circle / Brush Indicator when hovering or dragging
    if (this.pointerX >= 0 && this.pointerY >= 0) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(this.pointerX, this.pointerY, this.settings.brushRadius, 0, Math.PI * 2);
      this.ctx.lineWidth = 1.5;

      if (this.isPointerDown) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        this.ctx.fill();
      } else if (this.isHoveringStacked) {
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
        this.ctx.setLineDash([4, 4]);
      } else {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      }
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 5. Render Movable Drop Emitter Indicator (drawn last so it stays above falling blocks)
    const emitterCol = Math.floor(this.cols * this.emitterXRatio);
    const emitterX = emitterCol * bs + bs / 2;
    this.ctx.save();

    // Glowing laser beam guide
    const beamGrad = this.ctx.createLinearGradient(emitterX, 0, emitterX, 80);
    beamGrad.addColorStop(0, this.currentColor.glow);
    beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = beamGrad;
    this.ctx.fillRect(emitterX - 16, 0, 32, 80);

    // Emitter Nozzle Body
    const isHoveredOrDragged = this.isDraggingEmitter || (Math.abs(this.pointerX - emitterX) < 65 && this.pointerY < 80);
    this.ctx.fillStyle = isHoveredOrDragged ? '#ffffff' : this.currentColor.hex;
    this.ctx.shadowColor = this.currentColor.hex;
    this.ctx.shadowBlur = isHoveredOrDragged ? 20 : 12;

    // Nozzle bar at top
    this.ctx.fillRect(emitterX - 36, 0, 72, 16);
    this.ctx.fillRect(emitterX - 20, 16, 40, 16);

    // Movable Handle Label
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = '600 11px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText('◀ MOVE SPOUT ▶', emitterX, 60);

    this.ctx.restore();
  }

  startLoop() {
    const loop = () => {
      this.update();
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

// ==============================
// UI Overlay & Controls
// ==============================
const COLOR_PALETTES = {
  'Cyber Neon': [
    { id: 'cyan', name: 'Cyber Cyan', hex: '#00F0FF', glow: 'rgba(0, 240, 255, 0.6)' },
    { id: 'magenta', name: 'Electric Magenta', hex: '#FF007F', glow: 'rgba(255, 0, 127, 0.6)' },
    { id: 'yellow', name: 'Neon Yellow', hex: '#FFE600', glow: 'rgba(255, 230, 0, 0.6)' },
    { id: 'green', name: 'Acid Green', hex: '#00FF66', glow: 'rgba(0, 255, 102, 0.6)' },
    { id: 'violet', name: 'Royal Violet', hex: '#9933FF', glow: 'rgba(153, 51, 255, 0.6)' },
    { id: 'orange', name: 'Flame Orange', hex: '#FF5500', glow: 'rgba(255, 85, 0, 0.6)' },
    { id: 'white', name: 'Pure White', hex: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.6)' },
  ],
  'Sunset Glow': [
    { id: 'sun1', name: 'Crimson Rose', hex: '#FF2A6D', glow: 'rgba(255, 42, 109, 0.6)' },
    { id: 'sun2', name: 'Coral Amber', hex: '#FF7E5F', glow: 'rgba(255, 126, 95, 0.6)' },
    { id: 'sun3', name: 'Golden Sun', hex: '#FEB47B', glow: 'rgba(254, 180, 123, 0.6)' },
    { id: 'sun4', name: 'Deep Purple', hex: '#6C5CE7', glow: 'rgba(108, 92, 231, 0.6)' },
    { id: 'sun5', name: 'Hot Pink', hex: '#FD79A8', glow: 'rgba(253, 121, 168, 0.6)' },
  ],
  'Pastel Dream': [
    { id: 'pas1', name: 'Mint Fresh', hex: '#55E6C1', glow: 'rgba(85, 230, 193, 0.6)' },
    { id: 'pas2', name: 'Soft Azure', hex: '#70A1FF', glow: 'rgba(112, 161, 255, 0.6)' },
    { id: 'pas3', name: 'Peach Cream', hex: '#FF70A6', glow: 'rgba(255, 112, 166, 0.6)' },
    { id: 'pas4', name: 'Lemon Milk', hex: '#FFD97D', glow: 'rgba(255, 217, 125, 0.6)' },
    { id: 'pas5', name: 'Lavender Wave', hex: '#A29BFE', glow: 'rgba(162, 155, 254, 0.6)' },
  ],
};

class UIController {
  constructor(canvasManager) {
    this.canvasManager = canvasManager;
    this.activePaletteKey = 'Cyber Neon';
    this.autoStreamActive = false;

    this.container = document.createElement('div');
    this.container.className = 'ui-overlay';
    document.body.appendChild(this.container);

    this.renderUI();
  }

  renderUI() {
    this.container.innerHTML = `
      <div class="header-bar">
        <div class="title-section">
          <span class="badge">MEDIA ART</span>
        </div>
        <div class="stats-badge" id="statsDisplay">
          Stacked: <b id="statStacked">0</b> | Height: <b id="statHeight">0%</b>
        </div>
      </div>

      <div class="controls-panel">
        <div class="panel-section">
          <div class="section-label">SELECT COLOR</div>
          <div class="palette-spectrum-container">
            <div class="spectrum-bar" id="spectrumBar" title="스펙트럼 파레트를 클릭하거나 드래그하여 색상 선택">
              <div class="spectrum-thumb" id="spectrumThumb"></div>
            </div>
            <div class="color-preview-badge" id="colorPreviewBadge" style="background-color: #00F0FF;">
              <span id="colorHexLabel">#00F0FF</span>
              <input type="color" id="customColorPicker" value="#00F0FF" title="직접 색상 선택" />
            </div>
          </div>
        </div>

        <div class="panel-section actions-section">
          <button id="btnPushDrop" class="action-btn push-btn" title="설정한 색상의 블럭 강하">
            <span class="btn-icon">⬇️</span><span class="btn-label">1회</span>
          </button>
          <button id="btnAutoStream" class="action-btn toggle-btn" title="연속 낙하 켜기/끄기">
            <span class="btn-icon">🌊</span><span class="btn-label" id="autoStreamLabel">연속</span>
          </button>
          <button id="btnShuffleAll" class="action-btn" title="쌓인 블럭 섞기">
            <span class="btn-icon">🔀</span><span class="btn-label">섞기</span>
          </button>
          <button id="btnClear" class="action-btn danger" title="전체 초기화">
            <span class="btn-icon">🗑️</span><span class="btn-label">다시하기</span>
          </button>
          <button id="btnSoundToggle" class="action-btn icon-only" title="Toggle Sound">
            🔊
          </button>
          <button id="btnBgImage" class="action-btn" title="로컬 이미지를 배경으로 불러오기">
            <span class="btn-icon">🖼️</span><span class="btn-label">배경</span>
          </button>
          <button id="btnBgImageClear" class="action-btn" title="배경 이미지 지우기">
            <span class="btn-icon">🚫</span><span class="btn-label">배경 지우기</span>
          </button>
          <input type="file" id="bgImageInput" accept="image/*" style="display:none" />
        </div>
      </div>

      <button id="btnPanelToggle" class="panel-toggle-btn" title="설정 패널 열기/닫기">☰</button>

    `;

    this.setupColorButtons();
    this.setupPresets();
    this.setupPositionControl();
    this.setupSizeButtons();
    this.setupActions();
    this.setupBackgroundImage();
    this.setupStats();
    this.setupPanelToggle();
  }

  setupColorButtons() {
    const grid = this.container.querySelector('#colorButtonsGrid');
    if (grid) {
      grid.innerHTML = '';
    }

    const currentPalette = COLOR_PALETTES[this.activePaletteKey] || COLOR_PALETTES['Cyber Neon'];
    const activeColor = this.canvasManager.getCurrentColor();

    const previewBadge = this.container.querySelector('#colorPreviewBadge');
    const hexLabel = this.container.querySelector('#colorHexLabel');
    const customPicker = this.container.querySelector('#customColorPicker');
    const spectrumBar = this.container.querySelector('#spectrumBar');
    const spectrumThumb = this.container.querySelector('#spectrumThumb');

    const updateActiveColorUI = (opt) => {
      if (previewBadge) previewBadge.style.backgroundColor = opt.hex;
      if (hexLabel) hexLabel.innerText = opt.hex.toUpperCase();
      if (customPicker) customPicker.value = opt.hex;
    };

    updateActiveColorUI(activeColor);

    if (grid) {
      currentPalette.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = `color-btn ${opt.hex.toLowerCase() === activeColor.hex.toLowerCase() ? 'active' : ''}`;
        btn.style.backgroundColor = opt.hex;
        btn.style.boxShadow = `0 0 12px ${opt.glow}`;
        btn.title = `${opt.name} (${opt.hex}) - 색상 선택`;

        btn.addEventListener('click', () => {
          this.container.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          this.canvasManager.setCurrentColor(opt);
          updateActiveColorUI(opt);
        });

        grid.appendChild(btn);
      });
    }

    // Helper to calculate color from HSL hue (0 to 360) across spectrum bar
    const getColorFromSpectrumRatio = (ratio) => {
      const hue = Math.round(ratio * 360);
      const hex = this.hslToHex(hue, 100, 50);
      return {
        id: `hsl-${hue}`,
        name: `Hue ${hue}°`,
        hex,
        glow: `${hex}88`,
      };
    };

    let isDraggingSpectrum = false;

    const handleSpectrumSelect = (e) => {
      if (!spectrumBar) return;
      const rect = spectrumBar.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

      if (spectrumThumb) {
        spectrumThumb.style.left = `${ratio * 100}%`;
      }

      const opt = getColorFromSpectrumRatio(ratio);
      this.container.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('active'));
      this.canvasManager.setCurrentColor(opt);
      updateActiveColorUI(opt);
    };

    if (spectrumBar) {
      spectrumBar.addEventListener('pointerdown', (e) => {
        isDraggingSpectrum = true;
        handleSpectrumSelect(e);
      });

      window.addEventListener('pointermove', (e) => {
        if (isDraggingSpectrum) {
          handleSpectrumSelect(e);
        }
      });

      window.addEventListener('pointerup', () => {
        isDraggingSpectrum = false;
      });
    }

    if (customPicker) {
      customPicker.addEventListener('change', (e) => {
        const hex = e.target.value;
        const customOpt = {
          id: 'custom',
          name: 'Custom',
          hex,
          glow: `${hex}aa`,
        };
        this.container.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('active'));
        this.canvasManager.setCurrentColor(customOpt);
        updateActiveColorUI(customOpt);
      });
    }
  }

  // Convert HSL to Hex helper
  hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  setupPresets() {
    const presetContainer = this.container.querySelector('#presetButtons');
    if (!presetContainer) return;
    presetContainer.innerHTML = '';

    Object.keys(COLOR_PALETTES).forEach((pKey) => {
      const btn = document.createElement('button');
      btn.className = `preset-btn ${pKey === this.activePaletteKey ? 'active' : ''}`;
      btn.innerText = pKey;

      btn.addEventListener('click', () => {
        this.activePaletteKey = pKey;
        this.setupPresets();
        this.setupColorButtons();

        // Auto select first color in preset
        const firstColor = COLOR_PALETTES[pKey][0];
        if (firstColor) {
          this.canvasManager.setCurrentColor(firstColor);
        }
      });

      presetContainer.appendChild(btn);
    });
  }

  setupPositionControl() {
    const slider = this.container.querySelector('#emitterSlider');
    const posButtons = this.container.querySelectorAll('.pos-btn');

    const updateUIFromRatio = (ratio) => {
      if (slider) {
        slider.value = Math.round(ratio * 100).toString();
      }
      posButtons.forEach((btn) => {
        const btnRatio = parseFloat(btn.getAttribute('data-pos') || '0.5');
        if (Math.abs(btnRatio - ratio) < 0.08) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    };

    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        this.canvasManager.setEmitterXRatio(val);
      });
    }

    posButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const posRatio = parseFloat(btn.getAttribute('data-pos') || '0.5');
        this.canvasManager.setEmitterXRatio(posRatio);
        updateUIFromRatio(posRatio);
      });
    });

    // Sync when user drags emitter nozzle directly on canvas
    this.canvasManager.onEmitterPositionChange = (ratio) => {
      updateUIFromRatio(ratio);
    };
  }

  setupSizeButtons() {
    const buttons = this.container.querySelectorAll('.size-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const sz = parseInt(btn.getAttribute('data-size') || '4', 10);
        this.canvasManager.setBlockSize(sz);
      });
    });
  }

  setupActions() {
    const btnPush = this.container.querySelector('#btnPushDrop');
    if (btnPush) {
      btnPush.addEventListener('click', () => {
        this.canvasManager.triggerDrop();
      });
    }

    const btnAuto = this.container.querySelector('#btnAutoStream');
    const labelAuto = this.container.querySelector('#autoStreamLabel');

    btnAuto.addEventListener('click', () => {
      this.autoStreamActive = !this.autoStreamActive;
      this.canvasManager.setSettings({ autoStream: this.autoStreamActive });

      if (this.autoStreamActive) {
        btnAuto.classList.add('active');
        labelAuto.innerText = '연속';
      } else {
        btnAuto.classList.remove('active');
        labelAuto.innerText = '연속꺼짐';
      }
    });

    const btnShuffle = this.container.querySelector('#btnShuffleAll');
    btnShuffle.addEventListener('click', () => {
      this.canvasManager.shuffleAllStacked();
    });

    const btnClear = this.container.querySelector('#btnClear');
    btnClear.addEventListener('click', () => {
      this.canvasManager.clearCanvas();
    });

    const btnSound = this.container.querySelector('#btnSoundToggle');
    btnSound.addEventListener('click', () => {
      const enabled = audioEngine.getEnabled();
      audioEngine.setEnabled(!enabled);
      btnSound.innerText = !enabled ? '🔊' : '🔇';
      btnSound.style.opacity = !enabled ? '1' : '0.5';
    });
  }

  setupBackgroundImage() {
    const btnLoad = this.container.querySelector('#btnBgImage');
    const btnClear = this.container.querySelector('#btnBgImageClear');
    const fileInput = this.container.querySelector('#bgImageInput');

    btnLoad.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          this.canvasManager.setBackgroundImage(img);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);

      fileInput.value = '';
    });

    btnClear.addEventListener('click', () => {
      this.canvasManager.clearBackgroundImage();
    });
  }

  setupPanelToggle() {
    const toggleBtn = this.container.querySelector('#btnPanelToggle');
    const panel = this.container.querySelector('.controls-panel');
    if (!toggleBtn || !panel) return;

    // Starts collapsed; has no visual effect on desktop (rule only applies under the mobile breakpoint)
    panel.classList.add('panel-collapsed');

    toggleBtn.addEventListener('click', () => {
      const isCollapsed = panel.classList.toggle('panel-collapsed');
      toggleBtn.textContent = isCollapsed ? '☰' : '✕';
    });
  }

  setupStats() {
    const statStacked = this.container.querySelector('#statStacked');
    const statHeight = this.container.querySelector('#statHeight');

    this.canvasManager.onStatsUpdate = (stackedCount, _fallingCount, heightPercent) => {
      if (statStacked) statStacked.innerText = stackedCount.toLocaleString();
      if (statHeight) statHeight.innerText = `${heightPercent}%`;
    };
  }
}

// ==============================
// App Entry Point
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('artCanvas');
  if (!canvas) {
    console.error('Canvas element #artCanvas not found');
    return;
  }

  // Initialize pure HTML5 Canvas & JS Media Art Engine
  const canvasManager = new CanvasManager(canvas);

  // Initialize UI Overlay & Controls
  new UIController(canvasManager);

  // Initial welcome drop
  setTimeout(() => {
    canvasManager.triggerDrop(undefined, 0.8);
  }, 300);
});
