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
    MIN_DROP_INTERVAL: 100, // 最小落下間隔（適度な速度に調整）
    LEVEL_DROP_REDUCTION: 80, // レベルアップ時の落下間隔減少（緩やかに調整）
    
    // アニメーション設定
    LINE_CLEAR_DURATION: 500,
    HARD_DROP_DURATION: 50,
    WINDOW_SHAKE_DURATION: 1000,
    WINDOW_SHAKE_INTERVAL: 50,
    
    // スコア設定
    SCORE_MULTIPLIERS: [0, 40, 100, 300, 1200], // 1-4ライン消去のスコア倍率
    HARD_DROP_SCORE_MULTIPLIER: 2,
    
    // ren（連続ライン消去）設定
    REN_BONUS_MULTIPLIER: 0.5, // renボーナス倍率（基本スコアの50%）
    REN_BONUS_CAP: 10,         // renボーナスの上限（10回目まで）
    
    // 音声設定
    BGM_VOLUME: 0.1,
    SFX_VOLUME: 0.4,
    HOVER_SOUND_FREQ: 800,
    HARD_DROP_SOUND_FREQ: 150,
    GAME_OVER_FREQUENCIES: [440, 415, 392, 370, 349, 330, 311, 294],
    
    // エフェクト設定
    WINDOW_SHAKE_INTENSITY: 10,
    PARTICLE_COUNT: 4,
    PARTICLE_DISTANCE: 20,
    
    // ウルト設定
    ULT_CHARGE_PER_LINE: 20, // 1ライン消去で20%チャージ
    ULT_CHARGE_PER_PIECE: 5,  // 1ピース固定で5%チャージ
    ULT_ACTIVATION_COST: 100, // ウルト発動に必要なチャージ量
    ULT_DURATION: 2000,       // ウルト効果持続時間（2秒）
    ULT_COOLDOWN: 10000,      // ウルト使用後のクールダウン（10秒）
    
    // ボム設定
    BOMB_EXPLOSION_RANGE: 2,  // ボム爆発範囲（半径）
    BOMB_EXPLOSION_SCORE: 800, // ボム爆発時のスコア
    
    // アニメーション設定
    BOMB_CLEAR_ANIMATION_DURATION: 800, // ボムブロック消去エフェクト時間
    EXPLOSION_EFFECT_DURATION: 800,     // 爆発エフェクト表示時間
    EXPLOSION_DELAY_BEFORE_DROP: 600,   // 爆発後ブロック落下までの遅延
    DROP_ANIMATION_DELAY: 100,          // ブロック落下後のライン消去チェック遅延
    
    // カウントダウン設定
    COUNTDOWN_UPDATE_INTERVAL: 1000,    // カウントダウン更新間隔（1秒）
    COOLDOWN_UI_UPDATE_OFFSET: 20,     // クールダウン終了後のUI更新オフセット
    
    // レベルアップ設定
    LINES_PER_LEVEL: 5,                 // レベルアップに必要なライン数（適度なペースに調整）
    
    // 音声設定
    SOUND_GAIN_VALUE: 0.3,             // 音声の基本音量
    SOUND_FADE_OUT_VALUE: 0.01,        // 音声のフェードアウト値
    SOUND_DURATION_SHORT: 0.1,         // 短い音声の持続時間
    SOUND_DURATION_MEDIUM: 0.15,       // 中程度の音声の持続時間
    SOUND_DURATION_LONG: 0.3,          // 長い音声の持続時間
    
    // BGM設定
    BGM_BASE_TEMPO: 1.0,               // 基本テンポ（レベル1）
    BGM_TEMPO_INCREASE_PER_LEVEL: 0.3, // レベルごとのテンポ増加
    BGM_MAX_TEMPO: 5.0                 // 最大テンポ（レベル制限）
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
            this.generateNextNextPiece();
            this.generateNextNextNextPiece();
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
        this.nextNextPiece = null;
        this.nextNextNextPiece = null;
        this.score = 0;
        this.level = 1; // 初期レベルを1に戻して、初心者にも優しい速度で開始
        this.lines = 0;
        this.isGameOver = false;
        this.isPaused = false;
        this.gameLoop = null;
        this.dropTime = 0;
        // 初期レベルに応じた落下間隔を設定
        this.dropInterval = GAME_CONFIG.INITIAL_DROP_INTERVAL; // レベル1は初期間隔
        this.lineAnimation = [];
        this.animationDuration = GAME_CONFIG.LINE_CLEAR_DURATION;
        this.holdPiece = null;
        this.canHold = true;
        this.hardDropEffect = null;
        this.hardDropAnimationDuration = GAME_CONFIG.HARD_DROP_DURATION;
        this.isHardDropping = false;
        
        // ウルト関連の状態
        this.ultCharge = 0;
        this.isUltActive = false;
        this.ultStartTime = 0;
        this.ultCooldownEnd = 0;
        this.ultEffect = null;
        
        // ren（連続ライン消去）関連の状態
        this.renCount = 0;
        this.lastLineClear = false; // 前回ブロックを置いた時にライン消しが発生したか
        this.renTimeout = 2000; // 2秒以内にライン消去しないとrenがリセット
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
        this.board = [];
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            this.board[y] = Array(this.BOARD_WIDTH).fill(0);
        }
        
        // デバッグ用：ボードの初期状態を確認
        console.log(`Board initialized: ${this.BOARD_WIDTH}x${this.BOARD_HEIGHT}`);
        console.log(`Board length: ${this.board.length}`);
        console.log(`Board structure:`, this.board.map((row, index) => `Row ${index}: [${row.join(', ')}]`));
    }
    
    // イベントリスナーの設定
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // スクロール防止の強化
        this.preventScroll();
        
        // ボタンにホバー音効果を追加
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => this.playHoverSound());
        });
        
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.resetGame());
        
        // ウルトボタンのイベントリスナー
        const ultBtn = document.getElementById('ult-btn');
        if (ultBtn) {
            ultBtn.addEventListener('click', () => this.activateUlt());
        }
    }
    
    // スクロール防止の強化
    preventScroll() {
        // タッチスクロールの防止
        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        
        // マウスホイールスクロールの防止
        document.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
        
        // キーボードスクロールの防止
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });
        
        // ゲームコンテナ内でのスクロールも防止
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
            gameContainer.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        }
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
            this.currentBGMLevel = 1; // 現在のBGMレベルを追跡
            
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
    
    // BGMテンポをレベルに応じて更新
    updateBGMTempo() {
        if (!this.audioContext || !this.isBGMPlaying) return;
        
        // 現在のレベルに基づいてテンポを計算
        const newBGMLevel = Math.min(this.level, 20); // レベル20で最大テンポ
        
        if (newBGMLevel !== this.currentBGMLevel) {
            this.currentBGMLevel = newBGMLevel;
            
            // 共通の倍率計算を使用
            const tempoMultiplier = Math.min(
                GAME_CONFIG.BGM_MAX_TEMPO,
                GAME_CONFIG.BGM_BASE_TEMPO + (this.currentBGMLevel - 1) * GAME_CONFIG.BGM_TEMPO_INCREASE_PER_LEVEL
            );
            
            console.log(`BGMテンポ更新: レベル${this.currentBGMLevel}, テンポ倍率: ${tempoMultiplier.toFixed(2)}`);
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
        
        // 現在のテンポに基づいて次の音符をスケジュール
        const tempoMultiplier = Math.min(
            GAME_CONFIG.BGM_MAX_TEMPO,
            GAME_CONFIG.BGM_BASE_TEMPO + (this.currentBGMLevel - 1) * GAME_CONFIG.BGM_TEMPO_INCREASE_PER_LEVEL
        );
        
        const nextNoteDelay = (note.duration * 1000) / tempoMultiplier;
        
        setTimeout(() => {
            this.playNextNote();
        }, nextNoteDelay);
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
        holdCtx.fillStyle = '#121212'; // より黒寄りのグレーに変更
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
    
    generateNextNextPiece() {
        const pieceTypes = Object.keys(this.pieces);
        const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
        this.nextNextPiece = {
            type: randomType,
            shape: JSON.parse(JSON.stringify(this.pieces[randomType].shape)),
            color: this.pieces[randomType].color,
            x: 0,
            y: 0
        };
    }
    
    generateNextNextNextPiece() {
        const pieceTypes = Object.keys(this.pieces);
        const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
        this.nextNextNextPiece = {
            type: randomType,
            shape: JSON.parse(JSON.stringify(this.pieces[randomType].shape)),
            color: this.pieces[randomType].color,
            x: 0,
            y: 0
        };
    }
    
    // spawnNewPiece() を少し堅牢に
    spawnNewPiece() {
        // キューが欠けていたら補充
        if (!this.nextPiece) this.generateNextPiece();
        if (!this.nextNextPiece) this.generateNextNextPiece();
        if (!this.nextNextNextPiece) this.generateNextNextNextPiece();

        this.currentPiece = this.nextPiece;
        this.currentPiece.x = Math.floor(this.BOARD_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
        this.currentPiece.y = 0;

        // 繰り上げ
        this.nextPiece = this.nextNextPiece;
        this.nextNextPiece = this.nextNextNextPiece;

        // 末尾を補充
        this.generateNextNextNextPiece();

        // 描画更新
        this.drawNextPiece();
        this.drawNextNextPiece();
        this.drawNextNextNextPiece();
        this.drawHoldPiece();
        this.updateDisplay();

        if (this.checkCollision(this.currentPiece, 0, 0)) this.gameOver();
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
        // ボムピースの処理
        if (this.currentPiece && this.currentPiece.isBomb) {
            this.explodeBomb();
            this.canHold = true;
            this.chargeUlt(GAME_CONFIG.ULT_CHARGE_PER_PIECE);
            this.spawnNewPiece();
            return;
        }
        
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardY = this.currentPiece.y + y;
                    const boardX = this.currentPiece.x + x;
                    if (boardY >= 0) {
                        // ボムブロックの場合は特別な識別子を使用
                        if (this.currentPiece.isBomb) {
                            this.board[boardY][boardX] = 'BOMB';
                        } else {
                            this.board[boardY][boardX] = this.currentPiece.color;
                        }
                    }
                }   
            }
        }
        
        this.canHold = true; // ピースが固定されたらホールド可能になる
        console.log('Piece locked, canHold set to true');
        
        // ハードドロップ時は音を鳴らさない（重複を防ぐ）
        if (!this.isHardDropping) {
            this.playHardDropSound();
        }
        
        // ウルトゲージをチャージ
        this.chargeUlt(GAME_CONFIG.ULT_CHARGE_PER_PIECE);
        
        // ライン消去処理を実行
        const linesCleared = this.clearLines();
        
        // ライン消去が発生しなかった場合、renをリセット
        if (linesCleared === 0) {
            this.renCount = 0;
            this.lastLineClear = false;
            console.log('No lines cleared, ren reset to 0');
            // renの表示を即座に更新
            this.updateDisplay();
        }
        
        this.spawnNewPiece();
    }
    
    // 完成したラインをクリア
    clearLines() {
        // アニメーション中は新しいライン消去を開始しない
        if (this.lineAnimation.length > 0) {
            return 0;
        }
        
        const linesToClear = [];
        
        // 完成したラインを特定
        for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                linesToClear.push(y);
            }
        }
        
        if (linesToClear.length > 0) {
            // デバッグ用：ライン消去前のボード状態を確認
            console.log(`Before line clear - Lines to clear: ${linesToClear.join(', ')}`);
            console.log(`Board height before clear: ${this.board.length}`);
            console.log(`Board structure before clear:`, this.board.map((row, index) => `Row ${index}: [${row.join(', ')}]`));
            
            this.startLineAnimation(linesToClear);
            return linesToClear.length; // ライン消去数を返す
        }
        
        return 0; // ライン消去が発生しなかった場合は0を返す
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
        
        // 削除するラインの情報を保存（元の配列を変更しない）
        const linesToRemove = [...lines];
        
        // ボードの状態をバックアップ
        const originalBoard = this.board.map(row => [...row]);
        
        try {
            // より安全なライン消去処理
            // 1. 完成したラインを特定して削除
            const newBoard = [];
            
            // 下から上に向かって処理（インデックスのずれを防ぐ）
            for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
                // この行が消去対象でない場合のみ新しいボードに追加
                if (!linesToRemove.includes(y)) {
                    newBoard.unshift([...this.board[y]]);
                }
            }
            
            // 2. 削除されたライン数分だけ上に空のラインを追加
            for (let i = 0; i < linesToRemove.length; i++) {
                newBoard.unshift(Array(this.BOARD_WIDTH).fill(0));
            }
            
            // 3. 新しいボードを適用
            this.board = newBoard;
            
            // ボードの状態を確認（デバッグ用）
            console.log(`Lines cleared: ${linesToRemove.join(', ')}`);
            console.log(`Board height after clear: ${this.board.length}`);
            console.log(`Expected board height: ${this.BOARD_HEIGHT}`);
            
            // ボードの高さが正しいかチェック
            if (this.board.length !== this.BOARD_HEIGHT) {
                console.error(`Board height mismatch! Expected: ${this.BOARD_HEIGHT}, Actual: ${this.board.length}`);
                // ボードの高さを修正
                while (this.board.length < this.BOARD_HEIGHT) {
                    this.board.unshift(Array(this.BOARD_WIDTH).fill(0));
                }
                while (this.board.length > this.BOARD_HEIGHT) {
                    this.board.shift();
                }
            }
            
        } catch (error) {
            console.error('Error during line clearing:', error);
            // エラーが発生した場合は元のボードを復元
            this.board = originalBoard;
            return;
        }
        
        this.updateScore(linesToRemove.length);
        
        // ライン削除後に再度ライン消去チェックを行う
        // これにより連続してラインが消える場合に対応
        setTimeout(() => {
            this.clearLines();
        }, 50); // 少し遅延を入れて確実に処理されるようにする
    }
    
    // スコア更新
    updateScore(linesCleared) {
        // linesClearedの値を安全な範囲に制限（0-4）
        const safeLinesCleared = Math.max(0, Math.min(linesCleared, 4));
        
        // スコア倍率が存在するかチェック
        const scoreMultiplier = GAME_CONFIG.SCORE_MULTIPLIERS[safeLinesCleared];
        if (typeof scoreMultiplier !== 'number' || isNaN(scoreMultiplier)) {
            console.warn(`Invalid score multiplier for linesCleared: ${linesCleared}, using 0`);
            return;
        }
        
        const basePoints = scoreMultiplier * this.level;
        
        // 基本スコアが有効な数値かチェック
        if (isNaN(basePoints)) {
            console.warn(`Invalid base points calculated: ${basePoints}, linesCleared: ${linesCleared}, level: ${this.level}`);
            return;
        }
        
        // ren（連続ライン消去）ボーナスを計算
        const renBonus = this.calculateRenBonus(safeLinesCleared, basePoints);
        const totalPoints = basePoints + renBonus;
        
        // 合計スコアが有効な数値かチェック
        if (isNaN(totalPoints)) {
            console.warn(`Invalid total points calculated: ${totalPoints}, basePoints: ${basePoints}, renBonus: ${renBonus}`);
            return;
        }
        
        this.score += totalPoints;
        this.lines += safeLinesCleared;
        
        // ウルトゲージをチャージ
        this.chargeUlt(GAME_CONFIG.ULT_CHARGE_PER_LINE * safeLinesCleared);
        
            // レベルアップ（設定されたライン数毎）
        const newLevel = Math.floor(this.lines / GAME_CONFIG.LINES_PER_LEVEL) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            
            // 共通の倍率計算を使用して落下間隔を更新
            this.updateDropInterval();
            
            // 背景色を更新
            this.updateBackgroundColor();
            
            // レベルアップ効果音を再生
            this.playLevelUpSound();
            
            // BGMテンポを更新
            this.updateBGMTempo();
            
            console.log(`レベルアップ！ レベル${this.level} - 落下間隔: ${this.dropInterval}ms`);
        }
        
        this.updateDisplay();
    }
    
    // ren（連続ライン消去）ボーナスを計算
    calculateRenBonus(linesCleared, basePoints) {
        // 入力値の検証
        if (typeof linesCleared !== 'number' || isNaN(linesCleared) || linesCleared <= 0) {
            console.warn(`Invalid linesCleared in calculateRenBonus: ${linesCleared}`);
            return 0;
        }
        
        if (typeof basePoints !== 'number' || isNaN(basePoints)) {
            console.warn(`Invalid basePoints in calculateRenBonus: ${basePoints}`);
            return 0;
        }
        
        if (linesCleared === 0) {
            // ライン消しが発生しなかった場合、renをリセット
            this.lastLineClear = false;
            return 0;
        }
        
        // ライン消しが発生した場合
        if (this.lastLineClear) {
            // 前回もライン消しが発生していた場合、renカウントを増加
            this.renCount++;
            console.log(`Ren continued: ${this.renCount}`);
        } else {
            // 前回はライン消しが発生していなかった場合、renを1から開始
            this.renCount = 1;
            console.log(`Ren started: ${this.renCount}`);
        }
        
        // 今回ライン消しが発生したことを記録
        this.lastLineClear = true;
        
        // renボーナスを計算（上限あり）
        const cappedRen = Math.min(this.renCount, GAME_CONFIG.REN_BONUS_CAP);
        const renBonus = Math.floor(basePoints * GAME_CONFIG.REN_BONUS_MULTIPLIER * cappedRen);
        
        // 計算結果の検証
        if (isNaN(renBonus)) {
            console.warn(`Invalid renBonus calculated: ${renBonus}, basePoints: ${basePoints}, cappedRen: ${cappedRen}`);
            return 0;
        }
        
        // renボーナス効果音を再生（renが2以上の場合）
        if (this.renCount > 1) {
            this.playRenBonusSound();
        }
        
        return renBonus;
    }
    
    // renボーナス効果音
    playRenBonusSound() {
        if (!this.soundContext) return;
        
        try {
            // renボーナス音（上昇音階）
            const frequencies = [523, 659, 784, 1047]; // C, E, G, C
            const duration = 0.1;
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.soundContext.createOscillator();
                    const gainNode = this.soundContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.soundContext.destination);
                    
                    oscillator.frequency.setValueAtTime(freq, this.soundContext.currentTime);
                    oscillator.type = 'triangle';
                    
                    gainNode.gain.setValueAtTime(0.2, this.soundContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + duration);
                    
                    oscillator.start(this.soundContext.currentTime);
                    oscillator.stop(this.soundContext.currentTime + duration);
                }, index * duration * 1000);
            });
            
        } catch (error) {
            console.log('Failed to play ren bonus sound');
        }
    }
    
    // 表示更新
    updateDisplay() {
        document.getElementById('score').textContent = this.score;
        
        // 共通の倍率計算を使用してテンポ倍率を表示
        const tempoMultiplier = Math.min(
            GAME_CONFIG.BGM_MAX_TEMPO,
            GAME_CONFIG.BGM_BASE_TEMPO + (this.level - 1) * GAME_CONFIG.BGM_TEMPO_INCREASE_PER_LEVEL
        );
        document.getElementById('tempo-multiplier').textContent = tempoMultiplier.toFixed(1) + 'x';
        
        document.getElementById('lines').textContent = this.lines;
        
        // ren数の表示を更新
        const renElement = document.getElementById('ren');
        if (renElement) {
            renElement.textContent = this.renCount.toString();
        }
    }
    
    // メインゲームボードを描画
    draw() {
        // キャンバスをクリア（よりグレーな背景）
        this.ctx.fillStyle = '#121212'; // より黒寄りのグレーに変更
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // グリッド線を描画（8bit風）
        this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)'; // グレー背景に合わせて調整
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
                        // ボムブロックかどうかチェック
                        if (this.board[y][x] === 'BOMB') {
                            this.drawBombBlockOnBoard(x, y);
                        } else {
                            // 8bit風ピクセルアート描画
                            this.drawPixelBlock(x, y, this.board[y][x]);
                        }
                    }
                }
            }
        }
        
        // 落下位置プレビューを描画
        const dropPosition = this.getDropPosition();
        if (dropPosition && dropPosition.y !== this.currentPiece.y) {
            this.ctx.globalAlpha = 0.2; // 透明度を設定
            for (let y = 0; y < dropPosition.shape.length; y++) {
                for (let x = 0; x < dropPosition.shape[y].length; x++) {
                    if (dropPosition.shape[y][x]) {
                        const drawX = dropPosition.x + x;
                        const drawY = dropPosition.y + y;
                        
                        if (this.currentPiece.isBomb) {
                            // ボムブロックの落下位置予測を爆弾絵文字で表示
                            this.drawBombPreview(drawX, drawY);
                        } else {
                            // 通常のピースの落下位置予測
                            this.drawPixelBlock(drawX, drawY, this.currentPiece.color);
                        }
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
                        
                        if (this.currentPiece.isBomb) {
                            // ボムブロックの特別描画
                            this.drawBombBlockOnBoard(drawX, finalDrawY);
                        } else {
                            // 通常のピース描画
                            this.drawPixelBlock(drawX, finalDrawY, this.currentPiece.color);
                        }
                    }
                }
            }
        }
        
        // ハードドロップエフェクトを描画
        this.drawHardDropEffect();
        
        // 爆発エフェクトを描画
        this.drawExplosionEffect();
        
        // ウルトエフェクトを描画
        this.drawUltEffect();
        
        // ボムブロック消去エフェクトを描画
        this.drawBombClearEffect();
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
        this.nextCtx.fillStyle = '#121212'; // より黒寄りのグレーに変更
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        if (this.nextPiece) {
            const cellSize = 20;
            const offsetX = Math.floor((this.nextCanvas.width - this.nextPiece.shape[0].length * cellSize) / 2);
            const offsetY = Math.floor((this.nextCanvas.height - this.nextPiece.shape.length * cellSize) / 2);
            
            for (let y = 0; y < this.nextPiece.shape.length; y++) {
                for (let x = 0; x < this.nextPiece.shape[y].length; x++) {
                    if (this.nextPiece.shape[y][x]) {
                        if (this.nextPiece.isBomb) {
                            // ボムブロックの特別描画
                            this.drawBombBlock(
                                this.nextCtx,
                                offsetX + x * cellSize,
                                offsetY + y * cellSize,
                                cellSize
                            );
                        } else {
                            // 通常のピース描画
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
    }
    
    // 次の次のピースを描画
    drawNextNextPiece() {
        const canvas = document.getElementById('next-next-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (this.nextNextPiece) {
            const cellSize = 15;
            const offsetX = Math.floor((canvas.width - this.nextNextPiece.shape[0].length * cellSize) / 2);
            const offsetY = Math.floor((canvas.height - this.nextNextPiece.shape.length * cellSize) / 2);
            
            for (let y = 0; y < this.nextNextPiece.shape.length; y++) {
                for (let x = 0; x < this.nextNextPiece.shape[y].length; x++) {
                    if (this.nextNextPiece.shape[y][x]) {
                        if (this.nextNextPiece.isBomb) {
                            this.drawBombBlock(ctx, offsetX + x * cellSize, offsetY + y * cellSize, cellSize);
                        } else {
                            this.drawNextPixelBlock(ctx, offsetX + x * cellSize, offsetY + y * cellSize, cellSize, this.nextNextPiece.color);
                        }
                    }
                }
            }
        }
    }
    
    // 次の次の次のピースを描画
    drawNextNextNextPiece() {
        const canvas = document.getElementById('next-next-next-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (this.nextNextNextPiece) {
            const cellSize = 15;
            const offsetX = Math.floor((canvas.width - this.nextNextNextPiece.shape[0].length * cellSize) / 2);
            const offsetY = Math.floor((canvas.height - this.nextNextNextPiece.shape.length * cellSize) / 2);
            
            for (let y = 0; y < this.nextNextNextPiece.shape.length; y++) {
                for (let x = 0; x < this.nextNextNextPiece.shape[y].length; x++) {
                    if (this.nextNextNextPiece.shape[y][x]) {
                        if (this.nextNextNextPiece.isBomb) {
                            this.drawBombBlock(ctx, offsetX + x * cellSize, offsetY + y * cellSize, cellSize);
                        } else {
                            this.drawNextPixelBlock(ctx, offsetX + x * cellSize, offsetY + y * cellSize, cellSize, this.nextNextNextPiece.color);
                        }
                    }
                }
            }
        }
    }
    
    // ボムブロックの特別描画
    drawBombBlock(ctx, x, y, size) {
        // 爆弾の絵文字（💣）を描画
        ctx.font = `${size}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText('💣', x + size/2, y + size/2);
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
                e.preventDefault(); // ブラウザのスクロールを防ぐ
                this.startGame();
                return;
            }
            // ゲーム開始前は他の操作を無効
            return;
        }
        
        if (this.isGameOver) return;
        
        // スペースキーは一時停止状態でも処理する
        if (e.code === 'Space') {
            e.preventDefault(); // ブラウザのスクロールを防ぐ
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
                e.preventDefault(); // ブラウザのスクロールを防ぐ
                this.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                e.preventDefault(); // ブラウザのスクロールを防ぐ
                this.movePiece(1, 0);
                break;
            case 'ArrowDown':
                e.preventDefault(); // ブラウザのスクロールを防ぐ
                if (!this.movePiece(0, 1)) {
                    this.lockPiece();
                }
                break;
            case 'ArrowUp':
                e.preventDefault(); // ブラウザのスクロールを防ぐ
                this.rotatePiece();
                break;
            case 'KeyC':
                e.preventDefault(); // ブラウザのデフォルト動作を防ぐ
                console.log('C key pressed, calling executeHold');
                this.executeHold();
                break;
            case 'KeyX':
                e.preventDefault(); // ブラウザのデフォルト動作を防ぐ
                this.hardDrop();
                break;
            case 'KeyU':
                e.preventDefault(); // ブラウザのデフォルト動作を防ぐ
                this.activateUlt();
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
        
        // 複数の次のピースを初期化
        this.generateNextPiece();
        this.generateNextNextPiece();
        this.generateNextNextNextPiece();
        
        // 初期背景色を設定
        this.updateBackgroundColor();
        
        // 次のピースを描画
        this.drawNextPiece();
        this.drawNextNextPiece();
        this.drawNextNextNextPiece();
        
        // ゲーム開始後にボタンを表示
        this.showGameButtons();
        
        // BGM開始
        this.playBGM();
    }
    
    // ゲーム更新
    update() {
        if (this.isPaused || this.isGameOver) return;
        
        // ウルト効果終了チェック
        if (this.isUltActive && Date.now() - this.ultStartTime >= GAME_CONFIG.ULT_DURATION) {
            this.deactivateUlt();
        }
    
        // クールダウン表示を定期的に更新
        if (Date.now() % GAME_CONFIG.COUNTDOWN_UPDATE_INTERVAL < GAME_CONFIG.FRAME_TIME) {
            this.updateUltCountdown();
        }
        
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
        
        // ゲームオーバー表示のアニメーション開始
        this.showGameOverAnimation();
    }
    
    // ゲームオーバー表示のアニメーション
    showGameOverAnimation() {
        const gameOverElement = document.getElementById('game-over');
        
        // 初期状態を設定（画面外の上から）
        gameOverElement.style.display = 'block';
        gameOverElement.style.opacity = '0';
        gameOverElement.style.transform = 'translate(-50%, -150%) scale(0.8)';
        gameOverElement.classList.remove('hidden');
        
        // アニメーション開始
        requestAnimationFrame(() => {
            gameOverElement.style.transition = 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            gameOverElement.style.opacity = '1';
            gameOverElement.style.transform = 'translate(-50%, -50%) scale(1)';
            
            // アニメーション完了後の処理
            setTimeout(() => {
                gameOverElement.classList.add('showing');
            }, 800);
        });
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
        
        // デバッグ用：リセット後のボード状態を確認
        console.log(`Game reset - Board height: ${this.board.length}`);
        console.log(`Board structure after reset:`, this.board.map((row, index) => `Row ${index}: [${row.join(', ')}]`));
        
        this.updateDisplay();
        this.generateNextPiece();
        this.generateNextNextPiece();
        this.generateNextNextNextPiece();
        this.spawnNewPiece();
        this.draw();
        this.drawNextPiece();
        this.drawNextNextPiece();
        this.drawNextNextNextPiece();
        this.drawHoldPiece();
        
        // 音声コンテキストを再初期化
        this.setupAudio();
        
        // ウルト表示を更新
        this.updateUltDisplay();
        
        // ボタンを有効化
        this.enableButtons();
        
        // ゲーム開始前の状態に戻す
        this.hideGameButtons();
        
        // ゲームオーバー表示を完全にリセット
        const gameOverElement = document.getElementById('game-over');
        if (gameOverElement) {
            gameOverElement.classList.add('hidden');
            gameOverElement.classList.remove('showing');
            gameOverElement.style.transition = 'none';
            gameOverElement.style.opacity = '';
            gameOverElement.style.transform = '';
            gameOverElement.style.display = 'none'; // 強制的に非表示
        }
        
        // ゲームオーバー状態をリセット
        this.isGameOver = false;
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
        
        // 音声コンテキストの状態をリセット（完全に閉じない）
        if (this.soundContext && this.soundContext.state === 'suspended') {
            this.soundContext.resume();
        }
        
        // アニメーションをクリア
        this.lineAnimation = [];
        this.hardDropEffect = null;
        this.bombClearAnimation = [];

        // ウルト関連のタイマーをクリア
        if (this._ultCooldownTimer) {
            clearTimeout(this._ultCooldownTimer);
            this._ultCooldownTimer = null;
        }
        
        // イベントリスナーをクリーンアップ（必要に応じて）
        // 注意: キーボードイベントはグローバルなので削除しない
    }

    // ウルトゲージをチャージ
    chargeUlt(amount) {
        if (this.ultCharge < GAME_CONFIG.ULT_ACTIVATION_COST) {
            const oldCharge = this.ultCharge;
            this.ultCharge = Math.min(GAME_CONFIG.ULT_ACTIVATION_COST, this.ultCharge + amount);
            
            // 100%に達した時のみ特殊効果音を再生
            if (this.ultCharge >= GAME_CONFIG.ULT_ACTIVATION_COST && oldCharge < GAME_CONFIG.ULT_ACTIVATION_COST) {
                this.playUltReadySound();
            }
            
            this.updateUltDisplay();
        }
    }
    
    // ウルト準備完了効果音
    playUltReadySound() {
        if (!this.soundContext) return;
        
        try {
            // 準備完了音（上昇音階）
            const frequencies = [440, 554, 659, 784, 880];
            const duration = GAME_CONFIG.SOUND_DURATION_MEDIUM;
            const gainValue = GAME_CONFIG.SOUND_GAIN_VALUE;
            const fadeOutValue = GAME_CONFIG.SOUND_FADE_OUT_VALUE;
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.soundContext.createOscillator();
                    const gainNode = this.soundContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.soundContext.destination);
                    
                    oscillator.frequency.setValueAtTime(freq, this.soundContext.currentTime);
                    oscillator.type = 'square';
                    
                    gainNode.gain.setValueAtTime(gainValue, this.soundContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(fadeOutValue, this.soundContext.currentTime + duration);
                    
                    oscillator.start(this.soundContext.currentTime);
                    oscillator.stop(this.soundContext.currentTime + duration);
                }, index * duration * 1000);
            });
            
        } catch (error) {
            console.log('Failed to play ult ready sound');
        }
    }
    
    // 落下間隔を更新（共通の倍率計算を使用）
    updateDropInterval() {
        // テンポ倍率を計算
        const tempoMultiplier = Math.min(
            GAME_CONFIG.BGM_MAX_TEMPO,
            GAME_CONFIG.BGM_BASE_TEMPO + (this.level - 1) * GAME_CONFIG.BGM_TEMPO_INCREASE_PER_LEVEL
        );
        
        // 落下間隔をテンポ倍率に基づいて計算
        // 倍率が上がるほど落下間隔が短くなる（速くなる）
        const baseInterval = GAME_CONFIG.INITIAL_DROP_INTERVAL;
        const minInterval = GAME_CONFIG.MIN_DROP_INTERVAL;
        
        // テンポ倍率に反比例して落下間隔を調整
        this.dropInterval = Math.max(minInterval, baseInterval / tempoMultiplier);
        
        console.log(`落下間隔更新: レベル${this.level}, テンポ倍率${tempoMultiplier.toFixed(1)}x, 落下間隔${this.dropInterval.toFixed(0)}ms`);
    }
    
    // 背景色を更新
    updateBackgroundColor() {
        // 既存のレベルクラスを削除
        document.body.classList.remove('level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6', 'level-7', 'level-8', 'level-9', 'level-10');
        
        // 現在のレベルに応じたクラスを追加
        const levelClass = `level-${Math.min(this.level, 10)}`;
        document.body.classList.add(levelClass);
        
        console.log(`背景色更新: レベル${this.level}, クラス: ${levelClass}`);
    }
    
    // レベルアップ効果音
    playLevelUpSound() {
        if (!this.soundContext) return;
        
        try {
            // レベルアップ音（上昇音階）
            const frequencies = [523, 659, 784, 1047, 1319]; // C, E, G, C, E
            const duration = 0.08;
            const gainValue = 0.4;
            const fadeOutValue = 0.01;
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.soundContext.createOscillator();
                    const gainNode = this.soundContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.soundContext.destination);
                    
                    oscillator.frequency.setValueAtTime(freq, this.soundContext.currentTime);
                    oscillator.type = 'square';
                    
                    gainNode.gain.setValueAtTime(gainValue, this.soundContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(fadeOutValue, this.soundContext.currentTime + duration);
                    
                    oscillator.start(this.soundContext.currentTime);
                    oscillator.stop(this.soundContext.currentTime + duration);
                }, index * duration * 1000);
            });
            
        } catch (error) {
            console.log('Failed to play level up sound');
        }
    }
    
    activateUlt() {
        if (this.ultCharge < GAME_CONFIG.ULT_ACTIVATION_COST || 
            this.isUltActive || 
            Date.now() < this.ultCooldownEnd ||
            this.isPaused) { // 一時停止中はウルト使用不可
            return false;
        }
        
        this.ultCharge = 0;
        this.isUltActive = true;
        this.ultStartTime = Date.now();
        this.ultCooldownEnd = Date.now() + GAME_CONFIG.ULT_COOLDOWN;
        
        // ウルト効果音を再生
        this.playUltSound();
        
        // ウルトエフェクトを開始
        this.startUltEffect();
        
        // ウルト効果持続時間後に終了
        setTimeout(() => {
            this.deactivateUlt();
        }, GAME_CONFIG.ULT_DURATION);
        
        // UI 初期更新
        this.updateUltDisplay();
    
        // クールダウン終了直後に UI を強制更新（(1) が残るのを確実に防ぐ）
        if (this._ultCooldownTimer) clearTimeout(this._ultCooldownTimer);
        this._ultCooldownTimer = setTimeout(
            () => this.updateUltDisplay(),
            Math.max(0, this.ultCooldownEnd - Date.now() + GAME_CONFIG.COOLDOWN_UI_UPDATE_OFFSET)
        );
    
        return true;
    }
    
    
    // ウルト終了
    deactivateUlt() {
        this.isUltActive = false;
        this.ultEffect = null;
        
        // ウルト効果終了時に次のピースを通常のピースに戻す
        if (this.nextPiece && this.nextPiece.isBomb) {
            this.generateNextPiece();
            this.drawNextPiece();
        }
        
        this.updateUltDisplay();
    }
    
    // ウルトエフェクト開始
    startUltEffect() {
        // ボムモードのみ
        this.ultEffect = 'bombMode';
        console.log('ウルト発動: ボムモード');
        
        // ボムモードを開始
        this.ultBombMode();
    }
    

    
    // ウルト効果: ボムモード
    ultBombMode() {
        // 現在のピースをボムピースに置き換え（1x1の爆弾）
        this.currentPiece = {
            type: 'BOMB',
            shape: [[1]],
            color: '#ff0000',
            isBomb: true,
            x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(1 / 2),
            y: 0
        };
        
        // 次のピースは通常のピースのまま（ボムピースにしない）
        // 画面を更新
        this.draw();
        
        console.log('ウルト使用: 現在のミノをボムピースに置き換え');
    }
    
    // ウルト効果音
    playUltSound() {
        if (!this.soundContext) return;
        
        try {
            // ウルト発動音（上昇音階）
            const frequencies = [440, 554, 659, 784, 880, 1047, 1175, 1319];
            const duration = GAME_CONFIG.SOUND_DURATION_SHORT;
            const gainValue = GAME_CONFIG.SOUND_GAIN_VALUE;
            const fadeOutValue = GAME_CONFIG.SOUND_FADE_OUT_VALUE;
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.soundContext.createOscillator();
                    const gainNode = this.soundContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.soundContext.destination);
                    
                    oscillator.frequency.setValueAtTime(freq, this.soundContext.currentTime);
                    oscillator.type = 'sawtooth';
                    
                    gainNode.gain.setValueAtTime(gainValue, this.soundContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(fadeOutValue, this.soundContext.currentTime + duration);
                    
                    oscillator.start(this.soundContext.currentTime);
                    oscillator.stop(this.soundContext.currentTime + duration);
                }, index * duration * 1000);
            });
            
        } catch (error) {
            console.log('Failed to play ult sound');
        }
    }
    
    // ウルト表示更新
    updateUltDisplay() {
        const ultGauge = document.getElementById('ult-gauge');
        const ultButton = document.getElementById('ult-btn');
        
        if (ultGauge) {
            ultGauge.style.width = `${(this.ultCharge / GAME_CONFIG.ULT_ACTIVATION_COST) * 100}%`;
        }
        
        if (ultButton) {
            const canUse = this.ultCharge >= GAME_CONFIG.ULT_ACTIVATION_COST && 
                          !this.isUltActive && 
                          Date.now() >= this.ultCooldownEnd &&
                          !this.isPaused; // 一時停止中は使用不可
            
            ultButton.disabled = !canUse;
            ultButton.classList.toggle('ready', canUse);
            ultButton.classList.toggle('active', this.isUltActive);
            ultButton.classList.toggle('cooldown', !canUse && Date.now() < this.ultCooldownEnd);
            
            // クールダウン時間の表示を更新
            this.updateUltCountdown();
        }
    }
    
    // ウルトクールダウン時間の表示更新
    updateUltCountdown() {
        const ultButton = document.getElementById('ult-btn');
        const ultText = ultButton?.querySelector('.ult-text');
        const ultCountdown = ultButton?.querySelector('.ult-countdown');
        
        if (!ultButton || !ultText || !ultCountdown) return;
        
        // // クールダウン中の場合
        // if (Date.now() < this.ultCooldownEnd) {
        //     const remainingTime = Math.ceil((this.ultCooldownEnd - Date.now()) / 1000);
            
        //     // 残り時間が1秒未満の場合は通常テキストを表示
        //     if (remainingTime < 1) {
        //         ultText.classList.remove('hidden');
        //         ultCountdown.classList.add('hidden');
        //     } else {
        //         ultCountdown.textContent = `(${remainingTime})`;
        //         ultText.classList.add('hidden');
        //         ultCountdown.classList.remove('hidden');
        //     }
        // } else {
        //     // クールダウン終了
        //     ultText.classList.remove('hidden');
        //     ultCountdown.classList.add('hidden');
        // }
        const now = Date.now();
        const remainingMs = this.ultCooldownEnd - now;
        if (remainingMs <= 0) {
            // 終了：必ずカウント表示を消して通常テキストへ
            ultText.classList.remove('hidden');
            ultCountdown.classList.add('hidden');
            ultCountdown.textContent = '';
            return;
        }
        // 進行中：切り上げ表示（1,2,3,...）
        const remainingSec = Math.ceil(remainingMs / 1000);
        ultCountdown.textContent = `(${remainingSec})`;
        ultText.classList.add('hidden');
        ultCountdown.classList.remove('hidden');
        
        // デバッグ用ログ（必要に応じてコメントアウト）
        // console.log('Cooldown check:', {
        //     now: Date.now(),
        //     cooldownEnd: this.ultCooldownEnd,
        //     remaining: remainingTime,
        //     isActive: Date.now() < this.ultCooldownEnd
        // });
    }
    
    // ボム爆発効果
    explodeBomb() {
        const bombX = this.currentPiece.x;
        const bombY = this.currentPiece.y;
        const explosionRange = GAME_CONFIG.BOMB_EXPLOSION_RANGE;
        
        // 爆発で消えるブロックの位置を記録
        const clearedBlocks = [];
        
        // 爆発範囲内のブロックを消去
        for (let y = bombY - explosionRange; y <= bombY + explosionRange; y++) {
            for (let x = bombX - explosionRange; x <= bombX + explosionRange; x++) {
                if (y >= 0 && y < this.BOARD_HEIGHT && x >= 0 && x < this.BOARD_WIDTH) {
                    if (this.board[y][x] !== 0) {
                        // 消えるブロックの位置を記録
                        clearedBlocks.push({ x: x, y: y, color: this.board[y][x] });
                        this.board[y][x] = 0;
                    }
                }
            }
        }
        
        // 爆発効果音
        this.playExplosionSound();
        
        // 爆発エフェクト
        this.startExplosionEffect(bombX, bombY);
        
        // 消えたブロックのライン消しエフェクトを開始
        this.startBombClearEffect(clearedBlocks);
        
        // スコア加算
        this.score += GAME_CONFIG.BOMB_EXPLOSION_SCORE;
        this.updateDisplay();
        
        // 爆発後にブロックを落下させる
        this.dropBlocksAfterExplosion();
    }
    
    // 爆発効果音
    playExplosionSound() {
        if (!this.soundContext) return;
        
        try {
            const oscillator = this.soundContext.createOscillator();
            const gainNode = this.soundContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.soundContext.destination);
            
            // 爆発音（低周波数から高周波数へ）
            oscillator.frequency.setValueAtTime(50, this.soundContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1000, this.soundContext.currentTime + 0.3);
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(0.5, this.soundContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.soundContext.currentTime + 0.3);
            
            oscillator.start(this.soundContext.currentTime);
            oscillator.stop(this.soundContext.currentTime + 0.3);
            
        } catch (error) {
            console.log('Failed to play explosion sound');
        }
    }
    
    // 爆発エフェクト開始
    startExplosionEffect(x, y) {
        // 爆発エフェクトのアニメーション
        this.explosionEffect = {
            x: x,
            y: y,
            startTime: Date.now(),
            duration: GAME_CONFIG.EXPLOSION_EFFECT_DURATION
        };
    }
    
    // 爆発エフェクト描画
    drawExplosionEffect() {
        if (!this.explosionEffect) return;
        
        const elapsed = Date.now() - this.explosionEffect.startTime;
        const progress = Math.min(elapsed / this.explosionEffect.duration, 1);
        
        if (progress >= 1) {
            this.explosionEffect = null;
            return;
        }
        
        const centerX = this.explosionEffect.x * this.CELL_SIZE + this.CELL_SIZE / 2;
        const centerY = this.explosionEffect.y * this.CELL_SIZE + this.CELL_SIZE / 2;
        const radius = progress * 80; // 5x5範囲に合わせて半径を拡大
        
        this.ctx.save();
        this.ctx.globalAlpha = 1 - progress;
        
        // 爆発の円形エフェクト（5x5範囲）
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // 内側の光る円
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 外側の光るリング（5x5範囲の強調）
        this.ctx.strokeStyle = '#ff8000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 0.9, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    // ウルトエフェクト描画
    drawUltEffect() {
        if (!this.isUltActive) return;
        
        // ウルト発動中の画面全体のエフェクト
        const elapsed = Date.now() - this.ultStartTime;
        const progress = Math.min(elapsed / GAME_CONFIG.ULT_DURATION, 1);
        
        // 進行度に応じてエフェクトの強度を調整
        const intensity = Math.sin(progress * Math.PI * 4) * 0.3 + 0.1; // 0.1〜0.4の範囲
        
        this.ctx.save();
        this.ctx.globalAlpha = intensity;
        
        // ピクセル風のパターンのみ表示（画面全体の光は削除）
        this.drawUltPixelPattern(intensity);
        
        this.ctx.restore();
    }
    
    // ウルトエフェクト用のピクセルパターン描画
    drawUltPixelPattern(intensity) {
        const patternSize = 20;
        const alpha = intensity * 0.5;
        
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        
        for (let y = 0; y < this.canvas.height; y += patternSize) {
            for (let x = 0; x < this.canvas.width; x += patternSize) {
                if ((x + y) % (patternSize * 2) === 0) {
                    this.ctx.fillRect(x, y, 2, 2);
                }
            }
        }
    }
    
    // 爆発後のブロック落下処理
    dropBlocksAfterExplosion() {
        // 爆発エフェクトの表示時間を待ってからブロックを落下させる
        setTimeout(() => {
            // 各列について、下から上に向かってブロックを落下させる
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                this.dropColumnAfterExplosion(x);
            }
            
            // 落下後にライン消去チェックを行う
            setTimeout(() => {
                this.clearLines();
            }, GAME_CONFIG.DROP_ANIMATION_DELAY);
        }, GAME_CONFIG.EXPLOSION_DELAY_BEFORE_DROP);
    }
    
    // ボムで消えたブロックのライン消しエフェクトを開始
    startBombClearEffect(clearedBlocks) {
        // 各ブロックの位置でライン消しエフェクトを開始
        clearedBlocks.forEach(block => {
            this.startBombBlockClearAnimation(block.x, block.y, block.color);
        });
    }
    
    // ボムで消えた個別ブロックのアニメーション
    startBombBlockClearAnimation(x, y, color) {
        // 既存のライン消しアニメーションと同様のエフェクト
        const animation = {
            x: x,
            y: y,
            color: color,
            progress: 0,
            startTime: Date.now(),
            duration: GAME_CONFIG.BOMB_CLEAR_ANIMATION_DURATION
        };
        
        // ボムブロック消去アニメーション配列に追加
        if (!this.bombClearAnimation) {
            this.bombClearAnimation = [];
        }
        this.bombClearAnimation.push(animation);
        
        // アニメーション完了後に配列から削除
        setTimeout(() => {
            if (this.bombClearAnimation) {
                this.bombClearAnimation = this.bombClearAnimation.filter(anim => 
                    anim.x !== x || anim.y !== y
                );
            }
        }, animation.duration);
    }
    
    // ボムブロック消去エフェクトの描画
    drawBombClearEffect() {
        if (!this.bombClearAnimation || this.bombClearAnimation.length === 0) return;
        
        this.bombClearAnimation.forEach(animation => {
            const elapsed = Date.now() - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            
            if (progress >= 1) return;
            
            // ライン消しエフェクトと同様の描画処理
            this.drawBombBlockClearEffect(animation.x, animation.y, progress, animation.color);
        });
    }
    
    // ボムブロック消去エフェクトの個別描画
    drawBombBlockClearEffect(x, y, progress, color) {
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
        
        // メインブロック（元の色を保持）
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
    
    // 特定の列のブロックを落下させる
    dropColumnAfterExplosion(x) {
        // 下から上に向かって処理
        for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
            // 空のセルを見つけた場合
            if (this.board[y][x] === 0) {
                // その上にある最初のブロックを探す
                let sourceY = y - 1;
                while (sourceY >= 0 && this.board[sourceY][x] === 0) {
                    sourceY--;
                }
                
                // ブロックが見つかった場合、それを下に移動
                if (sourceY >= 0 && this.board[sourceY][x] !== 0) {
                    this.board[y][x] = this.board[sourceY][x];
                    this.board[sourceY][x] = 0;
                }
            }
        }
    }

    // ボムブロックをメインゲームボードに描画するためのヘルパー関数
    drawBombBlockOnBoard(x, y) {
        const cellX = x * this.CELL_SIZE;
        const cellY = y * this.CELL_SIZE;
        const cellSize = this.CELL_SIZE;

        // 爆弾の絵文字（💣）を描画
        this.ctx.font = `${cellSize - 4}px Arial, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText('💣', cellX + cellSize/2, cellY + cellSize/2);
    }

    // 落下位置予測の描画（ボムブロックの場合は爆弾絵文字で表示）
    drawBombPreview(x, y) {
        const cellSize = this.CELL_SIZE;
        const cellX = x * cellSize;
        const cellY = y * cellSize;

        // 爆弾の絵文字（💣）を描画
        this.ctx.font = `${cellSize - 4}px Arial, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText('💣', cellX + cellSize/2, cellY + cellSize/2);
    }
}

// ゲーム初期化
let game;

document.addEventListener('DOMContentLoaded', () => {
    game = new TetrisGame();
    game.draw();
    game.drawHoldPiece();
    game.updateUltDisplay();
});