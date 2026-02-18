// js/systems/UIManager.js
export class UIManager {
    constructor(game) {
        this.game = game;
        
        // UI Elements
        this.elements = {
            healthBar: document.getElementById('hullHealth'),
            healthPercent: document.getElementById('hullPercent'),
            turretHealth: document.getElementById('turretHealth'),
            turretPercent: document.getElementById('turretPercent'),
            reloadProgress: document.getElementById('reloadProgress'),
            reloadTime: document.getElementById('reloadTime'),
            mgHeat: document.getElementById('mgHeat'),
            damageFeed: document.getElementById('damageFeed'),
            hitIndicator: document.getElementById('hitIndicator'),
            hitArrow: document.getElementById('hitArrow'),
            hitMessage: document.getElementById('hitMessage'),
            minimapCanvas: document.getElementById('minimapCanvas'),
            ammoCounts: {
                apfsds: document.getElementById('ammo-apfsds'),
                heat: document.getElementById('ammo-heat'),
                he: document.getElementById('ammo-he')
            }
        };
        
        // Damage message queue
        this.damageMessages = [];
        this.messageLifetime = 3; // seconds
        
        // Initialize minimap context
        this.minimapCtx = this.elements.minimapCanvas.getContext('2d');
        this.minimapSize = 200;
        
        // Hit indicator state
        this.hitIndicatorActive = false;
        this.hitIndicatorTimer = 0;
        
        // Initialize UI
        this.init();
    }
    
    init() {
        // Set up ammo selector listeners
        document.querySelectorAll('.ammo-slot').forEach(slot => {
            slot.addEventListener('click', (e) => {
                const type = slot.dataset.type;
                if (this.game.player) {
                    this.game.player.mainGun.currentAmmo = type;
                    this.game.player.updateAmmoUI();
                }
            });
        });
    }
    
    update() {
        const player = this.game.player;
        if (!player) return;
        
        // Update health bars
        const healthPercent = (player.health / player.maxHealth) * 100;
        this.elements.healthBar.style.width = `${healthPercent}%`;
        this.elements.healthPercent.textContent = `${Math.round(healthPercent)}%`;
        
        // Update turret health
        const turretHealthPercent = (player.modules.turretRing.health / player.modules.turretRing.maxHealth) * 100;
        this.elements.turretHealth.style.width = `${turretHealthPercent}%`;
        this.elements.turretPercent.textContent = `${Math.round(turretHealthPercent)}%`;
        
        // Update reload progress
        if (!player.mainGun.ready) {
            const reloadPercent = (1 - player.mainGun.currentReload / player.mainGun.reloadTime) * 100;
            this.elements.reloadProgress.style.width = `${reloadPercent}%`;
            this.elements.reloadTime.textContent = `${player.mainGun.currentReload.toFixed(1)}s`;
        } else {
            this.elements.reloadProgress.style.width = '100%';
            this.elements.reloadTime.textContent = 'READY';
        }
        
        // Update MG heat
        const mgHeatPercent = (player.coaxialMG.heat / player.coaxialMG.maxHeat) * 100;
        this.elements.mgHeat.style.width = `${mgHeatPercent}%`;
        
        // Update ammo counts
        this.elements.ammoCounts.apfsds.textContent = player.mainGun.ammo.apfsds;
        this.elements.ammoCounts.heat.textContent = player.mainGun.ammo.heat;
        this.elements.ammoCounts.he.textContent = player.mainGun.ammo.he;
        
        // Update damage messages
        this.updateDamageMessages();
        
        // Update hit indicator
        this.updateHitIndicator();
        
        // Update minimap
        this.renderMinimap();
    }
    
    updateDamageMessages() {
        // Remove old messages
        this.damageMessages = this.damageMessages.filter(msg => {
            msg.life -= 1/60;
            return msg.life > 0;
        });
        
        // Render messages
        if (this.elements.damageFeed) {
            this.elements.damageFeed.innerHTML = this.damageMessages
                .map(msg => `<div class="damage-message" style="opacity: ${msg.life}">${msg.text}</div>`)
                .join('');
        }
    }
    
    addDamageMessage(text) {
        this.damageMessages.push({
            text: text,
            life: this.messageLifetime
        });
        
        // Limit to 5 messages
        if (this.damageMessages.length > 5) {
            this.damageMessages.shift();
        }
    }
    
    showHitIndicator(direction) {
        this.hitIndicatorActive = true;
        this.hitIndicatorTimer = 0.5; // Show for 0.5 seconds
        
        // Set arrow direction
        if (this.elements.hitArrow) {
            const angle = Math.atan2(direction.y, direction.x);
            this.elements.hitArrow.style.transform = `rotate(${angle}rad)`;
        }
        
        this.elements.hitIndicator.classList.add('active');
    }
    
