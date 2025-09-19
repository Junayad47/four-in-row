// game.js - Core Game Logic (COMPLETELY FIXED)

const Game = (function() {
    // Game constants
    const ROWS = 6;
    const COLS = 7;
    const WIN_LENGTH = 4;
    
    // Game state
    let state = {
        mode: null, // 'offline' or 'online'
        board: [],
        currentPlayer: 1,
        gameActive: false,
        player1: { name: '', score: 0 },
        player2: { name: '', score: 0 },
        moveHistory: [],
        pendingMove: null,
        startTime: null,
        moveCount: 0,
        lastPlacedCell: null, // Track last placed disc for animation
        // Online specific
        roomCode: null,
        isHost: false,
        myPlayerNumber: null,
        db: null,
        roomRef: null,
        roomListener: null
    };
    
    // Timer variables
    let timerInterval = null;
    
    // Initialize game
    function init() {
        initializeBoard();
        setupColumnIndicators();
        setupBoardEventListeners();
    }
    
    // Initialize empty board
    function initializeBoard() {
        state.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
        state.lastPlacedCell = null;
        renderBoard();
    }
    
    // Setup column indicators
    function setupColumnIndicators() {
        const container = document.getElementById('columnIndicators');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let col = 1; col <= COLS; col++) {
            const indicator = document.createElement('div');
            indicator.className = 'column-indicator';
            indicator.textContent = col;
            container.appendChild(indicator);
        }
    }
    
    // Setup board event listeners
    function setupBoardEventListeners() {
        const board = document.getElementById('gameBoard');
        if (!board) return;
        
        board.addEventListener('click', handleBoardClick);
        board.addEventListener('mouseover', handleBoardHover);
        board.addEventListener('mouseout', handleBoardHoverOut);
        
        // Touch events for mobile
        board.addEventListener('touchstart', handleTouchStart, { passive: true });
    }
    
    // Handle touch start (mobile)
    function handleTouchStart(e) {
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.classList.contains('cell')) {
            const col = parseInt(element.dataset.col);
            selectColumn(col);
        }
    }
    
    // Render board - FIXED to only animate new disc
    function renderBoard() {
        const boardEl = document.getElementById('gameBoard');
        if (!boardEl) return;
        
        // Clear and rebuild board
        boardEl.innerHTML = '';
        
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (state.board[row][col] !== 0) {
                    cell.classList.add('filled');
                    const disc = document.createElement('div');
                    
                    // Only animate the last placed disc
                    if (state.lastPlacedCell && 
                        state.lastPlacedCell.row === row && 
                        state.lastPlacedCell.col === col) {
                        disc.className = `watermelon-disc watermelon-player${state.board[row][col]} animate-drop`;
                        // Remove animation class after animation completes
                        setTimeout(() => {
                            disc.classList.remove('animate-drop');
                        }, 500);
                        state.lastPlacedCell = null; // Reset after animating
                    } else {
                        disc.className = `watermelon-disc watermelon-player${state.board[row][col]}`;
                    }
                    
                    cell.appendChild(disc);
                }
                
                boardEl.appendChild(cell);
            }
        }
        
        updatePlayerIndicator();
    }
    
    // Handle board click
    function handleBoardClick(e) {
        if (!state.gameActive) return;
        
        const cell = e.target.closest('.cell');
        if (!cell) return;
        
        const col = parseInt(cell.dataset.col);
        
        // For online mode, check if it's player's turn
        if (state.mode === 'online' && state.currentPlayer !== state.myPlayerNumber) {
            if (window.App && window.App.showToast) {
                window.App.showToast("It's not your turn!", 'error');
            }
            return;
        }
        
        selectColumn(col);
    }
    
    // Handle board hover
    function handleBoardHover(e) {
        if (!state.gameActive) return;
        
        const cell = e.target.closest('.cell');
        if (!cell) return;
        
        const col = parseInt(cell.dataset.col);
        showPreview(col);
    }
    
    // Handle board hover out
    function handleBoardHoverOut() {
        hidePreview();
    }
    
    // Select column for move
    function selectColumn(col) {
        if (!state.gameActive) return;
        
        // Check if column is full
        if (state.board[0][col] !== 0) {
            if (window.App && window.App.showToast) {
                window.App.showToast('Column is full!', 'error');
            }
            if (window.SoundManager) {
                window.SoundManager.play('error');
            }
            return;
        }
        
        // Show confirmation
        state.pendingMove = col;
        const colNumber = document.getElementById('colNumber');
        if (colNumber) colNumber.textContent = col + 1;
        
        const moveConfirm = document.getElementById('moveConfirm');
        if (moveConfirm) moveConfirm.classList.add('active');
        
        if (window.SoundManager) {
            window.SoundManager.play('select');
        }
    }
    
    // Confirm move
    function confirmMove() {
        if (state.pendingMove === null) return;
        
        const col = state.pendingMove;
        const row = getLowestEmptyRow(col);
        
        if (row === -1) return;
        
        // Make the move and track for animation
        state.board[row][col] = state.currentPlayer;
        state.lastPlacedCell = { row, col }; // Track for animation
        state.moveHistory.push({ row, col, player: state.currentPlayer });
        state.moveCount++;
        
        // Hide confirmation
        const moveConfirm = document.getElementById('moveConfirm');
        if (moveConfirm) moveConfirm.classList.remove('active');
        state.pendingMove = null;
        
        // Play sound and render
        if (window.SoundManager) {
            window.SoundManager.play('drop');
        }
        renderBoard();
        
        // Check for win
        if (checkWin(row, col)) {
            if (state.mode === 'online') {
                // Send final move to Firebase before ending
                sendMoveToFirebase(row, col, true);
            }
            endGame(state.currentPlayer);
        } else if (checkDraw()) {
            if (state.mode === 'online') {
                sendMoveToFirebase(row, col, false, true);
            }
            endGame(0);
        } else {
            // Switch players
            state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
            updatePlayerIndicator();
            
            // For online mode, send move to Firebase
            if (state.mode === 'online') {
                sendMoveToFirebase(row, col);
            }
        }
    }
    
    // Cancel move
    function cancelMove() {
        state.pendingMove = null;
        const moveConfirm = document.getElementById('moveConfirm');
        if (moveConfirm) moveConfirm.classList.remove('active');
        
        if (window.SoundManager) {
            window.SoundManager.play('cancel');
        }
    }
    
    // Get lowest empty row in column
    function getLowestEmptyRow(col) {
        for (let row = ROWS - 1; row >= 0; row--) {
            if (state.board[row][col] === 0) {
                return row;
            }
        }
        return -1;
    }
    
    // Check for win
    function checkWin(row, col) {
        const player = state.board[row][col];
        
        // Check all four directions
        if (checkDirection(row, col, 0, 1, player)) return true;  // Horizontal
        if (checkDirection(row, col, 1, 0, player)) return true;  // Vertical
        if (checkDirection(row, col, 1, 1, player)) return true;  // Diagonal \
        if (checkDirection(row, col, 1, -1, player)) return true; // Diagonal /
        
        return false;
    }
    
    // Check direction for win
    function checkDirection(row, col, dRow, dCol, player) {
        let count = 1;
        const cells = [[row, col]];
        
        // Check forward
        for (let i = 1; i < WIN_LENGTH; i++) {
            const newRow = row + dRow * i;
            const newCol = col + dCol * i;
            if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS && 
                state.board[newRow][newCol] === player) {
                count++;
                cells.push([newRow, newCol]);
            } else break;
        }
        
        // Check backward
        for (let i = 1; i < WIN_LENGTH; i++) {
            const newRow = row - dRow * i;
            const newCol = col - dCol * i;
            if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS && 
                state.board[newRow][newCol] === player) {
                count++;
                cells.push([newRow, newCol]);
            } else break;
        }
        
        if (count >= WIN_LENGTH) {
            highlightWinningCells(cells);
            return true;
        }
        return false;
    }
    
    // Highlight winning cells
    function highlightWinningCells(cells) {
        setTimeout(() => {
            cells.forEach(([row, col]) => {
                const index = row * COLS + col;
                const cellElements = document.querySelectorAll('.cell');
                if (cellElements[index]) {
                    cellElements[index].classList.add('winning');
                }
            });
        }, 100);
    }
    
    // Check for draw
    function checkDraw() {
        return state.board[0].every(cell => cell !== 0);
    }
    
    // Show preview
    function showPreview(col) {
        if (!state.gameActive) return;
        if (state.mode === 'online' && state.currentPlayer !== state.myPlayerNumber) return;
        
        const row = getLowestEmptyRow(col);
        if (row === -1) return;
        
        const index = row * COLS + col;
        const cells = document.querySelectorAll('.cell');
        if (cells[index]) {
            cells[index].classList.add('preview');
        }
    }
    
    // Hide preview
    function hidePreview() {
        document.querySelectorAll('.cell.preview').forEach(cell => {
            cell.classList.remove('preview');
        });
    }
    
    // Update player indicator
    function updatePlayerIndicator() {
        const p1Card = document.getElementById('player1Card');
        const p2Card = document.getElementById('player2Card');
        const p1Indicator = document.getElementById('p1Indicator');
        const p2Indicator = document.getElementById('p2Indicator');
        
        if (!p1Card || !p2Card) return;
        
        if (state.currentPlayer === 1) {
            p1Card.classList.add('active');
            p2Card.classList.remove('active');
            if (p1Indicator) p1Indicator.style.display = 'block';
            if (p2Indicator) p2Indicator.style.display = 'none';
        } else {
            p2Card.classList.add('active');
            p1Card.classList.remove('active');
            if (p2Indicator) p2Indicator.style.display = 'block';
            if (p1Indicator) p1Indicator.style.display = 'none';
        }
        
        // Update status text
        const statusText = document.getElementById('statusText');
        if (statusText) {
            const currentPlayerName = state.currentPlayer === 1 ? state.player1.name : state.player2.name;
            
            if (state.mode === 'online' && state.currentPlayer === state.myPlayerNumber) {
                statusText.textContent = 'Your Turn';
            } else if (state.mode === 'online') {
                statusText.textContent = `${currentPlayerName}'s Turn`;
            } else {
                statusText.textContent = `${currentPlayerName}'s Turn`;
            }
        }
    }
    
    // End game
    function endGame(winner) {
        state.gameActive = false;
        clearInterval(timerInterval);
        
        if (window.SoundManager) {
            window.SoundManager.play('win');
        }
        
        const winOverlay = document.getElementById('winOverlay');
        const winTitle = document.getElementById('winTitle');
        const winPlayer = document.getElementById('winPlayer');
        const winMoves = document.getElementById('winMoves');
        const winTime = document.getElementById('winTime');
        
        // Calculate game time
        const gameTime = Math.floor((Date.now() - state.startTime) / 1000);
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        
        if (winMoves) winMoves.textContent = state.moveCount;
        if (winTime) winTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (winner === 0) {
            if (winTitle) winTitle.textContent = "🤝 It's a Draw! 🤝";
            if (winPlayer) winPlayer.textContent = "No winner this time!";
        } else {
            const playerName = winner === 1 ? state.player1.name : state.player2.name;
            if (winTitle) winTitle.textContent = "🎉 Victory! 🎉";
            if (winPlayer) winPlayer.textContent = `${playerName} Wins!`;
            
            // Update score
            if (winner === 1) {
                state.player1.score++;
                const p1Score = document.getElementById('p1Score');
                if (p1Score) p1Score.textContent = state.player1.score;
            } else {
                state.player2.score++;
                const p2Score = document.getElementById('p2Score');
                if (p2Score) p2Score.textContent = state.player2.score;
            }
        }
        
        if (winOverlay) winOverlay.classList.add('active');
        
        // Trigger confetti animation
        if (window.ParticleSystem && window.ParticleSystem.celebrate) {
            window.ParticleSystem.celebrate();
        }
    }
    
    // Start game function
    function startGame() {
        state.gameActive = true;
        state.currentPlayer = 1;
        state.moveCount = 0;
        initializeBoard();
        startTimer();
        
        // Update UI with player names
        const p1Name = document.getElementById('p1Name');
        const p2Name = document.getElementById('p2Name');
        if (p1Name) p1Name.textContent = state.player1.name || 'Player 1';
        if (p2Name) p2Name.textContent = state.player2.name || 'Player 2';
    }
    
    // Undo last move (offline only)
    function undoMove() {
        if (state.mode === 'online') {
            if (window.App && window.App.showToast) {
                window.App.showToast("Can't undo in online mode", 'error');
            }
            return;
        }
        
        if (state.moveHistory.length === 0) {
            if (window.App && window.App.showToast) {
                window.App.showToast('No moves to undo', 'error');
            }
            return;
        }
        
        const lastMove = state.moveHistory.pop();
        state.board[lastMove.row][lastMove.col] = 0;
        state.currentPlayer = lastMove.player;
        state.moveCount--;
        state.lastPlacedCell = null; // Clear animation tracking
        renderBoard();
        
        if (window.SoundManager) {
            window.SoundManager.play('undo');
        }
        if (window.App && window.App.showToast) {
            window.App.showToast('Move undone', 'success');
        }
    }
    
    // Show hint
    function showHint() {
        if (!state.gameActive) return;
        
        const bestCol = findBestMove();
        
        if (bestCol !== -1) {
            const row = getLowestEmptyRow(bestCol);
            const index = row * COLS + bestCol;
            const cells = document.querySelectorAll('.cell');
            if (cells[index]) {
                cells[index].classList.add('hint');
                setTimeout(() => {
                    cells[index].classList.remove('hint');
                }, 2000);
            }
            
            if (window.SoundManager) {
                window.SoundManager.play('hint');
            }
            if (window.App && window.App.showToast) {
                window.App.showToast(`Try column ${bestCol + 1}`, 'success');
            }
        }
    }
    
    // Find best move (simple AI)
    function findBestMove() {
        // Check if current player can win
        for (let col = 0; col < COLS; col++) {
            const row = getLowestEmptyRow(col);
            if (row === -1) continue;
            
            state.board[row][col] = state.currentPlayer;
            if (checkWin(row, col)) {
                state.board[row][col] = 0;
                return col;
            }
            state.board[row][col] = 0;
        }
        
        // Check if opponent can win (block them)
        const opponent = state.currentPlayer === 1 ? 2 : 1;
        for (let col = 0; col < COLS; col++) {
            const row = getLowestEmptyRow(col);
            if (row === -1) continue;
            
            state.board[row][col] = opponent;
            if (checkWin(row, col)) {
                state.board[row][col] = 0;
                return col;
            }
            state.board[row][col] = 0;
        }
        
        // Prefer center columns
        const centerCols = [3, 2, 4, 1, 5, 0, 6];
        for (const col of centerCols) {
            if (getLowestEmptyRow(col) !== -1) {
                return col;
            }
        }
        
        return -1;
    }
    
    // Start game timer
    function startTimer() {
        state.startTime = Date.now();
        
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!state.gameActive) {
                clearInterval(timerInterval);
                return;
            }
            
            const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            const timerValue = document.getElementById('timerValue');
            if (timerValue) {
                timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    // Create online room - FIXED
    async function createOnlineRoom(playerName) {
        if (!window.firebase || !window.firebase.apps.length) {
            throw new Error('Firebase not initialized');
        }
        
        state.db = window.firebase.database();
        state.roomCode = generateRoomCode();
        state.isHost = true;
        state.myPlayerNumber = 1;
        state.player1.name = playerName;
        
        // Clean up any existing listener
        if (state.roomListener && state.roomRef) {
            state.roomRef.off('value', state.roomListener);
        }
        
        state.roomRef = state.db.ref(`rooms/${state.roomCode}`);
        
        await state.roomRef.set({
            host: playerName,
            player1: playerName,
            player2: null,
            board: state.board,
            currentPlayer: 1,
            gameActive: false,
            lastMove: null,
            created: Date.now(),
            gameStarted: false
        });
        
        // Listen for changes
        state.roomListener = state.roomRef.on('value', (snapshot) => {
            handleRoomUpdate(snapshot);
        });
        
        // Update UI to show player name
        const p1Name = document.getElementById('p1Name');
        if (p1Name) p1Name.textContent = playerName;
        
        return state.roomCode;
    }
    
    // Join online room - FIXED
    async function joinOnlineRoom(roomCode, playerName) {
        if (!window.firebase || !window.firebase.apps.length) {
            throw new Error('Firebase not initialized');
        }
        
        state.db = window.firebase.database();
        state.roomCode = roomCode;
        state.isHost = false;
        state.myPlayerNumber = 2;
        state.player2.name = playerName;
        
        // Clean up any existing listener
        if (state.roomListener && state.roomRef) {
            state.roomRef.off('value', state.roomListener);
        }
        
        state.roomRef = state.db.ref(`rooms/${roomCode}`);
        
        try {
            const snapshot = await state.roomRef.once('value');
            const data = snapshot.val();
            
            if (!data) {
                throw new Error('Room not found');
            }
            
            if (data.player2) {
                throw new Error('Room is full');
            }
            
            state.player1.name = data.player1;
            
            // Update room with player 2
            await state.roomRef.update({
                player2: playerName,
                gameActive: true,
                gameStarted: true
            });
            
            // Listen for changes
            state.roomListener = state.roomRef.on('value', (snapshot) => {
                handleRoomUpdate(snapshot);
            });
            
            // Update UI immediately
            const p1Name = document.getElementById('p1Name');
            const p2Name = document.getElementById('p2Name');
            if (p1Name) p1Name.textContent = state.player1.name;
            if (p2Name) p2Name.textContent = state.player2.name;
            
            // Hide setup modal and show game area
            const setupModal = document.getElementById('setupModal');
            const gameArea = document.getElementById('gameArea');
            if (setupModal) setupModal.classList.remove('active');
            if (gameArea) gameArea.classList.add('active');
            
            // Start the game
            startGame();
            
            return true;
        } catch (error) {
            console.error('Error joining room:', error);
            throw error;
        }
    }
    
    // Handle room updates from Firebase - FIXED
    function handleRoomUpdate(snapshot) {
        const data = snapshot.val();
        if (!data) return;
        
        // For host: when player 2 joins
        if (state.isHost && data.player2 && !state.player2.name) {
            state.player2.name = data.player2;
            const p2Name = document.getElementById('p2Name');
            if (p2Name) p2Name.textContent = data.player2;
            
            // Start game for host
            const setupModal = document.getElementById('setupModal');
            const gameArea = document.getElementById('gameArea');
            
            if (setupModal) setupModal.classList.remove('active');
            if (gameArea) gameArea.classList.add('active');
            
            startGame();
            
            if (window.App && window.App.showToast) {
                window.App.showToast(`${data.player2} joined the game!`, 'success');
            }
        }
        
        // Update game state
        if (data.gameActive !== undefined) {
            state.gameActive = data.gameActive;
        }
        
        // Update board if changed by opponent
        if (data.lastMove && data.lastMove.player !== state.myPlayerNumber) {
            const move = data.lastMove;
            state.board[move.row][move.col] = move.player;
            state.lastPlacedCell = { row: move.row, col: move.col }; // Track for animation
            state.currentPlayer = data.currentPlayer;
            state.moveCount++;
            
            renderBoard();
            
            if (window.SoundManager && window.SoundManager.play) {
                window.SoundManager.play('drop');
            }
            
            if (move.isWin) {
                endGame(move.player);
            } else if (move.isDraw) {
                endGame(0);
            } else {
                updatePlayerIndicator();
            }
        }
    }
    
    // Send move to Firebase
    async function sendMoveToFirebase(row, col, isWin = false, isDraw = false) {
        if (!state.roomRef) return;
        
        try {
            await state.roomRef.update({
                board: state.board,
                currentPlayer: state.currentPlayer,
                lastMove: {
                    row: row,
                    col: col,
                    player: state.myPlayerNumber,
                    isWin: isWin,
                    isDraw: isDraw
                }
            });
        } catch (error) {
            console.error('Error sending move:', error);
        }
    }
    
    // Generate room code
    function generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }
    
    // Reset game
    function resetGame() {
        state.lastPlacedCell = null;
        initializeBoard();
        state.moveHistory = [];
        state.moveCount = 0;
        state.currentPlayer = 1;
        clearInterval(timerInterval);
    }
    
    // Public API
    return {
        init: init,
        setMode: function(mode) { state.mode = mode; },
        getMode: function() { return state.mode; },
        setPlayers: function(p1, p2) {
            state.player1.name = p1;
            state.player2.name = p2;
        },
        start: startGame,
        reset: resetGame,
        selectColumn: selectColumn,
        confirmMove: confirmMove,
        cancelMove: cancelMove,
        undoMove: undoMove,
        showHint: showHint,
        isActive: function() { return state.gameActive; },
        hasPendingMove: function() { return state.pendingMove !== null; },
        getState: function() { return Object.assign({}, state); },
        loadState: function(savedState) {
            state = Object.assign({}, savedState);
            renderBoard();
            updatePlayerIndicator();
            const p1Name = document.getElementById('p1Name');
            const p2Name = document.getElementById('p2Name');
            const p1Score = document.getElementById('p1Score');
            const p2Score = document.getElementById('p2Score');
            
            if (p1Name) p1Name.textContent = state.player1.name;
            if (p2Name) p2Name.textContent = state.player2.name;
            if (p1Score) p1Score.textContent = state.player1.score;
            if (p2Score) p2Score.textContent = state.player2.score;
            
            startTimer();
        },
        createOnlineRoom: createOnlineRoom,
        joinOnlineRoom: joinOnlineRoom
    };
})();

// Export to global scope
window.Game = Game;
