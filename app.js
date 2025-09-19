// app.js - Main Application Entry Point

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize game
    Game.init();
    
    // Initialize particles effect
    ParticleSystem.init();
    
    // Initialize sound manager
    SoundManager.init();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for saved game state
    checkSavedState();
});

// Setup all event listeners
function setupEventListeners() {
    // Mode selection
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
        card.addEventListener('click', () => selectMode(card));
        card.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                selectMode(card);
            }
        });
    });
    
    // Continue button
    document.getElementById('continueMode').addEventListener('click', () => {
        const mode = document.querySelector('.mode-card.selected')?.dataset.mode;
        if (mode) {
            proceedToSetup(mode);
        }
    });
    
    // Offline setup
    document.getElementById('startOffline').addEventListener('click', startOfflineGame);
    document.getElementById('backFromSetup').addEventListener('click', backToModeSelection);
    
    // Online setup
    document.getElementById('createRoom').addEventListener('click', createOnlineRoom);
    document.getElementById('joinRoomBtn').addEventListener('click', showJoinSection);
    document.getElementById('confirmJoin').addEventListener('click', joinOnlineRoom);
    document.getElementById('copyCode').addEventListener('click', copyRoomCode);
    document.getElementById('backFromOnlineSetup').addEventListener('click', backToModeSelection);
    
    // Move confirmation
    document.getElementById('confirmMove').addEventListener('click', () => Game.confirmMove());
    document.getElementById('cancelMove').addEventListener('click', () => Game.cancelMove());
    
    // Game controls
    document.getElementById('undoBtn').addEventListener('click', () => Game.undoMove());
    document.getElementById('hintBtn').addEventListener('click', () => Game.showHint());
    document.getElementById('newGameBtn').addEventListener('click', newGame);
    document.getElementById('quitBtn').addEventListener('click', quitToMenu);
    
    // Win overlay
    document.getElementById('rematchBtn').addEventListener('click', rematch);
    document.getElementById('mainMenuBtn').addEventListener('click', () => location.reload());
    
    // Sound toggle
    document.getElementById('soundToggle').addEventListener('click', toggleSound);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Room code input - auto uppercase
    const roomCodeInput = document.getElementById('roomCodeInput');
    if (roomCodeInput) {
        roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
}

// Mode selection
function selectMode(card) {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    document.getElementById('continueMode').disabled = false;
    SoundManager.play('select');
}

// Proceed to setup
function proceedToSetup(mode) {
    const modeModal = document.getElementById('modeModal');
    const setupModal = document.getElementById('setupModal');
    
    modeModal.classList.remove('active');
    setupModal.classList.add('active');
    
    if (mode === 'offline') {
        document.getElementById('offlineSetup').style.display = 'block';
        document.getElementById('offlineSetup').classList.add('active');
        document.getElementById('onlineSetup').style.display = 'none';
        document.getElementById('setupTitle').textContent = 'Enter Player Names';
        
        // Focus first input
        setTimeout(() => {
            document.getElementById('player1Name').focus();
        }, 300);
    } else {
        document.getElementById('offlineSetup').style.display = 'none';
        document.getElementById('onlineSetup').style.display = 'block';
        document.getElementById('onlineSetup').classList.add('active');
        document.getElementById('setupTitle').textContent = 'Online Game Setup';
        
        // Initialize Firebase
        if (!initializeFirebase()) {
            showToast('Online mode requires Firebase configuration', 'error');
        }
        
        // Focus name input
        setTimeout(() => {
            document.getElementById('playerNameOnline').focus();
        }, 300);
    }
    
    Game.setMode(mode);
}

// Back to mode selection
function backToModeSelection() {
    document.getElementById('setupModal').classList.remove('active');
    document.getElementById('modeModal').classList.add('active');
    document.getElementById('continueMode').disabled = true;
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
}

// Start offline game
function startOfflineGame() {
    const player1Name = document.getElementById('player1Name').value.trim();
    const player2Name = document.getElementById('player2Name').value.trim();
    
    if (!player1Name || !player2Name) {
        showToast('Please enter both player names', 'error');
        return;
    }
    
    if (player1Name.toLowerCase() === player2Name.toLowerCase()) {
        showToast('Players must have different names', 'error');
        return;
    }
    
    Game.setPlayers(player1Name, player2Name);
    Game.start();
    
    // Hide modals and show game
    document.getElementById('setupModal').classList.remove('active');
    document.getElementById('gameArea').classList.add('active');
    
    // Update UI
    document.getElementById('p1Name').textContent = player1Name;
    document.getElementById('p2Name').textContent = player2Name;
    
    showToast('Game started! ' + player1Name + ' goes first', 'success');
    SoundManager.play('start');
}

// Create online room
async function createOnlineRoom() {
    const playerName = document.getElementById('playerNameOnline').value.trim();
    
    if (!playerName) {
        showToast('Please enter your name', 'error');
        return;
    }
    
    showLoading('Creating room...');
    
    try {
        const roomCode = await Game.createOnlineRoom(playerName);
        
        // Show room code
        document.getElementById('roomCodeValue').textContent = roomCode;
        document.getElementById('creatingRoomSection').style.display = 'block';
        document.getElementById('creatingRoomSection').classList.add('active');
        
        // Hide other sections
        document.querySelector('.online-options').style.display = 'none';
        document.getElementById('joinRoomSection').style.display = 'none';
        
        hideLoading();
        showToast('Room created! Share the code with your friend', 'success');
        SoundManager.play('success');
    } catch (error) {
        hideLoading();
        showToast('Failed to create room: ' + error.message, 'error');
    }
}

