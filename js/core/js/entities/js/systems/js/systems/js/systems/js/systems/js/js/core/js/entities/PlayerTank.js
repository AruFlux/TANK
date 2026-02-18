// js/entities/PlayerTank.js
import { Tank } from './Tank.js';
import { Config } from '../core/Config.js';

export class PlayerTank extends Tank {
    constructor(game, x, y) {
        super(game, x, y, 'player', 'blue');
        
        // Player-specific properties
        this.isPlayer = true;
        this.repairKitUses = 3;
        this.extinguisherUses = 2;
        this.isRepairing = false;
        this.repairTime = 0;
        this.repairDuration = 5; // seconds
        
        // Camera following
        this.viewRange = 800;
        
        // Control state
        this.forward = false;
        this.backward = false;
        this.left = false;
        this.right = false;
        this.brake = false;
        
        // MG fire cooldown
        this.mgCooldown = 0;
        this.mgFireRate = 0.1; // seconds between MG shots
    }
    
    update(deltaTime) {
        // Handle player input
        this.handleInput(deltaTime);
        
        // Update repair state
        if (this.isRepairing) {
            this.updateRepair(deltaTime);
        }
        
        // Update MG cooldown
        if (this.mgCooldown > 0) {
            this.mgCooldown -= deltaTime / 60;
        }
        
        // Call parent update
        super.update(deltaTime);
        
        // Update camera target (handled in GameEngine)
    }
    
    handleInput(deltaTime) {
        const game = this.game;
        
        // Movement input
        if (game.keys['w'] || game.keys['arrowup']) {
            this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * deltaTime);
            this.forward = true;
        } else if (game.keys['s'] || game.keys['arrowdown']) {
            this.speed = Math.max(-this.maxSpeed * 0.5, this.speed - this.acceleration * deltaTime);
            this.backward = true;
        } else {
            // Deceleration
            this.speed *= 0.98;
            if (Math.abs(this.speed) < 0.1) this.speed = 0;
            this.forward = false;
            this.backward = false;
        }
        
        // Steering input
        if (game.keys['a'] || game.keys['arrowleft']) {
            this.rotationSpeed = -this.hullTraverse * (Math.PI / 180) * deltaTime * 0.1;
            this.left = true;
        } else if (game.keys['d'] || game.keys['arrowright']) {
            this.rotationSpeed = this.hullTraverse * (Math.PI / 180) * deltaTime * 0.1;
            this.right = true;
        } else {
            this.rotationSpeed = 0;
            this.left = false;
            this.right = false;
        }
        
        // Brake (spacebar)
        if (game.keys[' ']) {
            this.speed *= 0.95;
            this.brake = true;
        } else {
            this.brake = false;
        }
        
        // Turret aiming (follow mouse)
        const dx = game.mouse.x - this.x + (game.canvas.width / 2 - this.x);
        const dy = game.mouse.y - this.y + (game.canvas.height / 2 - this.y);
        this.targetTurretAngle = Math.atan2(dy, dx);
        
        // Firing (left mouse button)
        if (game.mouse.pressed && this.mainGun.ready) {
            this.fire();
        }
        
        // MG fire (right mouse button or shift - simplified)
        if (game.keys['shift'] && this.mgCooldown <= 0 && this.coaxialMG.ready) {
            this.fireMG();
            this.mgCooldown = this.mgFireRate;
        }
        
        // Repair (R key)
        if (game.keys['r'] && !this.isRepairing && this.repairKitUses > 0) {
            this.startRepair();
        }
        
        // Extinguish (F key)
        if (game.keys['f'] && this.extinguisherUses > 0 && this.isOnFire) {
            this.extinguish();
        }
        
        // Switch ammo types (1,2,3 keys)
        if (game.keys['1']) {
            this.mainGun.currentAmmo = 'apfsds';
            this.updateAmmoUI();
        } else if (game.keys['2']) {
            this.mainGun.currentAmmo = 'heat';
            this.updateAmmoUI();
        } else if (game.keys['3']) {
            this.mainGun.currentAmmo = 'he';
            this.updateAmmoUI();
        }
    }
    
    startRepair() {
        if (this.repairKitUses <= 0) return;
        
        this.isRepairing = true;
        this.repairTime = 0;
        this.game.uiManager.showMessage("REPAIRING...", "info");
    }
    
    updateRepair(deltaTime) {
        this.repairTime += deltaTime / 60;
        
        // Cannot move while repairing
        this.speed = 0;
        this.rotationSpeed = 0;
        
        if (this.repairTime >= this.repairDuration) {
            this.completeRepair();
        }
    }
    
    completeRepair() {
        // Repair modules
        for (let module of Object.values(this.modules)) {
            module.health = Math.min(module.maxHealth, module.health + 50);
            module.functional = module.health > 0;
        }
        
        // Heal crew
        this.crew.heal('commander');
        this.crew.heal('gunner');
        this.crew.heal('loader');
        this.crew.heal('driver');
        
        this.isRepairing = false;
        this.repairKitUses--;
        this.game.uiManager.showMessage("REPAIR COMPLETE", "success");
        this.game.uiManager.updateRepairKits(this.repairKitUses);
    }
    
    extinguish() {
        if (this.extinguisherUses <= 0) return;
        
        this.isOnFire = false;
        this.extinguisherUses--;
        this.game.uiManager.showMessage("FIRE EXTINGUISHED", "success");
        this.game.uiManager.updateExtinguishers(this.extinguisherUses);
        
        // Remove fire particles
        this.game.particleSystem.extinguishFire(this);
    }
    
    updateAmmoUI() {
        // Update active ammo slot in UI
        document.querySelectorAll('.ammo-slot').forEach(slot => {
            slot.classList.remove('active');
        });
        document.querySelector(`.ammo-slot[data-type="${this.mainGun.currentAmmo}"]`).classList.add('active');
    }
    
    takeDamage(penetrationData) {
        const result = super.takeDamage(penetrationData);
        
        if (result) {
            // Show hit indicator
            this.game.uiManager.showHitIndicator(penetrationData.direction);
        }
        
        return result;
    }
}
