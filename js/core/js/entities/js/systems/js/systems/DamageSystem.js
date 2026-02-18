// js/systems/DamageSystem.js
export class DamageSystem {
    constructor(game) {
        this.game = game;
        this.penetrationValues = {
            apfsds: {
                base: 540,
                dropoff: 0.1 // mm lost per 100m
            },
            heat: {
                base: 480,
                dropoff: 0.05
            },
            he: {
                base: 127,
                dropoff: 0.15
            },
            mg: {
                base: 15,
                dropoff: 0.2
            }
        };
    }
    
    checkHit(projectile, target) {
        // Calculate hit angle relative to target
        const dx = projectile.x - target.x;
        const dy = projectile.y - target.y;
        const hitAngle = Math.atan2(dy, dx);
        
        // Determine which armor face is hit
        const relativeAngle = hitAngle - target.hullAngle;
        const face = this.getHitFace(relativeAngle);
        
        // Get armor value for that face
        const armorValue = target.armor[face];
        
        // Calculate penetration at this distance
        const penetration = this.calculatePenetration(
            projectile.type,
            projectile.distanceTraveled
        );
        
        // Calculate effective armor (angle multiplier)
        const impactAngle = Math.abs(relativeAngle - target.hullAngle);
        const effectiveArmor = armorValue / Math.cos(impactAngle);
        
        // Check if penetration occurs
        const penetrated = penetration > effectiveArmor;
        
        if (penetrated) {
            // Calculate spall and module damage
            return this.calculateDamage(projectile, target, face, penetration - effectiveArmor);
        }
        
        return { penetrated: false };
    }
    
    getHitFace(relativeAngle) {
        // Normalize angle to 0-2PI
        let angle = relativeAngle;
        while (angle < 0) angle += Math.PI * 2;
        while (angle > Math.PI * 2) angle -= Math.PI * 2;
        
        // Determine which face (front, side, rear)
        if (angle < Math.PI/4 || angle > Math.PI*7/4) return 'front';
        if (angle < Math.PI*3/4) return 'right';
        if (angle < Math.PI*5/4) return 'rear';
        return 'left';
    }
    
    calculatePenetration(ammoType, distance) {
        const penData = this.penetrationValues[ammoType];
        if (!penData) return 0;
        
        // Penetration drops with distance
        const distancePenalty = (distance / 100) * penData.dropoff;
        return Math.max(0, penData.base - distancePenalty);
    }
    
    calculateDamage(projectile, target, hitFace, overPenetration) {
        const damage = {
            penetrated: true,
            damage: 20 + Math.random() * 20,
            module: null,
            crew: null,
            message: 'Armor Penetrated!'
        };
        
        // Random chance to hit specific modules based on hit location
        const rand = Math.random();
        
        if (hitFace === 'front') {
            if (rand < 0.3) {
                damage.module = 'engine';
                damage.message = 'Engine Damaged!';
            } else if (rand < 0.5) {
                damage.crew = 'driver';
                damage.message = 'Driver Wounded!';
            }
        } else if (hitFace === 'side') {
            if (rand < 0.4) {
                damage.module = 'ammoRack';
                damage.message = 'Ammo Rack Hit!';
            } else if (rand < 0.6) {
                damage.crew = 'loader';
                damage.message = 'Loader Injured!';
            }
        } else if (hitFace === 'rear') {
            if (rand < 0.5) {
                damage.module = 'engine';
                damage.message = 'Engine Fire!';
            }
        }
        
        // Spall effect - secondary damage
        if (overPenetration > 50) {
            damage.damage *= 1.5;
            damage.message += ' + Spalling';
        }
        
        return damage;
    }
}
