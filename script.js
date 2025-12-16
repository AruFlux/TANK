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
        this.notificationTimeout = null;
        
        // Player stats
        this.researchPoints = 150;
        this.playerTank = {
            type: 'light',
            health: 100,
            maxHealth: 100,
            damage: 20,
            speed: 3.0,
            reloadTime: 0.5, // seconds
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
            height: 2000
        };
        
        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.camera = { x: 0, y: 0 };
        
        // Game balance
        this.enemySpawnRate = 5.0; // seconds between spawns
        this.lastEnemySpawn = 0;
        this.maxEnemies = 8;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Set canvas size
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();
        
        // Setup player
        this.spawnPlayer();
        
        // Setup initial enemies
        for (let i = 0; i < 3; i++) {
            this.spawnEnemy();
        }
        
        // Event listeners
        this.setupEventListeners();
        
        // Load saved progress
        this.loadProgress();
        
        // Update HUD
        this.updateHUD();
        
        // Show welcome notification
        this.showNotification('Welcome to Tank Warfare! Destroy enemies to earn Research Points.');
        
        // Start game loop
        this.gameLoop();
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
        
        // Center camera on player
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;
    }
    
    spawnEnemy() {
        if (this.enemies.length >= this.maxEnemies) return;
        
        // Spawn enemy at random edge of map
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
        // Keyboard input
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Open research tree with T
            if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                this.toggleResearchModal();
            }
            
            // Open garage with G
            if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                this.toggleGarageModal();
            }
            
            // Pause with P
            if (e.key === 'p' || e.key === 'P') {
                this.isPaused = !this.isPaused;
                this.showNotification(this.isPaused ? 'Game Paused' : 'Game Resumed');
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
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.down = true;
            this.shoot();
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });
        
        // Research node clicks
        document.querySelectorAll('.research-node').forEach(node => {
            node.addEventListener('click', (e) => {
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
    
    update(deltaTime) {
        if (this.isPaused || !this.gameActive) return;
        
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
    }
    
    updatePlayer(deltaTime) {
        if (!this.player) return;
        
        let moveX = 0;
        let moveY = 0;
        
        // Movement input
        if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
        if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
        if (this.keys['d'] || this.keys['arrowright']) moveX += 1;
        
        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071;
            moveY *= 0.7071;
        }
        
        // Apply movement
        this.player.x += moveX * this.playerTank.speed * 60 * deltaTime;
        this.player.y += moveY * this.playerTank.speed * 60 * deltaTime;
        
        // Keep player in bounds
        this.player.x = Math.max(0, Math.min(this.map.width, this.player.x));
        this.player.y = Math.max(0, Math.min(this.map.height, this.player.y));
        
        // Update turret angle
        const dx = this.mouse.x - this.player.x;
        const dy = this.mouse.y - this.player.y;
        this.player.turretAngle = Math.atan2(dy, dx);
        
        // Auto-shooting if mouse is held down
        if (this.mouse.down) {
            this.shoot();
        }
    }
    
    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Move towards player
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                enemy.x += (dx / distance) * enemy.speed * 60 * deltaTime;
                enemy.y += (dy / distance) * enemy.speed * 60 * deltaTime;
                
                // Update turret angle
                enemy.turretAngle = Math.atan2(dy, dx);
            }
            
            // Enemy shooting
            enemy.lastShot += deltaTime;
            if (enemy.lastShot >= enemy.reloadTime && distance < 400) {
                this.enemyShoot(enemy);
                enemy.lastShot = 0;
            }
            
            // Remove dead enemies
            if (enemy.health <= 0) {
                this.createExplosion(enemy.x, enemy.y);
                this.enemies.splice(i, 1);
                this.researchPoints += 25;
                this.updateHUD();
                this.updateEnemyCounter();
                this.showNotification('Enemy destroyed! +25 Research Points');
            }
        }
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Move projectile
            proj.x += Math.cos(proj.angle) * proj.speed * 60 * deltaTime;
            proj.y += Math.sin(proj.angle) * proj.speed * 60 * deltaTime;
            
            // Check collisions
            if (proj.owner === 'player') {
                // Player projectile hits enemy
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
                // Enemy projectile hits player
                const dx = proj.x - this.player.x;
                const dy = proj.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 30) {
                    this.player.health -= proj.damage;
                    this.createHitEffect(proj.x, proj.y);
                    this.projectiles.splice(i, 1);
                    this.updateHUD();
                    
                    // Check if player died
                    if (this.player.health <= 0) {
                        this.gameOver();
                    }
                }
            }
            
            // Remove projectiles that go off-screen
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
        
        // Smooth camera follow
        const targetX = this.player.x - this.canvas.width / 2;
        const targetY = this.player.y - this.canvas.height / 2;
        
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
        
        // Keep camera within map bounds
        this.camera.x = Math.max(0, Math.min(this.map.width - this.canvas.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.map.height - this.canvas.height, this.camera.y));
    }
    
    shoot() {
        if (!this.player || this.isPaused) return;
        
        // Check reload time
        if (this.gameTime - this.playerTank.lastShot < this.playerTank.reloadTime) {
            return;
        }
        
        this.playerTank.lastShot = this.gameTime;
        
        // Create projectile
        this.projectiles.push({
            x: this.player.x + Math.cos(this.player.turretAngle) * 35,
            y: this.player.y + Math.sin(this.player.turretAngle) * 35,
            angle: this.player.turretAngle,
            speed: 12,
            damage: this.playerTank.damage,
            owner: 'player'
        });
        
        // Muzzle flash effect
        this.createMuzzleFlash(
