// js/entities/EnemyTank.js
import { Tank } from './Tank.js';
import { Config } from '../core/Config.js';

export class EnemyTank extends Tank {
    constructor(game, x, y, type = 't90') {
        super(game, x, y, type, 'red');
        
        // AI-specific properties
        this.aiState = 'patrol'; // patrol, hunt, engage, retreat, flank
        this.stateTimer = 0;
        this.targetTank = null;
        this.lastKnownPlayerPosition = { x: x, y: y };
        this.patrolPoint = null;
        this.flankDirection = 1; // 1 for left, -1 for right
        
        // AI behavior parameters
        this.detectionRange = 600;
        this.engagementRange = 400;
        this.retreatHealthThreshold = 0.3;
        this.flankChance = 0.3;
        
        // Russian bias - stronger frontal armor, aggressive push
        this.armor.front *= 1.2; // 20% stronger frontal armor
        this.aggression = 1.2; // More aggressive than average
        
        // Initialize patrol point
        this.setNewPatrolPoint();
    }
    
    update(deltaTime) {
        // Find target (player)
        this.targetTank = this.game.player;
        
        if (!this.targetTank || !this.targetTank.active) {
            this.aiState = 'patrol';
            super.update(deltaTime);
            return;
        }
        
        // Update AI state
        this.updateAIState(deltaTime);
        
        // Execute current state behavior
        switch(this.aiState) {
            case 'patrol':
                this.behaviorPatrol(deltaTime);
                break;
            case 'hunt':
                this.behaviorHunt(deltaTime);
                break;
            case 'engage':
                this.behaviorEngage(deltaTime);
                break;
            case 'flank':
                this.behaviorFlank(deltaTime);
                break;
            case 'retreat':
                this.behaviorRetreat(deltaTime);
                break;
        }
        
        // Call parent update
        super.update(deltaTime);
        
        // Update state timer
        this.stateTimer += deltaTime;
    }
    
    updateAIState(deltaTime) {
        if (!this.targetTank) return;
        
        const dx = this.targetTank.x - this.x;
        const dy = this.targetTank.y - this.y;
        const distance = Math.hypot(dx, dy);
        const healthPercent = this.health / this.maxHealth;
        
        // Check line of sight (simplified)
        const hasLos = this.checkLineOfSight();
        
        // State transition logic
        if (healthPercent < this.retreatHealthThreshold) {
            // Retreat when heavily damaged
            if (this.aiState !== 'retreat') {
                this.aiState = 'retreat';
                this.stateTimer = 0;
            }
        } else if (distance < this.engagementRange && hasLos) {
            // Engage if in range and can see target
            if (this.aiState !== 'engage' && this.aiState !== 'flank') {
                // Chance to flank instead of direct engage
                if (Math.random() < this.flankChance && distance > 200) {
                    this.aiState = 'flank';
                    this.flankDirection = Math.random() > 0.5 ? 1 : -1;
                } else {
                    this.aiState = 'engage';
                }
                this.stateTimer = 0;
            }
        } else if (distance < this.detectionRange) {
            // Hunt if detected but not in range
            if (this.aiState !== 'hunt') {
                this.aiState = 'hunt';
                this.stateTimer = 0;
            }
        } else {
            // Patrol if nothing detected
            if (this.aiState !== 'patrol') {
                this.aiState = 'patrol';
                this.stateTimer = 0;
            }
        }
    }
    
    behaviorPatrol(deltaTime) {
        // Move to patrol point
        if (!this.patrolPoint || this.stateTimer > 10) {
            this.setNewPatrolPoint();
            this.stateTimer = 0;
        }
        
        const dx = this.patrolPoint.x - this.x;
        const dy = this.patrolPoint.y - this.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < 50) {
            // Reached patrol point, get new one
            this.setNewPatrolPoint();
        }
        
        // Turn towards patrol point
        const targetAngle = Math.atan2(dy, dx);
        this.targetTurretAngle = targetAngle; // Look where we're going
        
        // Rotate hull towards target
        let angleDiff = targetAngle - this.hullAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        this.rotationSpeed = angleDiff * 0.05 * deltaTime;
        
