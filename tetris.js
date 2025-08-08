/**
 * 8bit風テトリスゲーム
 * 
 * @description レトロな8bit風デザインのテトリスゲーム
 * @author Cursor AI
 * @version 1.0.0
 * @license MIT
 * 
 * @requires HTML5 Canvas API
 * @requires Web Audio API (オプション)
 * @requires DotGothic16 フォント
 */

/**
 * ゲーム設定定数
 * @type {Object}
 */
const GAME_CONFIG = {
    // ボード設定
    BOARD_WIDTH: 10,
    BOARD_HEIGHT: 20,
    CELL_SIZE: 30,
    
    // タイミング設定
    FPS: 60,
    FRAME_TIME: 1000 / 60, // 16.67ms
    INITIAL_DROP_INTERVAL: 1000, // 1秒
    MIN_DROP_INTERVAL: 50, // 最小落下間隔
    LEVEL_DROP_REDUCTION: 50, // レベルアップ時の落下間隔減少
    
    // アニメーション設定
    LINE_CLEAR_DURATION: 500,
    HARD_DROP_DURATION: 50,
    WINDOW_SHAKE_DURATION: 1000,
    WINDOW_SHAKE_INTERVAL: 50,
    
    // スコア設定
    SCORE_MULTIPLIERS: [0, 40, 100, 300, 1200], // 1-4ライン消去のスコア倍率
    HARD_DROP_SCORE_MULTIPLIER: 2,
    
    // 音声設定
    BGM_VOLUME: 0.1,
    SFX_VOLUME: 0.4,
    HOVER_SOUND_FREQ: 800,
    HARD_DROP_SOUND_FREQ: 150,
    GAME_OVER_FREQUENCIES: [440, 415, 392, 370, 349, 330, 311, 294],
    
    // エフェクト設定
    WINDOW_SHAKE_INTENSITY: 10,
    PARTICLE_COUNT: 4,
    PARTICLE_DISTANCE: 20
};

/**
 * バリデーション関数
 */
class Validator {
    static isValidPiece(piece) {
        return piece && 
               typeof piece.type === 'string' && 
               Array.isArray(piece.shape) && 
               typeof piece.color === 'string';
    }
    
    static isValidPosition(x, y) {
        return typeof x === 'number' && 
               typeof y === 'number' && 
               !isNaN(x) && !isNaN(y);
    }
    
    static isValidBoard(board) {
        return Array.isArray(board) && 
               board.length > 0 && 
               board.every(row => Array.isArray(row));
    }
    
    static isValidColor(color) {
        return typeof color === 'string' && 
               (color.startsWith('#') || color.startsWith('rgb'));
    }
}

/**
 * パフォーマンス最適化ユーティリティ
 */
class PerformanceOptimizer {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    static requestAnimationFramePolyfill() {
        return window.requestAnimationFrame ||
               window.webkitRequestAnimationFrame ||
               window.mozRequestAnimationFrame ||
               function(callback) {
                   window.setTimeout(callback, 1000 / 60);
               };
    }
}

/**
 * エラーハンドリングユーティリティ
 */
class ErrorHandler {
    static handleError(error, context) {
        console.error(`[${context}] Error:`, error);
        
        // ユーザーに分かりやすいエラーメッセージを表示
        this.showUserFriendlyError(context);
    }
    
    static showUserFriendlyError(context) {
        const errorMessages = {
            'audio': '音声機能が利用できません。ブラウザの設定を確認してください。',
            'canvas': 'ゲーム画面の表示に問題があります。ブラウザを更新してください。',
            'game': 'ゲームの実行中にエラーが発生しました。ページを再読み込みしてください。'
        };
        
        const message = errorMessages[context] || '予期しないエラーが発生しました。';
        
        // エラーメッセージを表示（既存のUIに統合）
        this.displayErrorNotification(message);
    }
    
    static displayErrorNotification(message) {
        // 既存のゲームオーバー画面を利用してエラーを表示
        const gameOver = document.getElementById('game-over');
        if (gameOver) {
            const errorTitle = gameOver.querySelector('h2');
            const errorMessage = gameOver.querySelector('p');
            
            if (errorTitle) errorTitle.textContent = 'エラー';
            if (errorMessage) errorMessage.textContent = message;
            
            gameOver.classList.remove('hidden');
        }
        }
}

// テトリスゲームの実装
class TetrisGame {
    constructor() {
        try {
            this.initializeCanvas();
            this.initializeGameState();
            this.initializeBoard();
            this.setupEventListeners();
            this.setupAudio();
            this.generateNextPiece();
            this.spawnNewPiece();
        } catch (error) {
            ErrorHandler.handleError(error, 'game');
        }
    }
    