    updateHitIndicator() {
        if (this.hitIndicatorActive) {
            this.hitIndicatorTimer -= 1/60;
            if (this.hitIndicatorTimer <= 0) {
                this.hitIndicatorActive = false;
                this.elements.hitIndicator.classList.remove('active');
            }
        }
    }
    
    renderMinimap() {
        const ctx = this.minimapCtx;
        const player = this.game.player;
        
        if (!ctx || !player) return;
        
        // Clear minimap
        ctx.fillStyle = '#1a3a1a';
        ctx.fillRect(0, 0, this.minimapSize, this.minimapSize);
        
        // Calculate scale
        const scale = this.minimapSize / this.game.mapSystem.mapSize;
        
        // Draw map features
        ctx.save();
        ctx.scale(scale, scale);
        
        // Draw capturable zones
        this.game.mapSystem.capturableZones.forEach(zone => {
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
            if (zone.team === 'blue') {
                ctx.fillStyle = 'rgba(0, 100, 255, 0.5)';
            } else if (zone.team === 'red') {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            }
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        // Draw buildings
        this.game.mapSystem.buildings.forEach(b => {
            ctx.fillStyle = '#6a4a3a';
            ctx.fillRect(b.x - b.width/2, b.y - b.height/2, b.width, b.height);
        });
        
        // Draw walls
        this.game.mapSystem.walls.forEach(w => {
            ctx.fillStyle = '#4a4a4a';
            ctx.fillRect(w.x - w.width/2, w.y - w.height/2, w.width, w.height);
        });
        
        // Draw trees
        this.game.mapSystem.trees.forEach(t => {
            ctx.fillStyle = '#2a6a2a';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw player
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw enemies
        this.game.enemies.forEach(enemy => {
            if (enemy.active) {
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        ctx.restore();
        
        // Draw player direction indicator
        ctx.save();
        ctx.translate(this.minimapSize/2, this.minimapSize/2);
        ctx.rotate(player.hullAngle);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(0, 5);
        ctx.lineTo(0, -5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    showMessage(text, type) {
        // Create temporary message
        const messageEl = document.createElement('div');
        messageEl.className = `game-message ${type}`;
        messageEl.textContent = text;
        messageEl.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: ${type === 'success' ? '#00ff00' : '#ffff00'};
            padding: 20px;
            border: 2px solid ${type === 'success' ? '#00ff00' : '#ffff00'};
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            z-index: 100;
            animation: fadeOut 2s forwards;
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 2000);
    }
    
    updateRepairKits(count) {
        const element = document.getElementById('repairKit');
        if (element) {
            element.textContent = count;
        }
    }
    
    updateExtinguishers(count) {
        const element = document.getElementById('extinguisher');
        if (element) {
            element.textContent = count;
        }
    }
    
    updateCaptureProgress(progress) {
        const bar = document.getElementById('captureBar');
        const timer = document.getElementById('captureTimer');
        
        if (bar) {
            bar.style.width = `${progress}%`;
        }
        if (timer) {
            timer.textContent = `${Math.round(progress)}%`;
        }
    }
    
    render(ctx) {
        // This is called from GameEngine.render for HUD elements that need canvas rendering
        // For now, most UI is handled by DOM elements
        
        // Draw crosshair
        if (this.game.player) {
            const centerX = this.game.canvas.width / 2;
            const centerY = this.game.canvas.height / 2;
            
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            
            // Crosshair
            ctx.beginPath();
            ctx.moveTo(centerX - 20, centerY);
            ctx.lineTo(centerX - 10, centerY);
            ctx.moveTo(centerX + 10, centerY);
            ctx.lineTo(centerX + 20, centerY);
            ctx.moveTo(centerX, centerY - 20);
            ctx.lineTo(centerX, centerY - 10);
            ctx.moveTo(centerX, centerY + 10);
            ctx.lineTo(centerX, centerY + 20);
            ctx.stroke();
            
            // Range indicator
            ctx.font = '14px "Courier New"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${this.getTargetDistance()}m`, centerX + 30, centerY - 30);
            
            ctx.restore();
        }
    }
    
    getTargetDistance() {
        const player = this.game.player;
        if (!player) return 0;
        
        // Find nearest enemy
        let nearestDist = Infinity;
        this.game.enemies.forEach(enemy => {
            if (enemy.active) {
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const dist = Math.hypot(dx, dy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                }
            }
        });
        
        return Math.round(nearestDist === Infinity ? 0 : nearestDist);
    }
}
