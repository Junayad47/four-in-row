// particles.js - Particle Effects System

const ParticleSystem = (function() {
    let canvas, ctx;
    let particles = [];
    let animationId = null;
    let isRunning = false;
    
    // Particle class
    class Particle {
        constructor(x, y, options = {}) {
            this.x = x;
            this.y = y;
            this.vx = options.vx || (Math.random() - 0.5) * 2;
            this.vy = options.vy || (Math.random() - 0.5) * 2;
            this.radius = options.radius || Math.random() * 2 + 1;
            this.color = options.color || this.getRandomNeonColor();
            this.life = options.life || 100;
            this.maxLife = this.life;
            this.gravity = options.gravity || 0;
        }
        
        getRandomNeonColor() {
            const colors = ['#ff006e', '#00ffff', '#ffff00', '#b300ff', '#00ff88'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += this.gravity;
            this.life--;
            
            // Fade out
            this.opacity = this.life / this.maxLife;
        }
        
        draw() {
            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
        
        isDead() {
            return this.life <= 0;
        }
    }
    
    // Initialize particle system
    function init() {
        canvas = document.getElementById('particleCanvas');
        if (!canvas) {
            console.warn('Particle canvas not found');
            return;
        }
        
        ctx = canvas.getContext('2d');
        resize();
        
        // Handle resize
        window.addEventListener('resize', resize);
        
        // Start ambient particles
        startAmbient();
    }
    
    // Resize canvas
    function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    // Start ambient particle effect
    function startAmbient() {
        if (isRunning) return;
        
        isRunning = true;
        
        // Create initial ambient particles
        for (let i = 0; i < 30; i++) {
            particles.push(new Particle(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                {
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    radius: Math.random() * 1.5 + 0.5,
                    life: Math.random() * 200 + 100,
                    gravity: 0
                }
            ));
        }
        
        animate();
    }
    
    // Animation loop
    function animate() {
        if (!isRunning) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw particles
        particles = particles.filter(particle => {
            particle.update();
            particle.draw();
            return !particle.isDead();
        });
        
        // Add new ambient particles occasionally
        if (particles.length < 30 && Math.random() < 0.02) {
            const edge = Math.floor(Math.random() * 4);
            let x, y, vx, vy;
            
            switch(edge) {
                case 0: // Top
                    x = Math.random() * canvas.width;
                    y = 0;
                    vx = (Math.random() - 0.5) * 0.5;
                    vy = Math.random() * 0.5;
                    break;
                case 1: // Right
                    x = canvas.width;
                    y = Math.random() * canvas.height;
                    vx = -Math.random() * 0.5;
                    vy = (Math.random() - 0.5) * 0.5;
                    break;
                case 2: // Bottom
                    x = Math.random() * canvas.width;
                    y = canvas.height;
                    vx = (Math.random() - 0.5) * 0.5;
                    vy = -Math.random() * 0.5;
                    break;
                case 3: // Left
                    x = 0;
                    y = Math.random() * canvas.height;
                    vx = Math.random() * 0.5;
                    vy = (Math.random() - 0.5) * 0.5;
                    break;
            }
            
            particles.push(new Particle(x, y, {
                vx: vx,
                vy: vy,
                radius: Math.random() * 1.5 + 0.5,
                life: 200,
                gravity: 0
            }));
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    // Create explosion effect
    function explode(x, y, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = Math.random() * 5 + 3;
            
            particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 2,
                life: 50,
                gravity: 0.1
            }));
        }
    }
    
    // Create celebration effect
    function celebrate() {
        if (!canvas) return;
        
        // Create confetti-like particles
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                particles.push(new Particle(
                    Math.random() * canvas.width,
                    -20,
                    {
                        vx: (Math.random() - 0.5) * 3,
                        vy: Math.random() * 3 + 2,
                        radius: Math.random() * 4 + 2,
                        life: 150,
                        gravity: 0.15,
                        color: ['#ff006e', '#00ffff', '#ffff00', '#b300ff', '#00ff88'][Math.floor(Math.random() * 5)]
                    }
                ));
            }, i * 20);
        }
    }
    
    // Create trail effect
    function createTrail(x, y) {
        particles.push(new Particle(x, y, {
            vx: (Math.random() - 0.5) * 1,
            vy: (Math.random() - 0.5) * 1,
            radius: Math.random() * 2 + 1,
            life: 30,
            gravity: 0
        }));
    }
    
    // Stop particle system
    function stop() {
        isRunning = false;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
    
    // Clear all particles
    function clear() {
        particles = [];
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    // Public API
    return {
        init,
        explode,
        celebrate,
        createTrail,
        stop,
        clear
    };
})();

// Export to global scope
window.ParticleSystem = ParticleSystem;