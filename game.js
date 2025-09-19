// game.js - Core Game Logic

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
        // Online specific
        roomCode: null,
        isHost: false,
        myPlayerNumber: null,
        db: null,
        roomRef: null
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
        renderBoard();
    }
    
    // Setup column indicators
    function setupColumnIndicators() {
        const container = document.getElementById('columnIndicators');
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
        
        board.addEventListener('click', handleBoardClick);
        board.addEventListener('mouseover', handleBoardHover);
        board.addEventListener('mouseout', handleBoardHoverOut);
    }
    
    // Render board
    function renderBoard() {
        const boardEl = document.getElementById('gameBoard');
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
                    disc.className = `watermelon-disc watermelon-player${state.board[row][col]}`;
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
            App.showToast("It's not your turn!", 'error');
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
            App.showToast('Column is full!', 'error');
            SoundManager.play('error');
            return;
        }
        
        // Show confirmation
        state.pendingMove = col;
        document.getElementById('colNumber').textContent = col + 1;
        document.getElementById('moveConfirm').classList.add('active');
        SoundManager.play('select');
    }
    
    // Confirm move
    function confirmMove() {
        if (state.pendingMove === null) return;
        
        const col = state.pendingMove;
        const row = getLowestEmptyRow(col);
        
        if (row === -1) return;
        
        // Make the move
        state.board[row][col] = state.currentPlayer;
        state.moveHistory.push({ row, col, player: state.currentPlayer });
        state.moveCount++;
        
        // Hide confirmation
        document.getElementById('moveConfirm').classList.remove('active');
        state.pendingMove = null;
        
        // Play sound and render
        SoundManager.play('drop');
        renderBoard();
        
        // Animate the drop
        animateDisc(row, col);
        
        // Check for win
        if (checkWin(row, col)) {
            endGame(state.currentPlayer);
        } else if (checkDraw()) {
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
        document.getElementById('moveConfirm').classList.remove('active');
        SoundManager.play('cancel');
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
        cells.forEach(([row, col]) => {
            const index = row * COLS + col;
            document.querySelectorAll('.cell')[index].classList.add('winning');
        });
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
        const cell = document.querySelectorAll('.cell')[index];
        cell.classList.add('preview');
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
        
        if (state.currentPlayer === 1) {
            p1Card.classList.add('active');
            p2Card.classList.remove('active');
            p1Indicator.style.display = 'block';
            p2Indicator.style.display = 'none';
        } else {
            p2Card.classList.add('active');
            p1Card.classList.remove('active');
            p2Indicator.style.display = 'block';
            p1Indicator.style.display = 'none';
        }
        
        // Update status text
        const statusText = document.getElementById('statusText');
        const currentPlayerName = state.currentPlayer === 1 ? state.player1.name : state.player2.name;
        statusText.textContent = `${currentPlayerName}'s Turn`;
    }
    
    // Animate disc drop
    function animateDisc(row, col) {
        const index = row * COLS + col;
        const cell = document.querySelectorAll('.cell')[index];
        const disc = cell.querySelector('.watermelon-disc');
        
        if (disc) {
            disc.style.animation = 'none';
            setTimeout(() => {
                disc.style.animation = '';
            }, 10);
        }
    }
    
    // End game
    function endGame(winner) {
        state.gameActive = false;
        clearInterval(timerInterval);
        SoundManager.play('win');
        
        const winOverlay = document.getElementById('winOverlay');
        const winTitle = document.getElementById('winTitle');
        const winPlayer = document.getElementById('winPlayer');
        const winMoves = document.getElementById('winMoves');
        const winTime = document.getElementById('winTime');
        
        // Calculate game time
        const gameTime = Math.floor((Date.now() - state.startTime) / 1000);
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        
        winMoves.textContent = state.moveCount;
        winTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (winner === 0) {
            winTitle.textContent = "🤝 It's a Draw! 🤝";
            winPlayer.textContent = "No winner this time!";
        } else {
            const playerName = winner === 1 ? state.player1.name : state.player2.name;
            winTitle.textContent = "🎉 Victory! 🎉";
            winPlayer.textContent = `${playerName} Wins!`;
            
            // Update score
            if (winner === 1) {
                state.player1.score++;
                document.getElementById('p1Score').textContent = state.player1.score;
            } else {
                state.player2.score++;
                document.getElementById('p2Score').textContent = state.player2.score;
            }
        }
        
        winOverlay.classList.add('active');
        
        // Trigger confetti animation
        ParticleSystem.celebrate();
    }
    
    // Undo last move (offline only)
    function undoMove() {
        if (state.mode === 'online') {
            App.showToast("Can't undo in online mode", 'error');
            return;
        }
        
        if (state.moveHistory.length === 0) {
            App.showToast('No moves to undo', 'error');
            return;
        }
        
        const lastMove = state.moveHistory.pop();
        state.board[lastMove.row][lastMove.col] = 0;
        state.currentPlayer = lastMove.player;
        state.moveCount--;
        renderBoard();
        SoundManager.play('undo');
        App.showToast('Move undone', 'success');
    }
    
    // Show hint
    function showHint() {
        if (!state.gameActive) return;
        
        // Find best move (simple AI)
        const bestCol = findBestMove();
        
        if (bestCol !== -1) {
            const row = getLowestEmptyRow(bestCol);
            const index = row * COLS + bestCol;
            const cell = document.querySelectorAll('.cell')[index];
            
            // Highlight hint
            cell.classList.add('hint');
            setTimeout(() => {
                cell.classList.remove('hint');
            }, 2000);
            
            SoundManager.play('hint');
            App.showToast(`Try column ${bestCol + 1}`, 'success');
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
        
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            
            document.getElementById('timerValue').textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    // Create online room
    async function createOnlineRoom(playerName) {
        if (!firebase.apps.length) {
            throw new Error('Firebase not initialized');
        }
        
        state.db = firebase.database();
        state.roomCode = generateRoomCode();
        state.isHost = true;
        state.myPlayerNumber = 1;
        state.player1.name = playerName;
        
        state.roomRef = state.db.ref(`rooms/${state.roomCode}`);
        
        await state.roomRef.set({
            host: playerName,
            player1: playerName,
            player2: null,
            board: state.board,
            currentPlayer: 1,
            gameActive: false,
            lastMove: null,
            created: Date.now()
        });
        
        // Listen for changes
        state.roomRef.on('value', handleRoomUpdate);
        
        return state.roomCode;
    }
    
    // Join online room
    async function joinOnlineRoom(roomCode, playerName) {
        if (!firebase.apps.length) {
            throw new Error('Firebase not initialized');
        }
        
        state.db = firebase.database();
        state.roomCode = roomCode;
        state.isHost = false;
        state.myPlayerNumber = 2;
        state.player2.name = playerName;
        
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
        
        await state.roomRef.update({
            player2: playerName,
            gameActive: true
        });
        
        // Listen for changes
        state.roomRef.on('value', handleRoomUpdate);
        
        // Update UI
        document.getElementById('p1Name').textContent = state.player1.name;
        document.getElementById('p2Name').textContent = state.player2.name;
        
        // Start game
        start();
    }
    
    // Handle room updates from Firebase
    function handleRoomUpdate(snapshot) {
        const data = snapshot.val();
        if (!data) return;
        
        // Update players
        if (data.player2 && !state.player2.name) {
            state.player2.name = data.player2;
            document.getElementById('p2Name').textContent = data.player2;
            
            if (state.isHost) {
                // Both players joined, start game
                document.getElementById('setupModal').classList.remove('active');
                document.getElementById('gameArea').classList.add('active');
                start();
                
                App.showToast(`${data.player2} joined the game!`, 'success');
            }
        }
        
        // Update board if changed by opponent
        if (data.lastMove && data.lastMove.player !== state.myPlayerNumber) {
            const move = data.lastMove;
            state.board[move.row][move.col] = move.player;
            state.currentPlayer = data.currentPlayer;
            state.moveCount++;
            
            renderBoard();
            animateDisc(move.row, move.col);
            SoundManager.play('drop');
            
            if (checkWin(move.row, move.col)) {
                endGame(move.player);
            } else if (checkDraw()) {
                endGame(0);
            }
        }
    }
    
    // Send move to Firebase
    async function sendMoveToFirebase(row, col) {
        if (!state.roomRef) return;
        
        await state.roomRef.update({
            board: state.board,
            currentPlayer: state.currentPlayer,
            lastMove: {
                row: row,
                col: col,
                player: state.myPlayerNumber
            }
        });
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
    
    // Public API
    return {
        init,
        setMode: (mode) => { state.mode = mode; },
        getMode: () => state.mode,
        setPlayers: (p1, p2) => {
            state.player1.name = p1;
            state.player2.name = p2;
        },
        start: () => {
            state.gameActive = true;
            state.currentPlayer = 1;
            state.moveCount = 0;
            initializeBoard();
            startTimer();
        },
        reset: () => {
            initializeBoard();
            state.moveHistory = [];
            state.moveCount = 0;
            state.currentPlayer = 1;
            clearInterval(timerInterval);
        },
        selectColumn,
        confirmMove,
        cancelMove,
        undoMove,
        showHint,
        isActive: () => state.gameActive,
        hasPendingMove: () => state.pendingMove !== null,
        getState: () => ({...state}),
        loadState: (savedState) => {
            state = {...savedState};
            renderBoard();
            updatePlayerIndicator();
            document.getElementById('p1Name').textContent = state.player1.name;
            document.getElementById('p2Name').textContent = state.player2.name;
            document.getElementById('p1Score').textContent = state.player1.score;
            document.getElementById('p2Score').textContent = state.player2.score;
            startTimer();
        },
        createOnlineRoom,
        joinOnlineRoom
    };
})();

// Export to global scope
window.Game = Game;