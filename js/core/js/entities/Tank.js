// js/entities/Tank.js
import { Crew } from '../systems/Crew.js';
import { Config } from '../core/Config.js';

export class Tank {
    constructor(game, x, y, type, team) {
        this.game = game;
        this.type = type;
        this.team = team;
        this.active = true;
        
        // Position and rotation
        this.x = x;
        this.y = y;
        this.hullAngle = 0;
        this.turretAngle = 0;
        this.targetTurretAngle = 0;
        
        // Movement
        this.speed = 0;
        this.rotationSpeed = 0;
        this.maxSpeed = Config.tanks[type].maxSpeed;
        this.acceleration = Config.tanks[type].acceleration;
        this.hullTraverse = Config.tanks[type].hullTraverse;
        this.turretTraverse = Config.tanks[type].turretTraverse;
        
        // Health and armor
        this.health = Config.tanks[type].health;
        this.maxHealth = Config.tanks[type].health;
        this.armor = Config.tanks[type].armor;
        
        // Modules
        this.modules = {
            engine: { health: 100, maxHealth: 100, functional: true },
            ammoRack: { health: 100, maxHealth: 100, functional: true },
            turretRing: { health: 100, maxHealth: 100, functional: true },
            tracks: { health: 100, maxHealth: 100, functional: true }
        };
        
        // Crew system
        this.crew = new Crew(this);
        
        // Weapon systems
        this.mainGun = {
            ready: true,
            reloadTime: Config.tanks[type].reloadTime,
            currentReload: 0,
            ammo: {
                apfsds: 42,
                heat: 30,
                he: 20
            },
            currentAmmo: 'apfsds'
        };
        
        this.coaxialMG = {
            ready: true,
            heat: 0,
            maxHeat: 100,
            cooldownRate: 5
        };
        
        // Visual properties
        this.size = 40; // Tank size in pixels
        this.turretSize = 25;
        this.gunLength = 30;
        
        // Track marks
        this.trackTimer = 0;
        this.lastX = x;
        this.lastY = y;
    }
    
    update(deltaTime) {
        // Store last position for track marks
        this.lastX = this.x;
        this.lastY = this.y;
        
        // Update crew effects
        this.crew.update(deltaTime);
        
        // Apply crew effects to performance
        this.applyCrewEffects();
        
        // Update movement (overridden by player/AI)
        this.updateMovement(deltaTime);
        
        // Update turret rotation (with realistic traverse speed)
        this.updateTurret(deltaTime);
        
        // Update weapons
        this.updateWeapons(deltaTime);
        
        // Update modules
        this.updateModules(deltaTime);
        
        // Create track marks when moving
        this.updateTracks(deltaTime);
    }
    
    updateMovement(deltaTime) {
        // Apply speed and rotation
        const moveDistance = this.speed * deltaTime * 0.1;
        this.x += Math.cos(this.hullAngle) * moveDistance;
        this.y += Math.sin(this.hullAngle) * moveDistance;
        
        // Apply hull rotation
        this.hullAngle += this.rotationSpeed * deltaTime * 0.1;
        
        // Collision with map boundaries
        this.x = Math.max(50, Math.min(Config.mapSize - 50, this.x));
        this.y = Math.max(50, Math.min(Config.mapSize - 50, this.y));
    }
    
    updateTurret(deltaTime) {
        // Smooth turret rotation with max traverse speed
        let angleDiff = this.targetTurretAngle - this.turretAngle;
        
        // Normalize angle difference
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Apply max traverse speed
        const maxTurn = this.turretTraverse * deltaTime * 0.1 * (Math.PI / 180);
        const turnAmount = Math.min(maxTurn, Math.abs(angleDiff)) * Math.sign(angleDiff);
        
        this.turretAngle += turnAmount;
        
        // Keep turret angle normalized
        while (this.turretAngle > Math.PI * 2) this.turretAngle -= Math.PI * 2;
        while (this.turretAngle < 0) this.turretAngle += Math.PI * 2;
    }
    
    updateWeapons(deltaTime) {
        // Main gun reload
        if (!this.mainGun.ready) {
            this.mainGun.currentReload -= deltaTime;
            if (this.mainGun.currentReload <= 0) {
                this.mainGun.ready = true;
            }
        }
        
        // Coaxial MG heat management
        if (this.coaxialMG.heat > 0) {
            this.coaxialMG.heat = Math.max(0, this.coaxialMG.heat - this.coaxialMG.cooldownRate * deltaTime);
        }
        this.coaxialMG.ready = this.coaxialMG.heat < this.coaxialMG.maxHeat;
    }
    
    updateModules(deltaTime) {
        // Check module functionality
        for (let [name, module] of Object.entries(this.modules)) {
            module.functional = module.health > 0;
            
            // Apply module effects
            switch(name) {
                case 'engine':
                    if (!module.functional) this.speed *= 0.3;
                    break;
                case 'tracks':
                    if (!module.functional) {
                        this.rotationSpeed *= 0.2;
                        this.maxSpeed *= 0.3;
                    }
                    break;
                case 'turretRing':
                    if (!module.functional) this.turretTraverse *= 0.3;
                    break;
            }
        }
    }
    
    updateTracks(deltaTime) {
        // Create track marks when moving
        const distanceMoved = Math.hypot(this.x - this.lastX, this.y - this.lastY);
        if (distanceMoved > 5) {
            this.trackTimer += deltaTime;
            if (this.trackTimer > 2) { // Create track mark every 2 frames
                this.game.particleSystem.addTrackMark(this.x, this.y, this.hullAngle);
                this.trackTimer = 0;
            }
        }
    }
    
