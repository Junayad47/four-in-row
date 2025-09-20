// game.js - Core Game Logic (FIXED VERSION)

(function(window) {
    'use strict';
    
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
        lastDroppedCell: null, // Track only the last dropped disc
        lastMoveTimestamp: null, // Track timestamp for online sync
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
        state.lastDroppedCell = null;
        renderBoard(false); // Don't animate on init
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
    
    // Setup board event listeners - FIXED for mobile
    function setupBoardEventListeners() {
        const board = document.getElementById('gameBoard');
        if (!board) return;
        
        // Remove old listeners
        const newBoard = board.cloneNode(true);
        board.parentNode.replaceChild(newBoard, board);
        
        // Add new listeners
        newBoard.addEventListener('click', handleBoardClick);
        newBoard.addEventListener('mouseover', handleBoardHover);
        newBoard.addEventListener('mouseout', handleBoardHoverOut);
        
        // FIXED: Better mobile touch handling
        newBoard.addEventListener('touchstart', handleTouchStart, { passive: false });
        newBoard.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
    
    // FIXED: Handle touch start
    function handleTouchStart(e) {
        e.preventDefault(); // Prevent default touch behavior
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.classList.contains('cell')) {
            const col = parseInt(element.dataset.col);
            showPreview(col);
        }
    }
    
    // FIXED: Handle touch end
    function handleTouchEnd(e) {
        e.preventDefault(); // Prevent default touch behavior
        const touch = e.changedTouches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        hidePreview();
        if (element && element.classList.contains('cell')) {
            const col = parseInt(element.dataset.col);
            selectColumn(col);
        }
    }
    
    // Render board - COMPLETELY FIXED animation logic
    function renderBoard(animateLastDrop = true) {
        const boardEl = document.getElementById('gameBoard');
        if (!boardEl) return;
        
        boardEl.innerHTML = ''; // Always rebuild for simplicity and reliability
        
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (state.board[row][col] !== 0) {
                    cell.classList.add('filled');
                    const disc = document.createElement('div');
                    
                    // FIXED: Only animate the specific last dropped disc
                    if (animateLastDrop && 
                        state.lastDroppedCell && 
                        state.lastDroppedCell.row === row && 
                        state.lastDroppedCell.col === col) {
                        disc.className = `watermelon-disc watermelon-player${state.board[row][col]} drop-animation`;
                        // Clear the lastDroppedCell after animation starts
                        setTimeout(() => {
                            state.lastDroppedCell = null;
                        }, 600);
                    } else {
                        disc.className = `watermelon-disc watermelon-player${state.board[row][col]}`;
                    }
                    
                    cell.appendChild(disc);
                }
                
                boardEl.appendChild(cell);
            }
        }
        
        // Check for danger moves (opponent can win)
        checkForDangerMoves();
        updatePlayerIndicator();
    }
    
    // Check for danger moves
    function checkForDangerMoves() {
        if (!state.gameActive) return;
        
        const cells = document.querySelectorAll('.cell');
        
        // Clear previous danger indicators
        cells.forEach(cell => {
            cell.classList.remove('danger');
            cell.classList.remove('win-opportunity');
        });
        
        const opponent = state.currentPlayer === 1 ? 2 : 1;
        
        // Check if opponent can win (danger)
        for (let col = 0; col < COLS; col++) {
            const row = getLowestEmptyRow(col);
            if (row === -1) continue;
            
            // Simulate opponent's move
            state.board[row][col] = opponent;
            if (checkWin(row, col, false)) {
                const index = row * COLS + col;
                cells[index].classList.add('danger');
            }
            state.board[row][col] = 0; // Undo simulation
        }
        
        // Check if current player can win (opportunity)
        for (let col = 0; col < COLS; col++) {
            const row = getLowestEmptyRow(col);
            if (row === -1) continue;
            
            // Simulate current player's move
            state.board[row][col] = state.currentPlayer;
            if (checkWin(row, col, false)) {
                const index = row * COLS + col;
                cells[index].classList.add('win-opportunity');
            }
            state.board[row][col] = 0; // Undo simulation
        }
    }
    
    // Handle board click - FIXED for online mode
    function handleBoardClick(e) {
        if (!state.gameActive) {
            console.log('Game not active');
            return;
        }
        
        const cell = e.target.closest('.cell');
        if (!cell) return;
        
        const col = parseInt(cell.dataset.col);
        
        // FIXED: For online mode, check if it's player's turn
        if (state.mode === 'online') {
            console.log('Online mode - Current:', state.currentPlayer, 'My:', state.myPlayerNumber);
            if (state.myPlayerNumber && state.currentPlayer !== state.myPlayerNumber) {
                showToast("It's not your turn!", 'error');
                return;
            }
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
            showToast('Column is full!', 'error');
            playSound('error');
            return;
        }
        
        // Show confirmation
        state.pendingMove = col;
        const colNumber = document.getElementById('colNumber');
        if (colNumber) colNumber.textContent = col + 1;
        
        const moveConfirm = document.getElementById('moveConfirm');
        if (moveConfirm) moveConfirm.classList.add('active');
        
        playSound('select');
    }
    
    // Confirm move - FIXED for online mode
    function confirmMove() {
        if (state.pendingMove === null) return;
        
        const col = state.pendingMove;
        const row = getLowestEmptyRow(col);
        
        if (row === -1) return;
        
        // Make the move
        state.board[row][col] = state.currentPlayer;
        state.lastDroppedCell = { row, col }; // Track for animation
        state.moveHistory.push({ row, col, player: state.currentPlayer });
        state.moveCount++;
        
        // Hide confirmation
        const moveConfirm = document.getElementById('moveConfirm');
        if (moveConfirm) moveConfirm.classList.remove('active');
        state.pendingMove = null;
        
        // Play sound and render with animation
        playSound('drop');
        renderBoard(true);
        
        // Check for win
        if (checkWin(row, col, true)) {
            if (state.mode === 'online') {
                sendMoveToFirebase(row, col, true, false);
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
            
            // For online mode, send move to Firebase
            if (state.mode === 'online') {
                sendMoveToFirebase(row, col, false, false);
            }
            
            updatePlayerIndicator();
        }
    }
    
    // Cancel move
    function cancelMove() {
        state.pendingMove = null;
        const moveConfirm = document.getElementById('moveConfirm');
        if (moveConfirm) moveConfirm.classList.remove('active');
        playSound('cancel');
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
    function checkWin(row, col, highlight = true) {
        const player = state.board[row][col];
        
        // Check all four directions
        const horizontal = checkDirection(row, col, 0, 1, player);
        const vertical = checkDirection(row, col, 1, 0, player);
        const diagonal1 = checkDirection(row, col, 1, 1, player);
        const diagonal2 = checkDirection(row, col, 1, -1, player);
        
        const winningCells = horizontal || vertical || diagonal1 || diagonal2;
        
        if (winningCells && highlight) {
            highlightWinningCells(winningCells);
        }
        
        return winningCells !== null;
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
        
        return count >= WIN_LENGTH ? cells : null;
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
        playSound('win');
        
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
        
        // Trigger confetti
        if (window.ParticleSystem && window.ParticleSystem.celebrate) {
            window.ParticleSystem.celebrate();
        }
    }
    
    // Start game
    function startGame() {
        state.gameActive = true;
        state.currentPlayer = 1;
        state.moveCount = 0;
        state.lastDroppedCell = null;
        initializeBoard();
        startTimer();
        
        // Ensure names are displayed
        const p1Name = document.getElementById('p1Name');
        const p2Name = document.getElementById('p2Name');
        if (p1Name && state.player1.name) p1Name.textContent = state.player1.name;
        if (p2Name && state.player2.name) p2Name.textContent = state.player2.name;
    }
    
    // Undo last move
    function undoMove() {
        if (state.mode === 'online') {
            showToast("Can't undo in online mode", 'error');
            return;
        }
        
        if (state.moveHistory.length === 0) {
            showToast('No moves to undo', 'error');
            return;
        }
        
        const lastMove = state.moveHistory.pop();
        state.board[lastMove.row][lastMove.col] = 0;
        state.currentPlayer = lastMove.player;
        state.moveCount--;
        state.lastDroppedCell = null;
        renderBoard(false);
        playSound('undo');
        showToast('Move undone', 'success');
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
            
            playSound('hint');
            showToast(`Try column ${bestCol + 1}`, 'success');
        }
    }
    
    // Find best move
    function findBestMove() {
        // Check if current player can win
        for (let col = 0; col < COLS; col++) {
            const row = getLowestEmptyRow(col);
            if (row === -1) continue;
            
            state.board[row][col] = state.currentPlayer;
            if (checkWin(row, col, false)) {
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
            if (checkWin(row, col, false)) {
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
    
    // Start timer
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
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            throw new Error('Firebase not initialized');
        }
        
        state.db = window.firebase.database();
        state.roomCode = generateRoomCode();
        state.isHost = true;
        state.myPlayerNumber = 1; // Host is always player 1
        state.player1.name = playerName;
        
        // Clean up existing listener
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
        state.roomListener = handleRoomUpdate;
        state.roomRef.on('value', state.roomListener);
        
        // Update UI
        const p1Name = document.getElementById('p1Name');
        if (p1Name) p1Name.textContent = playerName;
        
        return state.roomCode;
    }
    
    // Join online room - FULLY FIXED
    async function joinOnlineRoom(roomCode, playerName) {
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            throw new Error('Firebase not initialized');
        }
        
        state.db = window.firebase.database();
        state.roomCode = roomCode;
        state.isHost = false;
        state.myPlayerNumber = 2; // Joiner is always player 2
        state.player2.name = playerName;
        
        // Clean up existing listener
        if (state.roomListener && state.roomRef) {
            state.roomRef.off('value', state.roomListener);
        }
        
        state.roomRef = state.db.ref(`rooms/${roomCode}`);
        
        const snapshot = await state.roomRef.once('value');
        const data = snapshot.val();
        
        if (!data) {
            throw new Error('Room not found');
        }
        
        if (data.player2) {
            throw new Error('Room is full');
        }
        
        state.player1.name = data.player1;
        
        // Listen for changes FIRST
        state.roomListener = handleRoomUpdate;
        state.roomRef.on('value', state.roomListener);
        
        // Update room with player 2 joining
        await state.roomRef.update({
            player2: playerName,
            gameActive: true,
            gameStarted: true
        });
        
        // Update UI
        const p1Name = document.getElementById('p1Name');
        const p2Name = document.getElementById('p2Name');
        if (p1Name) p1Name.textContent = state.player1.name;
        if (p2Name) p2Name.textContent = state.player2.name;
        
        // Initialize game state
        state.board = data.board || Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
        state.currentPlayer = data.currentPlayer || 1;
        state.gameActive = true;
        state.moveCount = 0;
        state.lastDroppedCell = null;
        
        renderBoard(false);
        startTimer();
        updatePlayerIndicator();
        
        return true;
    }
    
    // Handle room updates - FIXED
    function handleRoomUpdate(snapshot) {
        const data = snapshot.val();
        if (!data) return;
        
        // For host: when player 2 joins
        if (state.isHost && data.player2 && !state.player2.name) {
            state.player2.name = data.player2;
            const p2Name = document.getElementById('p2Name');
            if (p2Name) p2Name.textContent = data.player2;
            
            const setupModal = document.getElementById('setupModal');
            const gameArea = document.getElementById('gameArea');
            
            if (setupModal) setupModal.classList.remove('active');
            if (gameArea) gameArea.classList.add('active');
            
            startGame();
            showToast(`${data.player2} joined the game!`, 'success');
        }
        
        // Handle game updates from opponent
        if (data.lastMove && 
            data.lastMove.timestamp && 
            (!state.lastMoveTimestamp || data.lastMove.timestamp > state.lastMoveTimestamp)) {
            
            state.lastMoveTimestamp = data.lastMove.timestamp;
            
            // Only update if move was made by opponent
            if (data.lastMove.player !== state.myPlayerNumber) {
                const move = data.lastMove;
                state.board[move.row][move.col] = move.player;
                state.lastDroppedCell = { row: move.row, col: move.col };
                state.moveCount++;
                
                // Update current player
                state.currentPlayer = data.currentPlayer;
                
                renderBoard(true);
                playSound('drop');
                
                if (move.isWin) {
                    endGame(move.player);
                } else if (move.isDraw) {
                    endGame(0);
                } else {
                    updatePlayerIndicator();
                }
            }
        }
        
        // Update game state
        if (data.gameActive !== undefined) {
            state.gameActive = data.gameActive;
        }
        
        // Sync current player
        if (data.currentPlayer !== undefined && !data.lastMove) {
            state.currentPlayer = data.currentPlayer;
            updatePlayerIndicator();
        }
    }
    
    // Send move to Firebase - FIXED
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
                    isDraw: isDraw,
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            console.error('Error sending move to Firebase:', error);
            showToast('Failed to send move. Please check connection.', 'error');
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
        state.lastDroppedCell = null;
        initializeBoard();
        state.moveHistory = [];
        state.moveCount = 0;
        state.currentPlayer = 1;
        clearInterval(timerInterval);
    }
    
    // Helper functions
    function showToast(message, type = 'info') {
        if (window.App && window.App.showToast) {
            window.App.showToast(message, type);
        }
    }
    
    function playSound(sound) {
        if (window.SoundManager && window.SoundManager.play) {
            window.SoundManager.play(sound);
        }
    }
    
    // Public API
    window.Game = {
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
            renderBoard(false);
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
    
})(window);
