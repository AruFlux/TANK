// Main Game Class
class TankGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Game state
        this.gameTime = 0;
        this.isPaused = false;
        this.gameActive = true;
        this.lastTime = 0;
        this.notificationTimeout = null;
        
        // Player stats
        this.researchPoints = 150;
        this.playerTank = {
            type: 'light',
            health: 100,
            maxHealth: 100,
            damage: 20,
            speed: 3.0,
            reloadTime: 0.5,
            lastShot: 0
        };
        
        // Research progress
        this.researchCompleted = {
            damage1: false,
            armor1: false,
            speed1: false,
            damage2: false,
            health2: false,
            tank2: false
        };
        
        // Tank garage
        this.unlockedTanks = ['light'];
        this.currentTank = 'light';
        
        // Game objects
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.map = {
            width: 2000,
            height: 2000,
            gridSize: 100
        };
        
        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.camera = { x: 0, y: 0 };
        
        // Game balance
        this.enemySpawnRate = 5.0;
        this.lastEnemySpawn = 0;
        this.maxEnemies = 8;
        
        // Stats
        this.enemiesKilled = 0;
        this.researchPurchased = 0;
        this.timeSurvived = 0;
        
        // Initialize
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        this.spawnPlayer();
        
        // Setup initial enemies
        for (let i = 0; i < 3; i++) {
            this.spawnEnemy();
        }
        
        this.setupEventListeners();
        this.loadProgress();
        this.updateHUD();
        this.showNotification('Welcome to Tank Warfare! Destroy enemies to earn Research Points.');
        
        // Start game loop
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    spawnPlayer() {
        this.player = {
            x: this.map.width / 2,
            y: this.map.height / 2,
            width: 40,
            height: 60,
            turretAngle: 0,
            health: this.playerTank.health,
            maxHealth: this.playerTank.maxHealth
        };
        
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;
    }
    
    spawnEnemy() {
        if (this.enemies.length >= this.maxEnemies) return;
        
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: // Top
                x = Math.random() * this.map.width;
                y = -50;
                break;
            case 1: // Right
                x = this.map.width + 50;
                y = Math.random() * this.map.height;
                break;
            case 2: // Bottom
                x = Math.random() * this.map.width;
                y = this.map.height + 50;
                break;
            case 3: // Left
                x = -50;
                y = Math.random() * this.map.height;
                break;
        }
        
        this.enemies.push({
            x: x,
            y: y,
            width: 40,
            height: 60,
            health: 40,
            maxHealth: 40,
            damage: 10,
            speed: 1.0 + Math.random() * 0.5,
            turretAngle: 0,
            targetX: this.player.x,
            targetY: this.player.y,
            lastShot: Math.random() * 2,
            reloadTime: 1.5 + Math.random(),
            type: 'basic'
        });
        
        this.updateEnemyCounter();
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Keyboard input
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                this.toggleResearchModal();
            }
            
            if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                this.toggleGarageModal();
            }
            
            if (e.key === 'p' || e.key === 'P') {
                this.isPaused = !this.isPaused;
                this.showNotification(this.isPaused ? 'Game Paused' : 'Game Resumed');
            }
            
            if (e.key === 'r' || e.key === 'R') {
                if (!this.gameActive) {
                    this.restartGame();
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse input
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left + this.camera.x;
            this.mouse.y = e.clientY - rect.top + this.camera.y;
        });
        
        this.canvas.addEventListener('mousedown', () => {
            this.mouse.down = true;
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });
        
        // Research node clicks
        document.querySelectorAll('.research-node').forEach(node => {
            node.addEventListener('click', () => {
                if (!node.classList.contains('locked')) {
                    this.purchaseResearch(node.dataset.id);
                }
            });
        });
        
        // Tank selection clicks
        document.querySelectorAll('.tank-option').forEach(tank => {
            tank.addEventListener('click', () => {
                if (!tank.classList.contains('locked')) {
                    this.selectTank(tank.dataset.tank);
                }
            });
        });
        
        // Modal close buttons
        document.getElementById('closeResearch').addEventListener('click', () => {
            this.toggleResearchModal();
        });
        
        document.getElementById('closeGarage').addEventListener('click', () => {
            this.toggleGarageModal();
        });
        
        // Close modals with Escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }
    
    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        if (!this.isPaused && this.gameActive) {
            this.timeSurvived += deltaTime;
            this.update(deltaTime);
        }
        
        this.render();
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
    
    update(deltaTime) {
        this.gameTime += deltaTime;
        
        // Update player
        this.updatePlayer(deltaTime);
        
        // Update enemies
        this.updateEnemies(deltaTime);
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update camera
        this.updateCamera();
        
        // Spawn new enemies
        if (this.gameTime - this.lastEnemySpawn > this.enemySpawnRate && this.enemies.length < this.maxEnemies) {
            this.spawnEnemy();
            this.lastEnemySpawn = this.gameTime;
        }
        
        // Auto-shooting if mouse is held down
        if (this.mouse.down) {
            this.shoot();
        }
    }
    
    updatePlayer(deltaTime) {
        if (!this.player) return;
        
        let moveX = 0;
        let moveY = 0;
        
        if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
        if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
        if (this.keys['d'] || this.keys['arrowright']) moveX += 1;
        
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071;
            moveY *= 0.7071;
        }
        
        this.player.x += moveX * this.playerTank.speed * 60 * deltaTime;
        this.player.y += moveY * this.playerTank.speed * 60 * deltaTime;
        
        this.player.x = Math.max(0, Math.min(this.map.width, this.player.x));
        this.player.y = Math.max(0, Math.min(this.map.height, this.player.y));
        
        const dx = this.mouse.x - this.player.x;
        const dy = this.mouse.y - this.player.y;
        this.player.turretAngle = Math.atan2(dy, dx);
    }
    
    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                enemy.x += (dx / distance) * enemy.speed * 60 * deltaTime;
                enemy.y += (dy / distance) * enemy.speed * 60 * deltaTime;
                enemy.turretAngle = Math.atan2(dy, dx);
            }
            
            enemy.lastShot += deltaTime;
            if (enemy.lastShot >= enemy.reloadTime && distance < 400) {
                this.enemyShoot(enemy);
                enemy.lastShot = 0;
            }
            
            if (enemy.health <= 0) {
                this.createExplosion(enemy.x, enemy.y);
                this.enemies.splice(i, 1);
                this.researchPoints += 25;
                this.enemiesKilled++;
                this.updateHUD();
                this.updateEnemyCounter();
                this.showNotification('Enemy destroyed! +25 Research Points');
            }
        }
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            proj.x += Math.cos(proj.angle) * proj.speed * 60 * deltaTime;
            proj.y += Math.sin(proj.angle) * proj.speed * 60 * deltaTime;
            
            if (proj.owner === 'player') {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    const dx = proj.x - enemy.x;
                    const dy = proj.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 30) {
                        enemy.health -= proj.damage;
                        this.createHitEffect(proj.x, proj.y);
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
            } else {
                const dx = proj.x - this.player.x;
                const dy = proj.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 30) {
                    this.player.health -= proj.damage;
                    this.createHitEffect(proj.x, proj.y);
                    this.projectiles.splice(i, 1);
                    this.updateHUD();
                    
                    if (this.player.health <= 0) {
                        this.gameOver();
                    }
                }
            }
            
            if (proj.x < -100 || proj.x > this.map.width + 100 || 
                proj.y < -100 || proj.y > this.map.height + 100) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx * 60 * deltaTime;
            p.y += p.vy * 60 * deltaTime;
            p.life -= deltaTime;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateCamera() {
        if (!this.player) return;
        
        const targetX = this.player.x - this.canvas.width / 2;
        const targetY = this.player.y - this.canvas.height / 2;
        
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
        
        this.camera.x = Math.max(0, Math.min(this.map.width - this.canvas.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.map.height - this.canvas.height, this.camera.y));
    }
    
    shoot() {
        if (!this.player || this.isPaused || !this.gameActive) return;
        
        if (this.gameTime - this.playerTank.lastShot < this.playerTank.reloadTime) {
            return;
        }
        
        this.playerTank.lastShot = this.gameTime;
        
        this.projectiles.push({
            x: this.player.x + Math.cos(this.player.turretAngle) * 35,
            y: this.player.y + Math.sin(this.player.turretAngle) * 35,
            angle: this.player.turretAngle,
            speed: 12,
            damage: this.playerTank.damage,
            owner: 'player'
        });
        
        this.createMuzzleFlash(this.player.x, this.player.y, this.player.turretAngle);
    }
    
    enemyShoot(enemy) {
        this.projectiles.push({
            x: enemy.x + Math.cos(enemy.turretAngle) * 35,
            y: enemy.y + Math.sin(enemy.turretAngle) * 35,
            angle: enemy.turretAngle,
            speed: 8,
            damage: enemy.damage,
            owner: 'enemy'
        });
    }
    
    createMuzzleFlash(x, y, angle) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x + Math.cos(angle) * 35,
                y: y + Math.sin(angle) * 35,
                vx: Math.cos(angle) * (5 + Math.random() * 5),
                vy: Math.sin(angle) * (5 + Math.random() * 5),
                life: 0.1 + Math.random() * 0.1,
                color: '#FFD700'
            });
        }
    }
    
    createHitEffect(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.2,
                color: '#FF4500'
            });
        }
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 4;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.3,
                color: i % 2 === 0 ? '#FF8C00' : '#FFD700'
            });
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw map grid
        this.drawMap();
        
        // Apply camera transformation
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw player
        if (this.player) {
            this.drawTank(this.player.x, this.player.y, this.player.turretAngle, '#3498db', this.player.health, this.player.maxHealth);
        }
        
        // Draw enemies
        this.enemies.forEach(enemy => {
            this.drawTank(enemy.x, enemy.y, enemy.turretAngle, '#e74c3c', enemy.health, enemy.maxHealth);
        });
        
        // Draw projectiles
        this.projectiles.forEach(proj => {
            this.ctx.fillStyle = proj.owner === 'player' ? '#2ecc71' : '#e74c3c';
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, proj.owner === 'player' ? 4 : 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Trail effect
            this.ctx.strokeStyle = proj.owner === 'player' ? '#2ecc71' : '#e74c3c';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(proj.x, proj.y);
            this.ctx.lineTo(
                proj.x - Math.cos(proj.angle) * 10,
                proj.y - Math.sin(proj.angle) * 10
            );
            this.ctx.stroke();
        });
        
        // Draw particles
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
        
        this.ctx.restore();
        
        // Draw minimap
        this.drawMinimap();
    }
    
    drawMap() {
        const gridSize = this.map.gridSize;
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        
        this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.2)';
        this.ctx.lineWidth = 1;
        
        for (let x = startX; x < this.camera.x + this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x - this.camera.x, 0);
            this.ctx.lineTo(x - this.camera.x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = startY; y < this.camera.y + this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y - this.camera.y);
            this.ctx.lineTo(this.canvas.width, y - this.camera.y);
            this.ctx.stroke();
        }
        
        // Draw map boundaries
        this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(-this.camera.x, -this.camera.y, this.map.width, this.map.height);
    }
    
    drawTank(x, y, angle, color, health, maxHealth) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Draw tank body
        this.ctx.fillStyle = color;
        this.ctx.fillRect(-20, -30, 40, 60);
        
        // Draw tank outline
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-20, -30, 40, 60);
        
        // Draw turret
        this.ctx.rotate(angle);
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, -8, 30, 16);
        
        // Draw gun barrel
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(28, -4, 15, 8);
        
        this.ctx.restore();
        
        // Draw health bar if not full
        if (health < maxHealth) {
            const barWidth = 40;
            const barHeight = 5;
            const healthPercent = health / maxHealth;
            
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.fillRect(x - barWidth/2, y - 45, barWidth, barHeight);
            
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.fillRect(x - barWidth/2, y - 45, barWidth * healthPercent, barHeight);
            
            this.ctx.strokeStyle = '#2c3e50';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x - barWidth/2, y - 45, barWidth, barHeight);
        }
    }
    
    drawMinimap() {
        const minimapSize = 150;
        const minimapX = this.canvas.width - minimapSize - 20;
        const minimapY = 20;
        const scale = minimapSize / this.map.width;
        
        // Minimap background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
        
        // Draw player on minimap
        this.ctx.fillStyle = '#3498db';
        this.ctx.beginPath();
        this.ctx.arc(
            minimapX + this.player.x * scale,
            minimapY + this.player.y * scale,
            3, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Draw enemies on minimap
        this.ctx.fillStyle = '#e74c3c';
        this.enemies.forEach(enemy => {
            this.ctx.beginPath();
            this.ctx.arc(
                minimapX + enemy.x * scale,
                minimapY + enemy.y * scale,
                2, 0, Math.PI * 2
            );
            this.ctx.fill();
        });
        
        // Draw viewport rectangle
        this.ctx.strokeStyle = '#2ecc71';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            minimapX + this.camera.x * scale,
            minimapY + this.camera.y * scale,
            this.canvas.width * scale,
            this.canvas.height * scale
        );
    }
    
    updateHUD() {
        document.getElementById('health').textContent = Math.max(0, this.player?.health || 0);
        document.getElementById('damage').textContent = this.playerTank.damage.toFixed(1);
        document.getElementById('speed').textContent = this.playerTank.speed.toFixed(1);
        document.getElementById('researchPoints').textContent = this.researchPoints;
    }
    
    updateEnemyCounter() {
        document.getElementById('enemyCount').textContent = this.enemies.length;
    }
    
    showNotification(message, duration = 3000) {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');
        
        text.textContent = message;
        notification.classList.add('show');
        
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        this.notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }
    
    toggleResearchModal() {
        const modal = document.getElementById('researchModal');
        modal.classList.toggle('active');
        this.isPaused = modal.classList.contains('active');
        this.updateResearchUI();
    }
    
    toggleGarageModal() {
        const modal = document.getElementById('garageModal');
        modal.classList.toggle('active');
        this.isPaused = modal.classList.contains('active');
        this.updateGarageUI();
    }
    
    closeAllModals() {
        document.getElementById('researchModal').classList.remove('active');
        document.getElementById('garageModal').classList.remove('active');
        this.isPaused = false;
    }
    
    updateResearchUI() {
        // Update research nodes based on progress
        Object.keys(this.researchCompleted).forEach(researchId => {
            const node = document.querySelector(`[data-id="${researchId}"]`);
            if (node) {
                if (this.researchCompleted[researchId]) {
                    node.classList.add('unlocked');
                    node.classList.remove('locked');
                } else {
                    // Check if prerequisites are met
                    if (this.canResearch(researchId)) {
                        node.classList.remove('locked');
                    } else {
                        node.classList.add('locked');
                    }
                }
            }
        });
        
        // Update tier visibility
        const tier2 = document.querySelectorAll('.research-tier')[1];
        const tier3 = document.querySelectorAll('.research-tier')[2];
        
        // Tier 2 unlocked if any Tier 1 is completed
        const tier1Completed = Object.keys(this.researchCompleted)
            .filter(id => id.endsWith('1'))
            .some(id => this.researchCompleted[id]);
        
        if (tier1Completed) {
            tier2.classList.remove('locked');
        }
        
        // Tier 3 unlocked if Tier 2 is completed
        const tier2Completed = Object.keys(this.researchCompleted)
            .filter(id => id.endsWith('2'))
            .some(id => this.researchCompleted[id]);
        
        if (tier2Completed) {
            tier3.classList.remove('locked');
        }
    }
    
    updateGarageUI() {
        document.querySelectorAll('.tank-option').forEach(tank => {
            if (this.unlockedTanks.includes(tank.dataset.tank)) {
                tank.classList.remove('locked');
                if (tank.dataset.tank === this.currentTank) {
                    tank.classList.add('selected');
                } else {
                    tank.classList.remove('selected');
                }
            } else {
                tank.classList.add('locked');
                tank.classList.remove('selected');
            }
        });
    }
    
    canResearch(researchId) {
        const requirements = {
            'damage1': [],
            'armor1': [],
            'speed1': [],
            'damage2': ['damage1'],
            'health2': ['armor1'],
            'tank2': ['damage2', 'health2']
        };
        
        const reqs = requirements[researchId] || [];
        return reqs.every(req => this.researchCompleted[req]);
    }
    
    purchaseResearch(researchId) {
        const costs = {
            'damage1': 50,
            'armor1': 50,
            'speed1': 50,
            'damage2': 100,
            'health2': 100,
            'tank2': 200
        };
        
        const cost = costs[researchId];
        
        if (this.researchPoints >= cost && !this.researchCompleted[researchId] && this.canResearch(researchId)) {
            this.researchPoints -= cost;
            this.researchCompleted[researchId] = true;
            this.researchPurchased++;
            
            // Apply research effects
            this.applyResearchEffect(researchId);
            
            this.updateHUD();
            this.updateResearchUI();
            this.saveProgress();
            
            this.showNotification(`Research "${researchId}" completed!`);
            
            // Unlock heavy tank if researched
            if (researchId === 'tank2') {
                this.unlockedTanks.push('heavy');
                this.updateGarageUI();
                this.showNotification('Heavy Tank unlocked! Go to Garage to select it.');
            }
            
            return true;
        } else {
            this.showNotification('Cannot purchase this research yet!', 2000);
            return false;
        }
    }
    
    applyResearchEffect(researchId) {
        switch(researchId) {
            case 'damage1':
                this.playerTank.damage *= 1.15;
                break;
            case 'armor1':
                this.playerTank.maxHealth *= 1.25;
                this.playerTank.health = this.playerTank.maxHealth;
                if (this.player) {
                    this.player.maxHealth = this.playerTank.maxHealth;
                    this.player.health = this.playerTank.health;
                }
                break;
            case 'speed1':
                this.playerTank.speed *= 1.20;
                break;
            case 'damage2':
                this.playerTank.damage *= 1.30;
                break;
            case 'health2':
                this.playerTank.maxHealth *= 1.50;
                this.playerTank.health = this.playerTank.maxHealth;
                if (this.player) {
                    this.player.maxHealth = this.playerTank.maxHealth;
                    this.player.health = this.playerTank.health;
                }
                break;
        }
        this.updateHUD();
    }
    
    selectTank(tankType) {
        if (!this.unlockedTanks.includes(tankType)) return;
        
        this.currentTank = tankType;
        
        // Update tank stats based on type
        switch(tankType) {
            case 'light':
                this.playerTank = {
                    type: 'light',
                    health: 100,
                    maxHealth: 100,
                    damage: 20,
                    speed: 3.0,
                    reloadTime: 0.5,
                    lastShot: this.playerTank.lastShot
                };
                break;
            case 'heavy':
                this.playerTank = {
                    type: 'heavy',
                    health: 200,
                    maxHealth: 200,
                    damage: 35,
                    speed: 1.5,
                    reloadTime: 0.8,
                    lastShot: this.playerTank.lastShot
                };
                break;
        }
        
        // Apply research bonuses to new tank
        Object.keys(this.researchCompleted).forEach(researchId => {
            if (this.researchCompleted[researchId]) {
                this.applyResearchEffect(researchId);
            }
        });
        
        if (this.player) {
            this.player.health = this.playerTank.health;
            this.player.maxHealth = this.playerTank.maxHealth;
        }
        
        this.updateGarageUI();
        this.updateHUD();
        this.showNotification(`${tankType.charAt(0).toUpperCase() + tankType.slice(1)} Tank selected!`);
        this.saveProgress();
    }
    
    gameOver() {
        this.gameActive = false;
        this.saveProgress();
        
        // Create game over screen
        const gameOverDiv = document.createElement('div');
        gameOverDiv.className = 'game-over active';
        gameOverDiv.innerHTML = `
            <div class="game-over-content">
                <h1><i class="fas fa-skull-crossbones"></i> GAME OVER</h1>
                <div class="game-over-stats">
                    <div><i class="fas fa-clock"></i> Time Survived: ${Math.floor(this.timeSurvived)} seconds</div>
                    <div><i class="fas fa-robot"></i> Enemies Killed: ${this.enemiesKilled}</div>
                    <div><i class="fas fa-flask"></i> Research Completed: ${this.researchPurchased}</div>
                    <div><i class="fas fa-coins"></i> Research Points: ${this.researchPoints}</div>
                </div>
                <p>Press R to restart or refresh the page</p>
                <button class="restart-btn" onclick="game.restartGame()">RESTART GAME</button>
            </div>
        `;
        
        document.querySelector('.game-container').appendChild(gameOverDiv);
    }
    
    restartGame() {
        // Remove game over screen
        const gameOverDiv = document.querySelector('.game-over');
        if (gameOverDiv) {
            gameOverDiv.remove();
        }
        
        // Reset game state
        this.gameTime = 0;
        this.isPaused = false;
        this.gameActive = true;
        this.lastTime = 0;
        
        this.researchPoints = 150;
        this.playerTank = {
            type: 'light',
            health: 100,
            maxHealth: 100,
            damage: 20,
            speed: 3.0,
            reloadTime: 0.5,
            lastShot: 0
        };
        
        this.researchCompleted = {
            damage1: false,
            armor1: false,
            speed1: false,
            damage2: false,
            health2: false,
            tank2: false
        };
        
        this.unlockedTanks = ['light'];
        this.currentTank = 'light';
        
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        
        this.enemiesKilled = 0;
        this.researchPurchased = 0;
        this.timeSurvived = 0;
        
        this.spawnPlayer();
        for (let i = 0; i < 3; i++) {
            this.spawnEnemy();
        }
        
        this.updateHUD();
        this.updateEnemyCounter();
        this.updateResearchUI();
        this.updateGarageUI();
        this.showNotification('Game restarted! Good luck!');
    }
    
    saveProgress() {
        const progress = {
            researchPoints: this.researchPoints,
            researchCompleted: this.researchCompleted,
            unlockedTanks: this.unlockedTanks,
            currentTank: this.currentTank,
            playerTank: this.playerTank,
            enemiesKilled: this.enemiesKilled,
            researchPurchased: this.researchPurchased,
            timeSurvived: this.timeSurvived
        };
        
        try {
            localStorage.setItem('tankWarfareProgress', JSON.stringify(progress));
        } catch (e) {
            console.warn('Could not save progress:', e);
        }
    }
    
    loadProgress() {
        try {
            const saved = localStorage.getItem('tankWarfareProgress');
            if (saved) {
                const progress = JSON.parse(saved);
                
                this.researchPoints = progress.researchPoints || 150;
                this.researchCompleted = progress.researchCompleted || {};
                this.unlockedTanks = progress.unlockedTanks || ['light'];
                this.currentTank = progress.currentTank || 'light';
                this.playerTank = progress.playerTank || this.playerTank;
                this.enemiesKilled = progress.enemiesKilled || 0;
                this.researchPurchased = progress.researchPurchased || 0;
                this.timeSurvived = progress.timeSurvived || 0;
                
                // Apply loaded tank
                this.selectTank(this.currentTank);
                
                this.showNotification('Progress loaded from previous session!');
            }
        } catch (e) {
            console.warn('Could not load progress:', e);
        }
    }
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new TankGame();
});