    applyCrewEffects() {
        // Apply crew injuries to performance
        if (!this.crew.driver.active) {
            this.maxSpeed *= 0.6;
            this.hullTraverse *= 0.5;
        }
        
        if (!this.crew.gunner.active) {
            // Gunner injured - accuracy penalty handled in firing
        }
        
        if (!this.crew.loader.active) {
            this.mainGun.reloadTime *= 1.8;
        }
        
        if (!this.crew.commander.active) {
            // Commander injured - slower reaction time (for AI)
        }
    }
    
    takeDamage(penetrationData) {
        const { penetrated, module, crew, damage } = penetrationData;
        
        if (penetrated) {
            this.health -= damage;
            
            // Damage specific module
            if (module && this.modules[module]) {
                this.modules[module].health -= damage * 2;
                if (this.modules[module].health < 0) this.modules[module].health = 0;
            }
            
            // Damage crew
            if (crew) {
                this.crew.injure(crew);
            }
            
            // Create hit effect
            this.game.particleSystem.addHitEffect(this.x, this.y);
            
            // Add damage message
            this.game.uiManager.addDamageMessage(penetrationData.message);
            
            // Check for ammo rack explosion
            if (module === 'ammoRack' && this.modules.ammoRack.health < 30) {
                if (Math.random() < 0.3) { // 30% chance of catastrophic explosion
                    this.catastrophicExplosion();
                }
            }
            
            // Check for fire
            if (module === 'engine' && this.modules.engine.health < 20) {
                if (Math.random() < 0.4) {
                    this.engineFire();
                }
            }
        }
        
        return penetrated;
    }
    
    catastrophicExplosion() {
        this.active = false;
        this.game.particleSystem.addLargeExplosion(this.x, this.y);
        // Remove from game
    }
    
    engineFire() {
        this.game.particleSystem.addFire(this.x, this.y, this);
    }
    
    render(ctx) {
        // Draw hull
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.hullAngle);
        
        // Hull shape (tank body)
        ctx.fillStyle = this.team === 'blue' ? '#3a6ea5' : '#8b3a3a';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Draw hull rectangle with angled front for realism
        ctx.beginPath();
        ctx.moveTo(-this.size/2, -this.size/3);
        ctx.lineTo(this.size/2, -this.size/3);
        ctx.lineTo(this.size/2 + 10, 0);
        ctx.lineTo(this.size/2, this.size/3);
        ctx.lineTo(-this.size/2, this.size/3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw tracks
        ctx.fillStyle = '#333333';
        ctx.fillRect(-this.size/2 - 5, -this.size/2, 10, this.size);
        ctx.fillRect(this.size/2 - 5, -this.size/2, 10, this.size);
        
        ctx.restore();
        
        // Draw turret (rotates independently)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.turretAngle);
        
        // Turret
        ctx.fillStyle = this.team === 'blue' ? '#2d5580' : '#6d2d2d';
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.turretSize, this.turretSize/1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Gun barrel
        ctx.fillStyle = '#444444';
        ctx.fillRect(this.turretSize/2, -4, this.gunLength, 8);
        
        // Muzzle brake
        ctx.fillStyle = '#666666';
        ctx.fillRect(this.turretSize/2 + this.gunLength, -6, 8, 12);
        
        ctx.restore();
        
        // Draw health bar if damaged
        if (this.health < this.maxHealth) {
            this.drawHealthBar(ctx);
        }
    }
    
    drawHealthBar(ctx) {
        const barWidth = 50;
        const barHeight = 6;
        const barX = this.x - barWidth/2;
        const barY = this.y - this.size - 15;
        
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.6 ? '#00ff00' : healthPercent > 0.3 ? '#ffff00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }
    
    fire() {
        if (!this.mainGun.ready) return false;
        
        // Check if gunner is active
        if (!this.crew.gunner.active && Math.random() < 0.7) {
            // Gunner injured - high chance of miss
            return false;
        }
        
        // Calculate firing angle (with accuracy based on gunner skill)
        let accuracy = 1.0;
        if (!this.crew.gunner.active) accuracy = 0.5;
        
        const angle = this.turretAngle + (Math.random() - 0.5) * (0.02 / accuracy);
        
        // Create projectile
        const projectile = new Projectile(
            this.game,
            this.x + Math.cos(this.turretAngle) * 40,
            this.y + Math.sin(this.turretAngle) * 40,
            angle,
            this.mainGun.currentAmmo,
            this.team
        );
        
        this.game.addProjectile(projectile);
        
        // Start reload
        this.mainGun.ready = false;
        this.mainGun.currentReload = this.mainGun.reloadTime * (this.crew.loader.active ? 1 : 1.8);
        
        // Reduce ammo
        this.mainGun.ammo[this.mainGun.currentAmmo]--;
        
        // Muzzle flash effect
        this.game.particleSystem.addMuzzleFlash(
            this.x + Math.cos(this.turretAngle) * 45,
            this.y + Math.sin(this.turretAngle) * 45
        );
        
        return true;
    }
    
    fireMG() {
        if (!this.coaxialMG.ready) return false;
        
        // MG fire logic (multiple bullets)
        for (let i = 0; i < 3; i++) {
            const angle = this.turretAngle + (Math.random() - 0.5) * 0.1;
            const projectile = new Projectile(
                this.game,
                this.x + Math.cos(this.turretAngle) * 35,
                this.y + Math.sin(this.turretAngle) * 35,
                angle,
                'mg',
                this.team
            );
            this.game.addProjectile(projectile);
        }
        
        // Heat up MG
        this.coaxialMG.heat += 15;
        
        return true;
    }
}