    initializeCanvas() {
        this.canvas = document.getElementById('game-canvas');
        this.nextCanvas = document.getElementById('next-canvas');
        
        if (!this.canvas || !this.nextCanvas) {
            throw new Error('Required canvas elements not found');
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        if (!this.ctx || !this.nextCtx) {
            throw new Error('Failed to get canvas context');
        }
    }
    
    initializeGameState() {
        this.BOARD_WIDTH = GAME_CONFIG.BOARD_WIDTH;
        this.BOARD_HEIGHT = GAME_CONFIG.BOARD_HEIGHT;
        this.CELL_SIZE = GAME_CONFIG.CELL_SIZE;
        
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.isGameOver = false;
        this.isPaused = false;
        this.gameLoop = null;
        this.dropTime = 0;
        this.dropInterval = GAME_CONFIG.INITIAL_DROP_INTERVAL;
        this.lineAnimation = [];
        this.animationDuration = GAME_CONFIG.LINE_CLEAR_DURATION;
        this.holdPiece = null;
        this.canHold = true;
        this.hardDropEffect = null;
        this.hardDropAnimationDuration = GAME_CONFIG.HARD_DROP_DURATION;
        this.isHardDropping = false;
    }
    
    // テトリスピースの定義（8bit風カラーパレット）
    pieces = {
        I: {
            shape: [
                [1, 1, 1, 1]
            ],
            color: '#00ffff'
        },
        O: {
            shape: [
                [1, 1],
                [1, 1]
            ],
            color: '#ffff00'
        },
        T: {
            shape: [
                [0, 1, 0],
                [1, 1, 1]
            ],
            color: '#ff00ff'
        },
        S: {
            shape: [
                [0, 1, 1],
                [1, 1, 0]
            ],
            color: '#00ff00'
        },
        Z: {
            shape: [
                [1, 1, 0],
                [0, 1, 1]
            ],
            color: '#ff0000'
        },
        J: {
            shape: [
                [1, 0, 0],
                [1, 1, 1]
            ],
            color: '#0000ff'
        },
        L: {
            shape: [
                [0, 0, 1],
                [1, 1, 1]
            ],
            color: '#ff8000'
        }
    };
    
    // ボードの初期化
    initializeBoard() {
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
    }
    
    // イベントリスナーの設定
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // ボタンにホバー音効果を追加
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => this.playHoverSound());
        });
        
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.resetGame());
    }
    
    // オーディオ設定
    setupAudio() {
        try {
            this.bgm = new Audio();
            this.bgm.loop = true;
            this.bgm.volume = GAME_CONFIG.BGM_VOLUME;
            
            // Web Audio APIを使用してBGMを生成
            this.createBGM();
            
            // 効果音用のAudioContext
            this.soundContext = null;
            try {
                this.soundContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (error) {
                console.log('Sound effects not supported');
                ErrorHandler.handleError(error, 'audio');
            }
        } catch (error) {
            ErrorHandler.handleError(error, 'audio');
        }
    }
    
    // BGM生成（シンプルなテトリス風メロディ）
    createBGM() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [
                { freq: 659, duration: 0.25 }, // E
                { freq: 493, duration: 0.125 }, // B
                { freq: 523, duration: 0.125 }, // C
                { freq: 587, duration: 0.25 }, // D
                { freq: 523, duration: 0.125 }, // C
                { freq: 493, duration: 0.125 }, // B
                { freq: 440, duration: 0.25 }, // A
                { freq: 440, duration: 0.125 }, // A
                { freq: 523, duration: 0.125 }, // C
                { freq: 659, duration: 0.25 }, // E
                { freq: 587, duration: 0.125 }, // D
                { freq: 523, duration: 0.125 }, // C
                { freq: 493, duration: 0.5 }, // B
                { freq: 523, duration: 0.125 }, // C
                { freq: 587, duration: 0.25 }, // D
                { freq: 659, duration: 0.25 }, // E
                { freq: 523, duration: 0.25 }, // C
                { freq: 440, duration: 0.25 }, // A
                { freq: 440, duration: 0.5 }  // A
            ];
            
            this.audioContext = audioContext;
            this.bgmNotes = notes;
            this.currentNoteIndex = 0;
            this.noteStartTime = 0;
            
        } catch (error) {
            console.log('Audio not supported');
            this.audioContext = null;
        }
    }
    
    // BGM再生
    playBGM() {
        if (!this.audioContext) return;
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.isBGMPlaying = true;
        this.playNextNote();
    }
    
    // BGM停止
    stopBGM() {
        this.isBGMPlaying = false;
        if (this.currentOscillator) {
            this.currentOscillator.stop();
            this.currentOscillator = null;
        }
    }
    
    // 次の音符を再生
    playNextNote() {
        if (!this.isBGMPlaying || !this.audioContext) return;
        
        const note = this.bgmNotes[this.currentNoteIndex];
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(note.freq, this.audioContext.currentTime);
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + note.duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + note.duration);
        
        this.currentOscillator = oscillator;
        
        // 次の音符へ
        this.currentNoteIndex = (this.currentNoteIndex + 1) % this.bgmNotes.length;
        
        // 次の音符をスケジュール
        setTimeout(() => {
            this.playNextNote();
        }, note.duration * 1000);
    }
    
    // ライン消去効果音
    playLineClearSound(lineCount) {
        if (!this.soundContext) return;
        
        try {
            const oscillator = this.soundContext.createOscillator();
            const gainNode = this.soundContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.soundContext.destination);
            
            // ライン数に応じて音程を変える
            const baseFreq = 440; // A音
            const freq = baseFreq * Math.pow(2, lineCount - 1); // 1ライン: A, 2ライン: A#, 3ライン: B, 4ライン: C
            
            oscillator.frequency.setValueAtTime(freq, this.soundContext.currentTime);
            oscillator.type = 'square';
            
            gainNode.gain.setValueAtTime(0.4, this.soundContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + 0.3);
            
            oscillator.start(this.soundContext.currentTime);
            oscillator.stop(this.soundContext.currentTime + 0.3);
            
        } catch (error) {
            console.log('Failed to play line clear sound');
        }
    }
    
    // ボタンホバー効果音
    playHoverSound() {
        if (!this.soundContext) return;
        
        try {
            const oscillator = this.soundContext.createOscillator();
            const gainNode = this.soundContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.soundContext.destination);
            
            // 8bit風の短い効果音
            oscillator.frequency.setValueAtTime(GAME_CONFIG.HOVER_SOUND_FREQ, this.soundContext.currentTime);
            oscillator.type = 'square';
            
            gainNode.gain.setValueAtTime(0.1, this.soundContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + 0.1);
            
            oscillator.start(this.soundContext.currentTime);
            oscillator.stop(this.soundContext.currentTime + 0.1);
            
        } catch (error) {
            console.log('Failed to play hover sound');
        }
    }
    
    // ハードドロップ効果音
    playHardDropSound() {
        if (!this.soundContext) return;
        
        try {
            const oscillator = this.soundContext.createOscillator();
            const gainNode = this.soundContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.soundContext.destination);
            
            // 鈍い効果音（低周波数で短時間）
            oscillator.frequency.setValueAtTime(GAME_CONFIG.HARD_DROP_SOUND_FREQ, this.soundContext.currentTime);
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(0.3, this.soundContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + 0.2);
            
            oscillator.start(this.soundContext.currentTime);
            oscillator.stop(this.soundContext.currentTime + 0.2);
            
        } catch (error) {
            console.log('Failed to play hard drop sound');
        }
    }
    
    // ゲームオーバー効果音
    playGameOverSound() {
        if (!this.soundContext) return;
        
        try {
            // ゲームオーバー音（下降音階）
            const frequencies = GAME_CONFIG.GAME_OVER_FREQUENCIES;
            const duration = 0.15;
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.soundContext.createOscillator();
                    const gainNode = this.soundContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.soundContext.destination);
                    
                    oscillator.frequency.setValueAtTime(freq, this.soundContext.currentTime);
                    oscillator.type = 'square';
                    
                    gainNode.gain.setValueAtTime(0.2, this.soundContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + duration);
                    
                    oscillator.start(this.soundContext.currentTime);
                    oscillator.stop(this.soundContext.currentTime + duration);
                }, index * duration * 1000);
            });
            
        } catch (error) {
            console.log('Failed to play game over sound');
        }
    }
    
    // ウィンドウを煽る
    shakeWindow() {
        const gameContainer = document.querySelector('.game-container');
        if (!gameContainer) return;
        
        // 元の位置を保存
        const originalTransform = gameContainer.style.transform;
        
        // 煽りアニメーション
        const shakeIntensity = GAME_CONFIG.WINDOW_SHAKE_INTENSITY;
        const shakeDuration = GAME_CONFIG.WINDOW_SHAKE_DURATION; // 1秒
        const shakeInterval = GAME_CONFIG.WINDOW_SHAKE_INTERVAL; // 50ms間隔
        const shakeCount = shakeDuration / shakeInterval;
        
        let currentShake = 0;
        
        const shake = () => {
            if (currentShake >= shakeCount) {
                gameContainer.style.transform = originalTransform;
                return;
            }
            
            const intensity = shakeIntensity * (1 - currentShake / shakeCount);
            const x = (Math.random() - 0.5) * intensity;
            const y = (Math.random() - 0.5) * intensity;
            
            gameContainer.style.transform = `translate(${x}px, ${y}px)`;
            
            currentShake++;
            setTimeout(shake, shakeInterval);
        };
        
        shake();
    }
    
    // ホールド機能
    executeHold() {
        console.log('executeHold called, canHold:', this.canHold, 'currentPiece:', this.currentPiece);
        if (!this.canHold || !this.currentPiece) return;
        
        // 現在のピースをホールド
        if (this.holdPiece) {
            console.log('Exchanging pieces');
            // ホールドにピースがある場合、交換
            const temp = this.holdPiece;
            this.holdPiece = {
                type: this.currentPiece.type,
                shape: JSON.parse(JSON.stringify(this.pieces[this.currentPiece.type].shape)),
                color: this.currentPiece.color
            };
            this.currentPiece = {
                type: temp.type,
                shape: JSON.parse(JSON.stringify(this.pieces[temp.type].shape)),
                color: temp.color,
                x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(this.pieces[temp.type].shape[0].length / 2),
                y: 0
            };
        } else {
            console.log('Holding first piece');
            // ホールドが空の場合、現在のピースをホールドして次のピースを生成
            this.holdPiece = {
                type: this.currentPiece.type,
                shape: JSON.parse(JSON.stringify(this.pieces[this.currentPiece.type].shape)),
                color: this.currentPiece.color
            };
            this.spawnNewPiece();
        }
        
        this.canHold = false; // 1回ホールドしたら、次のピースが固定されるまでホールド不可
        console.log('Hold completed, canHold set to false');
        this.drawHoldPiece();
        this.draw();
    }
    
    // ホールドピースを描画
    drawHoldPiece() {
        const holdCanvas = document.getElementById('hold-canvas');
        if (!holdCanvas) return;
        
        const holdCtx = holdCanvas.getContext('2d');
        holdCtx.fillStyle = '#000000';
        holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
        
        if (this.holdPiece) {
            const cellSize = 20;
            const offsetX = Math.floor((holdCanvas.width - this.holdPiece.shape[0].length * cellSize) / 2);
            const offsetY = Math.floor((holdCanvas.height - this.holdPiece.shape.length * cellSize) / 2);
            
            for (let y = 0; y < this.holdPiece.shape.length; y++) {
                for (let x = 0; x < this.holdPiece.shape[y].length; x++) {
                    if (this.holdPiece.shape[y][x]) {
                        this.drawNextPixelBlock(
                            holdCtx,
                            offsetX + x * cellSize,
                            offsetY + y * cellSize,
                            cellSize,
                            this.holdPiece.color
                        );
                    }
                }
            }
        }
    }
    
    // ランダムなピースを生成
    generateNextPiece() {
        const pieceTypes = Object.keys(this.pieces);
        const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
        this.nextPiece = {
            type: randomType,
            shape: JSON.parse(JSON.stringify(this.pieces[randomType].shape)),
            color: this.pieces[randomType].color,
            x: 0,
            y: 0
        };
    }
    
    // 新しいピースをスポーン
    spawnNewPiece() {
        this.currentPiece = this.nextPiece;
        this.currentPiece.x = Math.floor(this.BOARD_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
        this.currentPiece.y = 0;
        
        this.generateNextPiece();
        this.drawNextPiece();
        this.drawHoldPiece();
        
        // ゲームオーバーチェック
        if (this.checkCollision(this.currentPiece, 0, 0)) {
            this.gameOver();
        }
    }
    
    // 衝突検出
    checkCollision(piece, deltaX, deltaY) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const newX = piece.x + x + deltaX;
                    const newY = piece.y + y + deltaY;
                    
                    if (newX < 0 || newX >= this.BOARD_WIDTH || 
                        newY >= this.BOARD_HEIGHT ||
                        (newY >= 0 && this.board[newY][newX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // 落下位置を取得
    getDropPosition() {
        if (!this.currentPiece) return null;
        
        let dropY = this.currentPiece.y;
        
        // 下に移動できる限り移動
        while (!this.checkCollision(this.currentPiece, 0, dropY - this.currentPiece.y + 1)) {
            dropY++;
        }
        
        return {
            x: this.currentPiece.x,
            y: dropY,
            shape: this.currentPiece.shape,
            color: this.currentPiece.color
        };
    }
    
    // ピースを移動
    movePiece(deltaX, deltaY) {
        if (!Validator.isValidPosition(deltaX, deltaY)) {
            console.warn('Invalid position values:', deltaX, deltaY);
            return false;
        }
        
        if (!Validator.isValidPiece(this.currentPiece)) {
            console.warn('Invalid current piece');
            return false;
        }
        
        if (!this.checkCollision(this.currentPiece, deltaX, deltaY)) {
            this.currentPiece.x += deltaX;
            this.currentPiece.y += deltaY;
            return true;
        }
        return false;
    }
    
    // ピースを回転
    rotatePiece() {
        const originalShape = this.currentPiece.shape;
        const rotated = this.currentPiece.shape[0].map((_, index) =>
            this.currentPiece.shape.map(row => row[index]).reverse()
        );
        
        this.currentPiece.shape = rotated;
        
        if (this.checkCollision(this.currentPiece, 0, 0)) {
            this.currentPiece.shape = originalShape;
        }
    }
    
    // ピースをボードに固定
    lockPiece() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardY = this.currentPiece.y + y;
                    const boardX = this.currentPiece.x + x;
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }
        
        this.canHold = true; // ピースが固定されたらホールド可能になる
        console.log('Piece locked, canHold set to true');
        this.clearLines();
        this.spawnNewPiece();
    }
    
    // 完成したラインをクリア
    clearLines() {
        // アニメーション中は新しいライン消去を開始しない
        if (this.lineAnimation.length > 0) {
            return;
        }
        
        const linesToClear = [];
        
        // 完成したラインを特定
        for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                linesToClear.push(y);
            }
        }
        
        if (linesToClear.length > 0) {
            this.startLineAnimation(linesToClear);
        }
    }
    
    // ライン消去アニメーション開始
    startLineAnimation(lines) {
        this.lineAnimation = lines.map(line => ({
            y: line,
            progress: 0,
            startTime: Date.now()
        }));
        
        // アニメーション完了後の処理
        setTimeout(() => {
            this.completeClearLines(lines);
            this.lineAnimation = [];
        }, this.animationDuration);
    }
    
    // ライン消去完了処理
    completeClearLines(lines) {
        // 効果音再生
        this.playLineClearSound(lines.length);
        
        // ラインを削除
        lines.forEach(line => {
            this.board.splice(line, 1);
            this.board.unshift(Array(this.BOARD_WIDTH).fill(0));
        });
        
        this.updateScore(lines.length);
        
        // ライン削除後に再度ライン消去チェックを行う
        // これにより連続してラインが消える場合に対応
        setTimeout(() => {
            this.clearLines();
        }, 50); // 少し遅延を入れて確実に処理されるようにする
    }
    
    // スコア更新
    updateScore(linesCleared) {
        const points = GAME_CONFIG.SCORE_MULTIPLIERS[linesCleared] * this.level;
        this.score += points;
        this.lines += linesCleared;
        
        // レベルアップ（10ライン毎）
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.dropInterval = Math.max(GAME_CONFIG.MIN_DROP_INTERVAL, GAME_CONFIG.INITIAL_DROP_INTERVAL - (this.level - 1) * GAME_CONFIG.LEVEL_DROP_REDUCTION);
        }
        
        this.updateDisplay();
    }
    
    // 表示更新
    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }
    
    // メインゲームボードを描画
    draw() {
        // キャンバスをクリア
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // グリッド線を描画（8bit風）
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.CELL_SIZE, 0);
            this.ctx.lineTo(x * this.CELL_SIZE, this.BOARD_HEIGHT * this.CELL_SIZE);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.CELL_SIZE);
            this.ctx.lineTo(this.BOARD_WIDTH * this.CELL_SIZE, y * this.CELL_SIZE);
            this.ctx.stroke();
        }
        
        // ボードを描画（アニメーション効果を含む）
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                if (this.board[y][x]) {
                    // ライン消去アニメーション中の行をチェック
                    const animatingLine = this.lineAnimation.find(line => line.y === y);
                    
                    if (animatingLine) {
                        // アニメーション進行度を計算
                        const elapsed = Date.now() - animatingLine.startTime;
                        const progress = Math.min(elapsed / this.animationDuration, 1);
                        
                        // エフェクト描画
                        this.drawLineEffect(x, y, progress);
                    } else {
                        // 8bit風ピクセルアート描画
                        this.drawPixelBlock(x, y, this.board[y][x]);
                    }
                }
            }
        }
        
        // 落下位置プレビューを描画
        const dropPosition = this.getDropPosition();
        if (dropPosition && dropPosition.y !== this.currentPiece.y) {
            this.ctx.globalAlpha = 0.3; // 透明度を設定
            for (let y = 0; y < dropPosition.shape.length; y++) {
                for (let x = 0; x < dropPosition.shape[y].length; x++) {
                    if (dropPosition.shape[y][x]) {
                        const drawX = dropPosition.x + x;
                        const drawY = dropPosition.y + y;
                        this.drawPixelBlock(drawX, drawY, this.currentPiece.color);
                    }
                }
            }
            this.ctx.globalAlpha = 1.0; // 透明度をリセット
        }
        
        // 現在のピースを描画
        if (this.currentPiece) {
            // ハードドロップエフェクト中の場合は動的な位置を計算
            let drawY = this.currentPiece.y;
            if (this.hardDropEffect) {
                const elapsed = Date.now() - this.hardDropEffect.startTime;
                const progress = Math.min(elapsed / this.hardDropAnimationDuration, 1);
                drawY = this.hardDropEffect.originalY + 
                    (this.hardDropEffect.targetY - this.hardDropEffect.originalY) * progress;
            }
            
            for (let y = 0; y < this.currentPiece.shape.length; y++) {
                for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                    if (this.currentPiece.shape[y][x]) {
                        const drawX = this.currentPiece.x + x;
                        const finalDrawY = drawY + y;
                        this.drawPixelBlock(drawX, finalDrawY, this.currentPiece.color);
                    }
                }
            }
        }
        
        // ハードドロップエフェクトを描画
        this.drawHardDropEffect();
    }
    
    // ライン消去エフェクト描画（8bit風）
    drawLineEffect(x, y, progress) {
        const cellX = x * this.CELL_SIZE;
        const cellY = y * this.CELL_SIZE;
        const cellSize = this.CELL_SIZE;
        
        // 8bit風のピクセル化されたエフェクト
        const alpha = 1 - progress;
        const pulse = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5;
        
        this.ctx.save();
        
        // ピクセル風の光る効果
        const colors = ['#ffff00', '#ff0000', '#00ff00', '#0000ff', '#ff00ff'];
        const colorIndex = Math.floor(progress * colors.length * 2) % colors.length;
        
        // メインブロック
        this.ctx.fillStyle = `rgba(255, 255, 0, ${alpha * pulse})`;
        this.ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
        
        // ピクセル風のハイライト
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * pulse})`;
        this.ctx.fillRect(cellX + 2, cellY + 2, 2, 2);
        this.ctx.fillRect(cellX + cellSize - 4, cellY + 2, 2, 2);
        this.ctx.fillRect(cellX + 2, cellY + cellSize - 4, 2, 2);
        
        // ピクセル風のシャドウ
        this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha * pulse})`;
        this.ctx.fillRect(cellX + cellSize - 4, cellY + 2, 2, cellSize - 4);
        this.ctx.fillRect(cellX + 2, cellY + cellSize - 4, cellSize - 4, 2);
        
        this.ctx.restore();
        
        // 8bit風のパーティクル効果
        if (progress > 0.5) {
            this.draw8bitParticles(cellX + cellSize / 2, cellY + cellSize / 2, progress);
        }
    }
    
    // 8bit風のパーティクル効果
    draw8bitParticles(centerX, centerY, progress) {
        const particleCount = GAME_CONFIG.PARTICLE_COUNT;
        const particleProgress = (progress - 0.5) * 2;
        
        this.ctx.save();
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = particleProgress * GAME_CONFIG.PARTICLE_DISTANCE;
            const particleX = Math.floor(centerX + Math.cos(angle) * distance);
            const particleY = Math.floor(centerY + Math.sin(angle) * distance);
            const size = Math.max(1, Math.floor((1 - particleProgress) * 3));
            
            this.ctx.fillStyle = `rgba(255, 255, 0, ${1 - particleProgress})`;
            this.ctx.fillRect(particleX, particleY, size, size);
        }
        
        this.ctx.restore();
    }
    

    
    // 次のピースを描画
    drawNextPiece() {
        this.nextCtx.fillStyle = '#000000';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (this.nextPiece) {
            const cellSize = 20;
            const offsetX = Math.floor((this.nextCanvas.width - this.nextPiece.shape[0].length * cellSize) / 2);
            const offsetY = Math.floor((this.nextCanvas.height - this.nextPiece.shape.length * cellSize) / 2);
            
            for (let y = 0; y < this.nextPiece.shape.length; y++) {
                for (let x = 0; x < this.nextPiece.shape[y].length; x++) {
                    if (this.nextPiece.shape[y][x]) {
                        this.drawNextPixelBlock(
                            this.nextCtx,
                            offsetX + x * cellSize,
                            offsetY + y * cellSize,
                            cellSize,
                            this.nextPiece.color
                        );
                    }
                }
            }
        }
    }
    
    // 次のピース用の8bit風ピクセルブロック描画
    drawNextPixelBlock(ctx, x, y, size, color) {
        // メインブロック
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
        
        // ハイライト（左上）
        ctx.fillStyle = this.lightenColor(color, 0.3);
        ctx.fillRect(x + 1, y + 1, size - 2, 2);
        ctx.fillRect(x + 1, y + 1, 2, size - 2);
        
        // シャドウ（右下）
        ctx.fillStyle = this.darkenColor(color, 0.3);
        ctx.fillRect(x + size - 3, y + 1, 2, size - 2);
        ctx.fillRect(x + 1, y + size - 3, size - 2, 2);
        
        // ピクセル風のドット効果
        ctx.fillStyle = this.lightenColor(color, 0.5);
        ctx.fillRect(x + 3, y + 3, 1, 1);
        ctx.fillRect(x + size - 4, y + 3, 1, 1);
        ctx.fillRect(x + 3, y + size - 4, 1, 1);
    }
    
    // ハードドロップ機能
    hardDrop() {
        if (!this.currentPiece) return;
        
        // ハードドロップエフェクト中は新しいハードドロップを無視
        if (this.hardDropEffect) return;
        
        // 落下位置を取得
        const dropPosition = this.getDropPosition();
        if (!dropPosition) return;
        
        // ハードドロップ効果音を再生
        this.playHardDropSound();
        
        // ハードドロップエフェクトを開始
        this.startHardDropEffect(dropPosition);
        
        // ハードドロップボーナススコア（落下距離 × 2）
        const dropDistance = dropPosition.y - this.currentPiece.y;
        this.score += dropDistance * GAME_CONFIG.HARD_DROP_SCORE_MULTIPLIER;
        this.updateDisplay();
    }
    
    // ハードドロップエフェクト開始
    startHardDropEffect(dropPosition) {
        const originalY = this.currentPiece.y;
        const dropDistance = dropPosition.y - originalY;
        
        this.hardDropEffect = {
            startTime: Date.now(),
            originalY: originalY,
            targetY: dropPosition.y,
            dropDistance: dropDistance
        };
        
        // ハードドロップ実行直後から落下完了まで操作を無効化
        this.isHardDropping = true;
        
        // エフェクト完了後にピースを固定
        setTimeout(() => {
            this.currentPiece.y = dropPosition.y;
            this.lockPiece();
            this.hardDropEffect = null;
            this.isHardDropping = false; // 操作を再度有効化
        }, this.hardDropAnimationDuration);
    }
    

    
    // ハードドロップエフェクト描画
    drawHardDropEffect() {
        if (!this.hardDropEffect) return;
        
        const elapsed = Date.now() - this.hardDropEffect.startTime;
        const progress = Math.min(elapsed / this.hardDropAnimationDuration, 1);
        
        // 通った列全体を光らせる
        this.drawHardDropColumnGlow(progress);
    }
    
    // ハードドロップ列全体の光るエフェクト（8bit風）
    drawHardDropColumnGlow(progress) {
        // ピースが通る列を特定
        const columns = [];
        for (let x = 0; x < this.currentPiece.shape[0].length; x++) {
            const boardX = this.currentPiece.x + x;
            if (boardX >= 0 && boardX < this.BOARD_WIDTH) {
                columns.push(boardX);
            }
        }
        
        // 現在の位置から落下位置までの範囲を計算
        const currentY = this.hardDropEffect.originalY;
        const targetY = this.hardDropEffect.targetY;
        const startY = Math.min(currentY, targetY);
        const endY = Math.max(currentY + this.currentPiece.shape.length, targetY + this.currentPiece.shape.length);
        
        // 各列を光らせる
        columns.forEach(columnX => {
            this.ctx.save();
            
            // フェードアウト効果（進行度に応じて薄くなる）
            const opacity = 0.4 * (1 - progress * 0.5);
            this.ctx.globalAlpha = opacity;
            
            // 8bit風のピクセル化された光るエフェクト
            const pulse = Math.sin(progress * Math.PI * 4) * 0.3 + 0.7;
            const glowColor = this.lightenColor(this.currentPiece.color, 0.5);
            
            // 現在の位置から落下位置までの範囲のみを光らせる
            const startX = columnX * this.CELL_SIZE;
            const width = this.CELL_SIZE;
            const height = (endY - startY) * this.CELL_SIZE;
            const drawY = startY * this.CELL_SIZE;
            
            // ピクセル風の光るエフェクト
            this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * pulse})`;
            this.ctx.fillRect(startX + 1, drawY + 1, width - 2, 2);
            this.ctx.fillRect(startX + 1, drawY + 1, 2, height - 2);
            
            this.ctx.fillStyle = `rgba(0, 0, 0, ${opacity * pulse})`;
            this.ctx.fillRect(startX + width - 3, drawY + 1, 2, height - 2);
            this.ctx.fillRect(startX + 1, drawY + height - 3, width - 2, 2);
            
            this.ctx.restore();
        });
    }
    
    // 8bit風ピクセルブロック描画
    drawPixelBlock(x, y, color) {
        const cellX = x * this.CELL_SIZE;
        const cellY = y * this.CELL_SIZE;
        const cellSize = this.CELL_SIZE;
        
        // メインブロック
        this.ctx.fillStyle = color;
        this.ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);
        
        // ハイライト（左上）
        this.ctx.fillStyle = this.lightenColor(color, 0.3);
        this.ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, 2);
        this.ctx.fillRect(cellX + 1, cellY + 1, 2, cellSize - 2);
        
        // シャドウ（右下）
        this.ctx.fillStyle = this.darkenColor(color, 0.3);
        this.ctx.fillRect(cellX + cellSize - 3, cellY + 1, 2, cellSize - 2);
        this.ctx.fillRect(cellX + 1, cellY + cellSize - 3, cellSize - 2, 2);
        
        // ピクセル風のドット効果
        this.ctx.fillStyle = this.lightenColor(color, 0.5);
        this.ctx.fillRect(cellX + 3, cellY + 3, 1, 1);
        this.ctx.fillRect(cellX + cellSize - 4, cellY + 3, 1, 1);
        this.ctx.fillRect(cellX + 3, cellY + cellSize - 4, 1, 1);
    }
    
    // 色を明るくするヘルパー関数
    lightenColor(color, factor) {
        // 16進数カラーコードをRGBに変換
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // 明るくする
        const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
        const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
        const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
    }
    
    // 色を暗くするヘルパー関数
    darkenColor(color, factor) {
        // 16進数カラーコードをRGBに変換
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // 暗くする
        const newR = Math.max(0, Math.floor(r * (1 - factor)));
        const newG = Math.max(0, Math.floor(g * (1 - factor)));
        const newB = Math.max(0, Math.floor(b * (1 - factor)));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
    }
    

    
    // キー入力処理
    // ... existing code ...

    // キー入力処理
    handleKeyPress(e) {
        // ゲームが開始されていない場合はスペースキーで開始
        if (!this.gameLoop && !this.isGameOver) {
            if (e.code === 'Space') {
                e.preventDefault();
                this.startGame();
                return;
            }
            // ゲーム開始前は他の操作を無効
            return;
        }
        
        if (this.isGameOver) return;
        
        // スペースキーは一時停止状態でも処理する
        if (e.code === 'Space') {
            e.preventDefault();
            this.togglePause();
            return;
        }
        
        // その他のキーは一時停止中は無効
        if (this.isPaused) return;
        
        // ハードドロップ中は全ての操作を無効
        if (this.isHardDropping) return;
        
        // ハードドロップエフェクト中は移動・回転・ホールドを無効
        if (this.hardDropEffect) {
            switch (e.code) {
                case 'KeyX':
                    // ハードドロップは既に無効化済み
                    return;
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'ArrowDown':
                case 'ArrowUp':
                case 'KeyC':
                    // エフェクト中は他の操作を無効
                    return;
            }
        }
        
        switch (e.code) {
            case 'ArrowLeft':
                this.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                this.movePiece(1, 0);
                break;
            case 'ArrowDown':
                if (!this.movePiece(0, 1)) {
                    this.lockPiece();
                }
                break;
            case 'ArrowUp':
                this.rotatePiece();
                break;
            case 'KeyC':
                console.log('C key pressed, calling executeHold');
                this.executeHold();
                break;
            case 'KeyX':
                this.hardDrop();
                break;
        }
        
        this.draw();
    }

    // ゲーム開始
    startGame() {
        if (this.gameLoop) return;
        
        this.isPaused = false;
        this.gameLoop = setInterval(() => this.update(), GAME_CONFIG.FRAME_TIME); // 60 FPS
        this.dropTime = 0;
        
        // ゲーム開始後にボタンを表示
        this.showGameButtons();
        
        // BGM開始
        this.playBGM();
    }
    
    // ゲーム更新
    update() {
        if (this.isPaused || this.isGameOver) return;
        
        this.dropTime += GAME_CONFIG.FRAME_TIME;
        
        if (this.dropTime >= this.dropInterval) {
            if (!this.movePiece(0, 1)) {
                this.lockPiece();
            }
            this.dropTime = 0;
        }
        
        this.draw();
    }
    
    // 一時停止切り替え
    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pause-btn').textContent = 
            this.isPaused ? '再開' : '一時停止';
        
        // BGMの一時停止/再開
        if (this.isPaused) {
            this.stopBGM();
        } else if (this.gameLoop) {
            this.playBGM();
        }
    }
    
    // ゲームオーバー
    gameOver() {
        this.isGameOver = true;
        clearInterval(this.gameLoop);
        this.gameLoop = null;
        
        // BGM停止
        this.stopBGM();
        
        // ゲームオーバー効果音を再生
        this.playGameOverSound();
        
        // ウィンドウを煽る
        this.shakeWindow();
        
        // ボタンを無効化
        this.disableButtons();
        
        // ゲーム開始前の状態に戻す
        this.hideGameButtons();
        
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over').classList.remove('hidden');
    }
    
    // ボタンを無効化
    disableButtons() {
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const resetBtn = document.getElementById('reset-btn');
        
        startBtn.disabled = true;
        pauseBtn.disabled = true;
        resetBtn.disabled = true;
        
        startBtn.classList.add('disabled');
        pauseBtn.classList.add('disabled');
        resetBtn.classList.add('disabled');
    }
    
    // ボタンを有効化
    enableButtons() {
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const resetBtn = document.getElementById('reset-btn');
        
        startBtn.disabled = false;
        pauseBtn.disabled = false;
        resetBtn.disabled = false;
        
        startBtn.classList.remove('disabled');
        pauseBtn.classList.remove('disabled');
        resetBtn.classList.remove('disabled');
    }
    
    // ゲーム開始後にボタンを表示
    showGameButtons() {
        const pauseBtn = document.getElementById('pause-btn');
        const resetBtn = document.getElementById('reset-btn');
        pauseBtn.style.display = 'inline-block';
        resetBtn.style.display = 'inline-block';
        pauseBtn.textContent = '一時停止';
    }
    
    // ゲーム開始前の状態に戻す
    hideGameButtons() {
        const pauseBtn = document.getElementById('pause-btn');
        const resetBtn = document.getElementById('reset-btn');
        pauseBtn.style.display = 'none';
        resetBtn.style.display = 'none';
    }
    
    // ゲームリセット
    resetGame() {
        this.cleanup();
        this.initializeGameState();
        this.initializeBoard();
        this.updateDisplay();
        this.generateNextPiece();
        this.spawnNewPiece();
        this.draw();
        this.drawHoldPiece();
        
        // ボタンを有効化
        this.enableButtons();
        
        // ゲーム開始前の状態に戻す
        this.hideGameButtons();
        
        document.getElementById('game-over').classList.add('hidden');
    }
    
    // リソースクリーンアップ
    cleanup() {
        // ゲームループを停止
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        
        // BGM停止
        this.stopBGM();
        
        // 音声コンテキストをクリーンアップ
        if (this.soundContext && this.soundContext.state !== 'closed') {
            this.soundContext.close();
        }
        
        // アニメーションをクリア
        this.lineAnimation = [];
        this.hardDropEffect = null;
        
        // イベントリスナーをクリーンアップ（必要に応じて）
        // 注意: キーボードイベントはグローバルなので削除しない
    }
}

// ゲーム初期化
let game;

document.addEventListener('DOMContentLoaded', () => {
    game = new TetrisGame();
    game.draw();
    game.drawHoldPiece();
});