// Show join section
function showJoinSection() {
    document.getElementById('joinRoomSection').style.display = 'block';
    document.getElementById('joinRoomSection').classList.add('active');
    document.querySelector('.online-options').style.display = 'none';
    
    setTimeout(() => {
        document.getElementById('roomCodeInput').focus();
    }, 300);
}

// Join online room
async function joinOnlineRoom() {
    const playerName = document.getElementById('playerNameOnline').value.trim();
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    
    if (!playerName) {
        showToast('Please enter your name', 'error');
        return;
    }
    
    if (!roomCode || roomCode.length !== 6) {
        showToast('Please enter a valid 6-character room code', 'error');
        return;
    }
    
    showLoading('Joining room...');
    
    try {
        await Game.joinOnlineRoom(roomCode, playerName);
        
        // Hide setup modal and show game
        document.getElementById('setupModal').classList.remove('active');
        document.getElementById('gameArea').classList.add('active');
        
        hideLoading();
        showToast('Joined room successfully!', 'success');
        SoundManager.play('success');
    } catch (error) {
        hideLoading();
        showToast('Failed to join room: ' + error.message, 'error');
    }
}

// Copy room code
function copyRoomCode() {
    const roomCode = document.getElementById('roomCodeValue').textContent;
    
    navigator.clipboard.writeText(roomCode).then(() => {
        const btn = document.getElementById('copyCode');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('success');
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('success');
        }, 2000);
        
        SoundManager.play('success');
    }).catch(() => {
        showToast('Failed to copy code', 'error');
    });
}

// New game
function newGame() {
    if (confirm('Start a new game? Current progress will be lost.')) {
        Game.reset();
        Game.start();
        showToast('New game started!', 'success');
        SoundManager.play('start');
    }
}

// Quit to menu
function quitToMenu() {
    if (confirm('Quit to main menu? Current progress will be lost.')) {
        // Save state if needed
        saveGameState();
        location.reload();
    }
}

// Rematch
function rematch() {
    document.getElementById('winOverlay').classList.remove('active');
    Game.reset();
    Game.start();
    showToast('Rematch started!', 'success');
    SoundManager.play('start');
}

// Toggle sound
function toggleSound() {
    const toggle = document.getElementById('soundToggle');
    const icon = document.getElementById('soundIcon');
    
    SoundManager.toggle();
    
    if (SoundManager.isEnabled()) {
        icon.textContent = '🔊';
        toggle.classList.remove('muted');
    } else {
        icon.textContent = '🔇';
        toggle.classList.add('muted');
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    if (!Game.isActive()) return;
    
    // Number keys for column selection
    if (e.key >= '1' && e.key <= '7') {
        const col = parseInt(e.key) - 1;
        Game.selectColumn(col);
    }
    
    // Enter to confirm move
    if (e.key === 'Enter' && Game.hasPendingMove()) {
        Game.confirmMove();
    }
    
    // Escape to cancel move
    if (e.key === 'Escape' && Game.hasPendingMove()) {
        Game.cancelMove();
    }
    
    // Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z' && Game.getMode() === 'offline') {
        Game.undoMove();
    }
    
    // H for hint
    if (e.key === 'h' || e.key === 'H') {
        Game.showHint();
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease-out forwards';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// Show loading overlay
function showLoading(text = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    loadingText.textContent = text;
    overlay.classList.add('active');
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('active');
}

// Initialize Firebase
function initializeFirebase() {
    if (!window.firebaseConfig || window.firebaseConfig.apiKey === 'YOUR_API_KEY') {
        console.warn('Firebase not configured. Online play will not work.');
        return false;
    }
    
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
        }
        return true;
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        return false;
    }
}

// Save game state to localStorage
function saveGameState() {
    if (Game.isActive()) {
        const state = Game.getState();
        localStorage.setItem('fourInRowState', JSON.stringify(state));
    }
}

// Check for saved game state
function checkSavedState() {
    const savedState = localStorage.getItem('fourInRowState');
    
    if (savedState) {
        const state = JSON.parse(savedState);
        
        // Ask user if they want to resume
        setTimeout(() => {
            if (confirm('Resume previous game?')) {
                Game.loadState(state);
                document.getElementById('modeModal').classList.remove('active');
                document.getElementById('gameArea').classList.add('active');
                showToast('Game resumed!', 'success');
            } else {
                localStorage.removeItem('fourInRowState');
            }
        }, 500);
    }
}

// Auto-save periodically
setInterval(() => {
    if (Game.isActive()) {
        saveGameState();
    }
}, 30000); // Save every 30 seconds

// Save before page unload
window.addEventListener('beforeunload', (e) => {
    if (Game.isActive()) {
        saveGameState();
    }
});

// Handle visibility change (mobile)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.isActive()) {
        saveGameState();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    if (Game.getMode() === 'online') {
        showToast('Connection lost! Game paused', 'error');
    }
});

// Export for use in other modules
window.App = {
    showToast,
    showLoading,
    hideLoading,
    saveGameState
};