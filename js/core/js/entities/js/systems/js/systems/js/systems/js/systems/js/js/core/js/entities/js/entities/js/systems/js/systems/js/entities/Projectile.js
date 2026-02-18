// js/entities/Projectile.js
export class Projectile {
    constructor(game, x, y, angle, type, team) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.type = type;
        this.team = team;
        
        // Projectile properties based on type
        const properties = this.getProperties();
        this.speed = properties.speed;
        this.damage = properties.damage;
        this.penetration = properties.penetration;
        this.size = properties.size;
        this.color = properties.color;
        this.trailColor = properties.trailColor;
        this.maxDistance = properties.maxDistance;
        
        // State
        this.active = true;
        this.distanceTraveled = 0;
        this.trail = [];
        this.maxTrailLength = 20;
        
        // Velocity
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }
    
    getProperties() {
        switch(this.type) {
            case 'apfsds':
                return {
                    speed: 30,
                    damage: 80,
                    penetration: 540,
                    size: 4,
                    color: '#ffffaa',
                    trailColor: 'rgba(255, 255, 100, 0.3)',
                    maxDistance: 2000
                };
            case 'heat':
                return {
                    speed: 20,
                    damage: 100,
                    penetration: 480,
                    size: 6,
                    color: '#ffaa00',
                    trailColor: 'rgba(255, 150, 0, 0.4)',
                    maxDistance: 1500
                };
            case 'he':
                return {
                    speed: 15,
                    damage: 150,
                    penetration: 127,
                    size: 8,
                    color: '#ff6600',
                    trailColor: 'rgba(255, 100, 0, 0.5)',
                    maxDistance: 1000
                };
            case 'mg':
                return {
                    speed: 25,
                    damage: 10,
                    penetration: 15,
                    size: 2,
                    color: '#ffff00',
                    trailColor: 'rgba(255, 255, 0, 0.2)',
                    maxDistance: 500
                };
            default:
                return {
                    speed: 20,
                    damage: 50,
                    penetration: 200,
                    size: 4,
                    color: '#ffffff',
                    trailColor: 'rgba(255, 255, 255, 0.3)',
                    maxDistance: 1500
                };
        }
    }
    
    update(deltaTime) {
        // Store previous position for trail
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }
        
        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Update distance traveled
        const moveDist = Math.hypot(this.vx * deltaTime, this.vy * deltaTime);
        this.distanceTraveled += moveDist;
        
        // Check if out of range
        if (this.distanceTraveled > this.maxDistance) {
            this.active = false;
            this.createImpactEffect();
            return;
        }
        
        // Check map boundaries
        if (this.x < 0 || this.x > this.game.mapSystem.mapSize ||
            this.y < 0 || this.y > this.game.mapSystem.mapSize) {
            this.active = false;
            return;
        }
        
        // Check collision with map objects
        const obstacle = this.game.mapSystem.checkCollision(this.x, this.y, this.size);
        if (obstacle) {
            this.handleObstacleHit(obstacle);
        }
    }
    
    handleObstacleHit(obstacle) {
        // Check if projectile can penetrate obstacle
        if (obstacle.destructible && this.penetration > 50) {
            // Damage obstacle
            const destroyed = this.game.mapSystem.damageObstacle(this.x, this.y, this.damage);
            
            if (destroyed) {
                // Projectile continues
                return;
            }
        }
        
        // Stop projectile
        this.active = false;
        this.createImpactEffect();
    }
    
    createImpactEffect() {
        // Create impact particles
        for (let i = 0; i < 10; i++) {
            this.game.particleSystem.particles.push({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5 - 2,
                life: 15,
                maxLife: 15,
                size: 2 + Math.random() * 4,
                color: this.color
            });
        }
        
        // Add smoke
        this.game.particleSystem.addSmoke(this.x, this.y, 3);
    }
    
    render(ctx) {
        // Draw trail
        if (this.trail.length > 1) {
            for (let i = 0; i < this.trail.length - 1; i++) {
                const point = this.trail[i];
                const nextPoint = this.trail[i + 1];
                const alpha = (1 - i / this.trail.length) * 0.5;
                
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(nextPoint.x, nextPoint.y);
                ctx.strokeStyle = this.trailColor.replace('0.3', alpha.toString());
                ctx.lineWidth = this.size * (1 - i / this.trail.length);
                ctx.stroke();
            }
        }
        
        // Draw projectile
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Glowing tip
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tip
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(this.size, 0, this.size/2, this.size/3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