        // Move forward
        this.speed = Math.min(this.maxSpeed * 0.4, this.speed + this.acceleration * deltaTime);
    }
    
    behaviorHunt(deltaTime) {
        if (!this.targetTank) return;
        
        // Move towards last known player position
        const dx = this.lastKnownPlayerPosition.x - this.x;
        const dy = this.lastKnownPlayerPosition.y - this.y;
        const targetAngle = Math.atan2(dy, dx);
        
        this.targetTurretAngle = targetAngle;
        
        // Rotate hull
        let angleDiff = targetAngle - this.hullAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        this.rotationSpeed = angleDiff * 0.1 * deltaTime;
        
        // Move forward
        this.speed = Math.min(this.maxSpeed * 0.7, this.speed + this.acceleration * deltaTime);
        
        // Update last known position if we see the player
        if (this.checkLineOfSight()) {
            this.lastKnownPlayerPosition.x = this.targetTank.x;
            this.lastKnownPlayerPosition.y = this.targetTank.y;
        }
    }
    
    behaviorEngage(deltaTime) {
        if (!this.targetTank) return;
        
        const dx = this.targetTank.x - this.x;
        const dy = this.targetTank.y - this.y;
        const distance = Math.hypot(dx, dy);
        const angleToTarget = Math.atan2(dy, dx);
        
        // Aim turret at target
        this.targetTurretAngle = angleToTarget;
        
        // Fire if ready and aimed
        const turretDiff = Math.abs(this.turretAngle - angleToTarget);
        if (turretDiff < 0.1 && this.mainGun.ready) {
            this.fire();
        }
        
        // Movement during engagement
        if (distance > 250) {
            // Advance if too far
            const moveAngle = angleToTarget;
            let angleDiff = moveAngle - this.hullAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            this.rotationSpeed = angleDiff * 0.1 * deltaTime;
            this.speed = Math.min(this.maxSpeed * 0.5, this.speed + this.acceleration * deltaTime);
        } else if (distance < 150) {
            // Reverse if too close
            const moveAngle = angleToTarget + Math.PI;
            let angleDiff = moveAngle - this.hullAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            this.rotationSpeed = angleDiff * 0.1 * deltaTime;
            this.speed = Math.max(-this.maxSpeed * 0.3, this.speed - this.acceleration * deltaTime);
        }
    }
    
    behaviorFlank(deltaTime) {
        if (!this.targetTank) return;
        
        const dx = this.targetTank.x - this.x;
        const dy = this.targetTank.y - this.y;
        const distance = Math.hypot(dx, dy);
        const angleToTarget = Math.atan2(dy, dx);
        
        // Calculate flanking position (perpendicular to target)
        const flankAngle = angleToTarget + (Math.PI / 2) * this.flankDirection;
        const flankX = this.targetTank.x + Math.cos(flankAngle) * 200;
        const flankY = this.targetTank.y + Math.sin(flankAngle) * 200;
        
        // Move to flanking position
        const dxFlank = flankX - this.x;
        const dyFlank = flankY - this.y;
        const flankTargetAngle = Math.atan2(dyFlank, dxFlank);
        
        // Keep turret aimed at target while moving
        this.targetTurretAngle = angleToTarget;
        
        // Move hull towards flank position
        let angleDiff = flankTargetAngle - this.hullAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        this.rotationSpeed = angleDiff * 0.15 * deltaTime;
        this.speed = Math.min(this.maxSpeed * 0.8, this.speed + this.acceleration * deltaTime);
        
        // Fire at target if possible
        const turretDiff = Math.abs(this.turretAngle - angleToTarget);
        if (turretDiff < 0.2 && this.mainGun.ready) {
            this.fire();
        }
        
        // Transition to engage if flanking complete or too long
        if (this.stateTimer > 8 || Math.hypot(this.x - flankX, this.y - flankY) < 50) {
            this.aiState = 'engage';
            this.stateTimer = 0;
        }
    }
    
    behaviorRetreat(deltaTime) {
        if (!this.targetTank) return;
        
        const dx = this.targetTank.x - this.x;
        const dy = this.targetTank.y - this.y;
        const angleToTarget = Math.atan2(dy, dx);
        
        // Retreat away from target
        const retreatAngle = angleToTarget + Math.PI;
        
        // Find safe retreat point (away from target)
        const retreatX = this.x + Math.cos(retreatAngle) * 300;
        const retreatY = this.y + Math.sin(retreatAngle) * 300;
        
        const dxRetreat = retreatX - this.x;
        const dyRetreat = retreatY - this.y;
        const retreatTargetAngle = Math.atan2(dyRetreat, dxRetreat);
        
        // Keep turret aimed at target while retreating
        this.targetTurretAngle = angleToTarget;
        
        // Move hull towards retreat direction
        let angleDiff = retreatTargetAngle - this.hullAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        this.rotationSpeed = angleDiff * 0.2 * deltaTime;
        this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * deltaTime);
        
        // Fire at target while retreating if possible
        const turretDiff = Math.abs(this.turretAngle - angleToTarget);
        if (turretDiff < 0.3 && this.mainGun.ready) {
            this.fire();
        }
    }
    
    setNewPatrolPoint() {
        this.patrolPoint = {
            x: this.x + (Math.random() - 0.5) * 400,
            y: this.y + (Math.random() - 0.5) * 400
        };
        
        // Keep within map bounds
        this.patrolPoint.x = Math.max(100, Math.min(Config.mapSize - 100, this.patrolPoint.x));
        this.patrolPoint.y = Math.max(100, Math.min(Config.mapSize - 100, this.patrolPoint.y));
    }
    
    checkLineOfSight() {
        if (!this.targetTank) return false;
        
        // Simplified LOS check - in real implementation would check map obstacles
        const dx = this.targetTank.x - this.x;
        const dy = this.targetTank.y - this.y;
        const distance = Math.hypot(dx, dy);
        
        // Check if target is within detection range
        if (distance > this.detectionRange) return false;
        
        // Check if target is in front arc (optional)
        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToTarget - this.hullAngle);
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
        
        // 120 degree forward arc
        return angleDiff < Math.PI * 0.67;
    }
}
