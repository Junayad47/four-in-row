// sound-manager.js - Sound Effects Manager

const SoundManager = (function() {
    let enabled = true;
    let audioContext = null;
    
    // Sound definitions
    const sounds = {
        drop: {
            frequency: [400, 200],
            duration: 300,
            type: 'sine',
            gain: 0.3
        },
        select: {
            frequency: [800],
            duration: 100,
            type: 'sine',
            gain: 0.2
        },
        win: {
            frequency: [523.25, 659.25, 783.99],
            duration: 500,
            type: 'triangle',
            gain: 0.3
        },
        error: {
            frequency: [100],
            duration: 100,
            type: 'sawtooth',
            gain: 0.2
        },
        undo: {
            frequency: [600, 800],
            duration: 150,
            type: 'sine',
            gain: 0.2
        },
        cancel: {
            frequency: [300],
            duration: 100,
            type: 'sine',
            gain: 0.15
        },
        hint: {
            frequency: [1000, 1200, 1000],
            duration: 300,
            type: 'sine',
            gain: 0.2
        },
        start: {
            frequency: [261.63, 329.63, 392, 523.25],
            duration: 400,
            type: 'triangle',
            gain: 0.25
        },
        success: {
            frequency: [800, 1000],
            duration: 200,
            type: 'sine',
            gain: 0.2
        }
    };
    
    // Initialize audio context
    function init() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Load saved preference
        const savedPref = localStorage.getItem('soundEnabled');
        if (savedPref !== null) {
            enabled = savedPref === 'true';
            updateUI();
        }
    }
    
    // Play sound
    function play(soundName) {
        if (!enabled || !audioContext || !sounds[soundName]) return;
        
        const sound = sounds[soundName];
        const currentTime = audioContext.currentTime;
        
        // Create oscillator and gain nodes
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set oscillator type
        oscillator.type = sound.type;
        
        // Set initial gain
        gainNode.gain.setValueAtTime(sound.gain, currentTime);
        
        // Handle frequency changes
        if (sound.frequency.length === 1) {
            oscillator.frequency.setValueAtTime(sound.frequency[0], currentTime);
        } else {
            // Create frequency envelope
            const stepDuration = sound.duration / sound.frequency.length / 1000;
            sound.frequency.forEach((freq, index) => {
                oscillator.frequency.setValueAtTime(
                    freq,
                    currentTime + (index * stepDuration)
                );
            });
        }
        
        // Fade out
        gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            currentTime + (sound.duration / 1000)
        );
        
        // Start and stop oscillator
        oscillator.start(currentTime);
        oscillator.stop(currentTime + (sound.duration / 1000) + 0.1);
    }
    
    // Play custom tone
    function playTone(frequency, duration = 100, type = 'sine') {
        if (!enabled || !audioContext) return;
        
        const currentTime = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, currentTime);
        gainNode.gain.setValueAtTime(0.2, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + (duration / 1000));
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + (duration / 1000) + 0.1);
    }
    
    // Toggle sound on/off
    function toggle() {
        enabled = !enabled;
        localStorage.setItem('soundEnabled', enabled.toString());
        updateUI();
        
        if (enabled) {
            play('success');
        }
    }
    
    // Update UI
    function updateUI() {
        const toggle = document.getElementById('soundToggle');
        const icon = document.getElementById('soundIcon');
        
        if (toggle && icon) {
            if (enabled) {
                icon.textContent = '🔊';
                toggle.classList.remove('muted');
            } else {
                icon.textContent = '🔇';
                toggle.classList.add('muted');
            }
        }
    }
    
    // Check if sound is enabled
    function isEnabled() {
        return enabled;
    }
    
    // Public API
    return {
        init,
        play,
        playTone,
        toggle,
        isEnabled
    };
})();

// Export to global scope
window.SoundManager = SoundManager;