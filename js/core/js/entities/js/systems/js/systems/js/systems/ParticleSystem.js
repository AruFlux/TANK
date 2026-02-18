// js/systems/ParticleSystem.js
export class ParticleSystem {
    constructor(game) {
        this.game = game;
        this.particles = [];
        this.trackMarks = [];
        this.smokes = [];
        this.fires = [];
    }
    
    update(deltaTime) {
        // Update particles
        this.particles = this.particles.filter(p => {
            p.life -= deltaTime;
            if (p.life <= 0) return false;
            
            // Apply physics
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += 0.01 * deltaTime; // Gravity
            p.alpha = p.life / p.maxLife;
            
            return true;
        });
        
        // Update track marks (fade over time)
        this.trackMarks = this.trackMarks.filter(t => {
            t.life -= deltaTime * 0.1;
            return t.life > 0;
        });
        
        // Update smoke
        this.smokes = this.smokes.filter(s => {
            s.life -= deltaTime * 0.5;
            if (s.life <= 0) return false;
            
            // Smoke drifts
            s.x += (Math.random() - 0.5) * 0.5 * deltaTime;
            s.y += (Math.random() - 0.5) * 0.3 * deltaTime - 0.2 * deltaTime;
            s.size += 0.5 * deltaTime;
            s.alpha = s.life / s.maxLife * 0.7;
            
            return true;
        });
    }
    
    addTrackMark(x, y, angle) {
        this.trackMarks.push({
            x, y,
            angle,
            life: 100,
            maxLife: 100
        });
    }
    
    addMuzzleFlash(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 10,
                maxLife: 10,
                size: 3 + Math.random() * 5,
                color: '#ffff00'
            });
        }
    }
    
    addHitEffect(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 15,
                maxLife: 15,
                size: 2 + Math.random() * 4,
                color: '#ff6600'
            });
        }
        
        // Add impact smoke
        this.addSmoke(x, y, 5);
    }
    
    addLargeExplosion(x, y) {
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15 - 5,
                life: 30,
                maxLife: 30,
                size: 4 + Math.random() * 8,
                color: i < 10 ? '#ffff00' : '#ff4400'
            });
        }
        this.addSmoke(x, y, 15);
    }
    
    addSmoke(x, y, count) {
        for (let i = 0; i < count; i++) {
            this.smokes.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                size: 20 + Math.random() * 30,
                life: 100,
                maxLife: 100,
                alpha: 0.7,
                vx: (Math.random() - 0.5) * 2,
                vy: -1 + Math.random() * 0.5
            });
        }
    }
    
    addFire(x, y, tank) {
        // Add continuous fire effect
        this.fires.push({
            x, y,
            tank,
            timer: 0,
            active: true
        });
    }
    
    render(ctx) {
        // Render track marks
        this.trackMarks.forEach(t => {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.angle);
            ctx.globalAlpha = t.life / t.maxLife * 0.5;
            ctx.fillStyle = '#333333';
            ctx.fillRect(-15, -5, 30, 10);
            ctx.fillRect(-15, 5, 30, 10);
            ctx.restore();
        });
        
        // Render particles
        this.particles.forEach(p => {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Render smoke
        this.smokes.forEach(s => {
            ctx.globalAlpha = s.alpha;
            ctx.fillStyle = '#888888';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.globalAlpha = 1;
    }
    
    renderTracks(ctx) {
        // Track marks rendered in main render loop
    }
}
