// js/systems/AISystem.js
export class AISystem {
    constructor(game) {
        this.game = game;
        this.enemies = [];
        this.pathfindingGrid = [];
        this.reactionTimes = {};
    }
    
    update(deltaTime) {
        this.enemies = this.game.enemies.filter(e => e.active);
        
        this.enemies.forEach(enemy => {
            // Initialize reaction time for new enemies
            if (!this.reactionTimes[enemy.id]) {
                this.reactionTimes[enemy.id] = {
                    current: 0,
                    max: 0.5 + Math.random() * 1.5 // 0.5-2 second reaction time
                };
            }
            
            const reaction = this.reactionTimes[enemy.id];
            
            // Update reaction timer
            if (reaction.current < reaction.max) {
                reaction.current += deltaTime / 60;
                return; // Still reacting, do nothing
            }
            
            // Main AI decision making
            this.decide(enemy);
        });
    }
    
    decide(enemy) {
        const player = this.game.player;
        if (!player || !player.active) return;
        
        // Calculate distance and angle to player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        const angleToPlayer = Math.atan2(dy, dx);
        
        // Check line of sight
        const hasLos = this.checkLineOfSight(enemy, player);
        
        // State machine for enemy behavior
        if (enemy.health < enemy.maxHealth * 0.3) {
            // Retreat when heavily damaged
            this.retreat(enemy, player, angleToPlayer);
        } else if (distance < 300 && hasLos) {
            // Engage if in range and has LOS
            this.engage(enemy, player, distance, angleToPlayer);
        } else if (distance < 600) {
            // Hunt the player
            this.hunt(enemy, player, distance, angleToPlayer);
        } else {
            // Patrol or move to last known position
            this.patrol(enemy);
        }
    }
    
    engage(enemy, player, distance, angleToPlayer) {
        // Set turret to aim at player
        enemy.targetTurretAngle = angleToPlayer;
        
        // Check if turret is roughly aimed at player
        const turretDiff = Math.abs(enemy.turretAngle - angleToPlayer);
        const aimed = turretDiff < 0.1;
        
        if (aimed && enemy.mainGun.ready) {
            // Fire main gun
            enemy.fire();
        } else if (aimed && enemy.coaxialMG.ready && distance < 200) {
            // Use MG at close range
            enemy.fireMG();
        }
        
        // Movement during engagement
        if (distance > 200) {
            // Advance if too far
            enemy.speed = Math.min(enemy.maxSpeed * 0.5, enemy.speed + enemy.acceleration);
        } else if (distance < 100) {
            // Create distance if too close
            enemy.speed = Math.max(-enemy.maxSpeed * 0.3, enemy.speed - enemy.acceleration);
        }
        
        // Flanking maneuver
        if (distance > 150 && distance < 300 && Math.random() < 0.01) {
            // Attempt to flank
            const flankAngle = angleToPlayer + (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2);
            enemy.targetTurretAngle = flankAngle;
            enemy.rotationSpeed = (flankAngle - enemy.hullAngle) * 0.5;
        }
    }
    
    hunt(enemy, player, distance, angleToPlayer) {
        // Move towards player
        enemy.targetTurretAngle = angleToPlayer;
        enemy.rotationSpeed = (angleToPlayer - enemy.hullAngle) * 0.3;
        enemy.speed = Math.min(enemy.maxSpeed * 0.7, enemy.speed + enemy.acceleration);
    }
    
    retreat(enemy, player, angleToPlayer) {
        // Run away from player
        const retreatAngle = angleToPlayer + Math.PI;
        enemy.targetTurretAngle = retreatAngle;
        enemy.rotationSpeed = (retreatAngle - enemy.hullAngle) * 0.5;
        enemy.speed = Math.min(enemy.maxSpeed, enemy.speed + enemy.acceleration);
        
        // Still try to fire while retreating
        if (Math.abs(enemy.turretAngle - angleToPlayer) < 0.3 && enemy.mainGun.ready) {
            enemy.fire();
        }
    }
    
    patrol(enemy) {
        // Simple patrol pattern
        if (!enemy.patrolPoint || 
            Math.hypot(enemy.x - enemy.patrolPoint.x, enemy.y - enemy.patrolPoint.y) < 50) {
            // Set new patrol point
            enemy.patrolPoint = {
                x: enemy.x + (Math.random() - 0.5) * 300,
                y: enemy.y + (Math.random() - 0.5) * 300
            };
        }
        
        // Move to patrol point
        const dx = enemy.patrolPoint.x - enemy.x;
        const dy = enemy.patrolPoint.y - enemy.y;
        const angleToPoint = Math.atan2(dy, dx);
        
        enemy.rotationSpeed = (angleToPoint - enemy.hullAngle) * 0.2;
        enemy.speed = Math.min(enemy.maxSpeed * 0.3, enemy.speed + enemy.acceleration);
    }
    
    checkLineOfSight(enemy, target) {
        // Simple line of sight check (can be enhanced with obstacle detection)
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        
        // Check if any obstacles block LOS
        // This would need map collision data
        return true; // Simplified for now
    }
}
