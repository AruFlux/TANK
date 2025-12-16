// ============================================
// REALISTIC TANK COMBAT GAME
// ============================================

class RealisticTankGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Game state
        this.gameTime = 0;
        this.lastTime = 0;
        this.isPaused = false;
        this.gameActive = true;
        this.zoomLevel = 1;
        this.isZooming = false;
        
        // Player resources
        this.silverLions = 15000;
        this.researchPoints = 1250;
        
        // Player tank specifications (M4 Sherman as baseline)
        this.playerTank = {
            // Identification
            name: "M4 Sherman",
            nation: "USA",
            tier: 3,
            
            // Physical properties
            mass: 30600, // kg
            width: 2.62, // meters
            length: 5.84,
            height: 2.74,
            
            // Mobility
            enginePower: 400, // hp
            maxSpeed: 38, // km/h
            reverseSpeed: 10,
            turnRate: 30, // degrees per second
            fuelCapacity: 660, // liters
            currentFuel: 660,
            fuelConsumption: 1.2, // liters per minute at idle
            
            // Armor (mm) - front/side/rear/top
            armor: {
                hull: { front: 51, side: 38, rear: 38, top: 19 },
                turret: { front: 76, side: 51, rear: 51, top: 25 }
            },
            
            // Armament
            gun: {
                caliber: 75, // mm
                name: "M3 L/40",
                reloadTime: 8.3, // seconds
                reloadProgress: 0,
                isReloading: false,
                
                // Shell types
                shells: [
                    { type: "AP", damage: 110, penetration: 91, velocity: 619, count: 15 },
                    { type: "APCBC", damage: 125, penetration: 102, velocity: 618, count: 10 },
                    { type: "HE", damage: 45, penetration: 10, velocity: 463, count: 5, blastRadius: 5 },
                    { type: "SMOKE", damage: 0, penetration: 0, velocity: 300, count: 3 }
                ],
                selectedShell: 0
            },
            
            // Crew (5 members)
            crew: [
                { role: "Commander", health: 100, skill: 50 },
                { role: "Gunner", health: 100, skill: 50 },
                { role: "Loader", health: 100, skill: 50 },
                { role: "Driver", health: 100, skill: 50 },
                { role: "Radio Operator", health: 100, skill: 50 }
            ],
            
            // Modules
            modules: {
                engine: { health: 100, maxHealth: 100 },
                transmission: { health: 100, maxHealth: 100 },
                fuelTank: { health: 100, maxHealth: 100 },
                ammoRack: { health: 100, maxHealth: 100, wetStorage: false },
                tracks: { left: 100, right: 100 }
            },
            
            // Current status
            health: 100,
            speed: 0,
            rotation: 0, // radians
            turretRotation: 0,
            gunElevation: 0,
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 }
        };
        
        // Research progress
        this.research = {
            engine1: false, engine2: false,
            gun1: false, gun2: false,
            armor1: false,
            tank2: false, tank3: false
        };
        
        // Unlocked vehicles
        this.unlockedTanks = ["M4 Sherman"];
        
        // Combat
        this.enemies = [];
        this.projectiles = [];
        this.smokeParticles = [];
        this.explosions = [];
        this.camera = { x: 0, y: 0 };
        
        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        
        // Terrain
        this.terrain = {
            width: 2000,
            height: 2000,
            elevation: [],
            obstacles: []
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Setup player
        this.spawnPlayer();
        
        // Setup enemies
        this.spawnEnemies();
        
        // Generate terrain
        this.generateTerrain();
        
        // Setup event listeners
        this.setupInput();
        
        // Update UI
        this.updateHUD();
        
        // Start game loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    spawnPlayer() {
        this.playerTank.position = {
            x: this.terrain.width / 2,
            y: this.terrain.height / 2
        };
        
        this.camera.x = this.playerTank.position.x - this.canvas.width / 2;
        this.camera.y = this.playerTank.position.y - this.canvas.height / 2;
    }
    
    spawnEnemies() {
        // Spawn 3 enemy tanks of different types
        const enemyTypes = [
            {
                name: "Panzer IV H",
                nation: "Germany",
                armor: { front: 80, side: 30, rear: 20 },
                gun: { caliber: 75, penetration: 98, reload: 7.5 },
                speed: 38,
                ai: "aggressive"
            },
            {
                name: "T-34 (1942)",
                nation: "USSR", 
                armor: { front: 45, side: 45, rear: 40 },
                gun: { caliber: 76, penetration: 95, reload: 8.0 },
                speed: 53,
                ai: "flanker"
            },
            {
                name: "M4A1 Sherman",
                nation: "USA",
                armor: { front: 51, side: 38, rear: 38 },
                gun: { caliber: 75, penetration: 91, reload: 8.3 },
                speed: 38,
                ai: "defensive"
            }
        ];
        
        for (let i = 0; i < 3; i++) {
            const type = enemyTypes[i];
            this.enemies.push({
                id: i,
                type: type,
                position: {
                    x: 300 + i * 400,
                    y: 300 + (i % 2) * 300
                },
                rotation: Math.random() * Math.PI * 2,
                turretRotation: 0,
                health: 100,
                speed: 0,
                aiState: "patrol",
                targetPosition: null,
                lastShot: 0,
                shells: 30,
                spotted: false,
                lastKnownPosition: null
            });
        }
        
        this.updateEnemyCounter();
    }
    
    generateTerrain() {
        // Create some hills and valleys
        for (let y = 0; y < this.terrain.height; y += 100) {
            for (let x = 0; x < this.terrain.width; x += 100) {
                const elevation = Math.sin(x * 0.01) * Math.cos(y * 0.01) * 50;
                this.terrain.elevation.push({ x, y, height: elevation });
            }
        }
        
        // Add obstacles (trees, rocks, buildings)
        for (let i = 0; i < 50; i++) {
            this.terrain.obstacles.push({
                x: Math.random() * this.terrain.width,
                y: Math.random() * this.terrain.height,
                type: Math.random() > 0.5 ? "tree" : "rock",
                size: 20 + Math.random() * 30
            });
        }
    }
    
    setupInput() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Research tree
            if (e.key === 't' || e.key === 'T') {
                this.toggleResearchModal();
            }
            
            // Reload
            if (e.key === 'r' || e.key === 'R') {
                this.reloadGun();
            }
            
            // Shell selection
            if (e.key >= '1' && e.key <= '4') {
                this.selectShell(parseInt(e.key) - 1);
            }
            
            // Pause
            if (e.key === 'p' || e.key === 'P') {
                this.isPaused = !this.isPaused;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.mouse.down = true;
                this.fireGun();
            } else if (e.button === 2) { // Right click
                this.isZooming = true;
                this.zoomLevel = 2.0;
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.down = false;
            } else if (e.button === 2) {
                this.isZooming = false;
                this.zoomLevel = 1.0;
            }
        });
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    gameLoop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        if (!this.isPaused && this.gameActive) {
            this.update(deltaTime);
        }
        
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        this.gameTime += deltaTime;
        
        // Update player tank
        this.updateTank(deltaTime);
        
        // Update enemies AI
        this.updateEnemies(deltaTime);
        
        // Update projectiles with ballistic physics
        this.updateProjectiles(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update camera
        this.updateCamera();
        
        // Consume fuel
        this.consumeFuel(deltaTime);
        
        // Update reload progress
        if (this.playerTank.gun.isReloading) {
            this.playerTank.gun.reloadProgress += deltaTime;
            if (this.playerTank.gun.reloadProgress >= this.playerTank.gun.reloadTime) {
                this.playerTank.gun.isReloading = false;
                this.playerTank.gun.reloadProgress = 0;
            }
        }
    }
    
    updateTank(deltaTime) {
        const tank = this.playerTank;
        
        // Calculate input forces
        let throttle = 0;
        let steering = 0;
        
        if (this.keys['w'] || this.keys['arrowup']) throttle = 1;
        if (this.keys['s'] || this.keys['arrowdown']) throttle = -0.5; // Reverse is slower
        if (this.keys['a'] || this.keys['arrowleft']) steering = -1;
        if (this.keys['d'] || this.keys['arrowright']) steering = 1;
        if (this.keys[' ']) throttle = 0; // Brake
        
        // Calculate movement with realistic physics
        const maxSpeed = throttle > 0 ? tank.maxSpeed : tank.reverseSpeed;
        const targetSpeed = throttle * maxSpeed;
        
        // Acceleration based on engine power and mass
        const acceleration = (tank.enginePower * 735.5) / tank.mass; // Convert hp to watts
        const speedDiff = targetSpeed - tank.speed;
        
        if (Math.abs(speedDiff) > 0.1) {
            tank.speed += Math.sign(speedDiff) * acceleration * deltaTime;
            tank.speed = Math.max(-tank.reverseSpeed, Math.min(tank.maxSpeed, tank.speed));
        }
        
        // Convert km/h to m/s and apply to position
        const speedMs = tank.speed * (1000 / 3600);
        const moveDistance = speedMs * deltaTime;
        
        // Apply rotation
        const turnRate = tank.turnRate * (Math.PI / 180); // Convert to radians
        tank.rotation += steering * turnRate * deltaTime * (1 - Math.abs(speedMs) / 20);
        
        // Calculate new position
        const moveX = Math.cos(tank.rotation) * moveDistance;
        const moveY = Math.sin(tank.rotation) * moveDistance;
        
        // Check terrain collisions
        const newX = tank.position.x + moveX;
        const newY = tank.position.y + moveY;
        
        if (this.canMoveTo(newX, newY)) {
            tank.position.x = newX;
            tank.position.y = newY;
        } else {
            // Collision - slow down
            tank.speed *= 0.5;
        }
        
        // Update turret rotation to follow mouse
        const targetAngle = this.getMouseAngle();
        const angleDiff = targetAngle - tank.turretRotation;
        
        // Normalize angle difference
        const normalizedDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
        const turretSpeed = 1.5 * (Math.PI / 180); // 1.5 degrees per second
        
        if (Math.abs(normalizedDiff) > 0.01) {
            tank.turretRotation += Math.sign(normalizedDiff) * 
                Math.min(Math.abs(normalizedDiff), turretSpeed * deltaTime);
        }
        
        // Update gun elevation (limited to -10 to +20 degrees)
        const targetElevation = this.getMouseElevation();
        const elevationDiff = targetElevation - tank.gunElevation;
        const elevationSpeed = 3.0 * (Math.PI / 180);
        
        if (Math.abs(elevationDiff) > 0.01) {
            tank.gunElevation += Math.sign(elevationDiff) * 
                Math.min(Math.abs(elevationDiff), elevationSpeed * deltaTime);
        }
        
        // Limit gun elevation
        const maxElevation = 20 * (Math.PI / 180);
        const minElevation = -10 * (Math.PI / 180);
        tank.gunElevation = Math.max(minElevation, Math.min(maxElevation, tank.gunElevation));
    }
    
    getMouseAngle() {
        const worldX = this.mouse.x + this.camera.x;
        const worldY = this.mouse.y + this.camera.y;
        
        const dx = worldX - this.playerTank.position.x;
        const dy = worldY - this.playerTank.position.y;
        
        return Math.atan2(dy, dx);
    }
    
    getMouseElevation() {
        // Simple elevation based on vertical mouse position
        const screenCenter = this.canvas.height / 2;
        const mouseY = this.mouse.y;
        
        // Convert mouse position to elevation angle (-10 to +20 degrees)
        const maxElevation = 20;
        const minElevation = -10;
        const elevationRange = maxElevation - minElevation;
        
        const normalizedY = (mouseY - screenCenter) / screenCenter;
        const elevationDeg = minElevation + (normalizedY + 0.5) * elevationRange;
        
        return elevationDeg * (Math.PI / 180);
    }
    
    canMoveTo(x, y) {
        // Check boundaries
        if (x < 50 || x > this.terrain.width - 50 || 
            y < 50 || y > this.terrain.height - 50) {
            return false;
        }
        
        // Check obstacles
        for (const obstacle of this.terrain.obstacles) {
            const dx = x - obstacle.x;
            const dy = y - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < obstacle.size + 50) {
                return false;
            }
        }
        
        return true;
    }
    
    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const playerPos = this.playerTank.position;
            
            // Calculate distance to player
            const dx = playerPos.x - enemy.position.x;
            const dy = playerPos.y - enemy.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // AI behavior based on type and distance
            if (distance < 500) { // Player spotted
                enemy.spotted = true;
                enemy.lastKnownPosition = { ...playerPos };
                
                // Turn turret toward player
                const targetAngle = Math.atan2(dy, dx);
                const angleDiff = targetAngle - enemy.turretRotation;
                const normalizedDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
                
                if (Math.abs(normalizedDiff) > 0.01) {
                    enemy.turretRotation += Math.sign(normalizedDiff) * 
                        Math.min(Math.abs(normalizedDiff), 2 * (Math.PI / 180) * deltaTime);
                }
                
                // Shoot if aimed at player
                if (Math.abs(normalizedDiff) < 0.1 && distance > 100) {
                    enemy.lastShot += deltaTime;
                    if (enemy.lastShot > 7 + Math.random() * 3) {
                        this.enemyFire(enemy);
                        enemy.lastShot = 0;
                    }
                }
                
                // Movement based on AI type
                switch(enemy.type.ai) {
                    case 'aggressive':
                        // Charge toward player
                        if (distance > 100) {
                            const moveAngle = Math.atan2(dy, dx);
                            enemy.position.x += Math.cos(moveAngle) * 2;
                            enemy.position.y += Math.sin(moveAngle) * 2;
                        }
                        break;
                        
                    case 'flanker':
                        // Try to flank from side
                        const flankAngle = Math.atan2(dy, dx) + Math.PI / 2;
                        enemy.position.x += Math.cos(flankAngle) * 1.5;
                        enemy.position.y += Math.sin(flankAngle) * 1.5;
                        break;
                        
                    case 'defensive':
                        // Find cover and hold position
                        if (distance < 200) {
                            // Back away
                            const retreatAngle = Math.atan2(dy, dx) + Math.PI;
                            enemy.position.x += Math.cos(retreatAngle) * 1;
                            enemy.position.y += Math.sin(retreatAngle) * 1;
                        }
                        break;
                }
            } else {
                // Patrol behavior
                if (!enemy.targetPosition || 
                    Math.random() < 0.01 * deltaTime) {
                    enemy.targetPosition = {
                        x: enemy.position.x + (Math.random() - 0.5) * 200,
                        y: enemy.position.y + (Math.random() - 0.5) * 200
                    };
                }
                
                if (enemy.targetPosition) {
                    const tdx = enemy.targetPosition.x - enemy.position.x;
                    const tdy = enemy.targetPosition.y - enemy.position.y;
                    const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
                    
                    if (tdist > 10) {
                        const moveAngle = Math.atan2(tdy, tdx);
                        enemy.position.x += Math.cos(moveAngle) * 1;
                        enemy.position.y += Math.sin(moveAngle) * 1;
                    }
                }
            }
            
            // Check if enemy is dead
            if (enemy.health <= 0) {
                this.createExplosion(enemy.position.x, enemy.position.y, 2);
                this.enemies.splice(i, 1);
                this.silverLions += 1500;
                this.researchPoints += 500;
                this.updateEnemyCounter();
                this.updateHUD();
            }
        }
    }
    
    enemyFire(enemy) {
        if (enemy.shells <= 0) return;
        
        enemy.shells--;
        
        // Calculate firing solution
        const playerPos = this.playerTank.position;
        const dx = playerPos.x - enemy.position.x;
        const dy = playerPos.y - enemy.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Simple lead calculation for moving target
        const playerSpeed = this.playerTank.speed * (1000 / 3600);
        const timeToTarget = distance / 800; // Assuming 800 m/s shell velocity
        const leadDistance = playerSpeed * timeToTarget;
        
        const leadAngle = Math.atan2(dy, dx + leadDistance);
        
        this.projectiles.push({
            x: enemy.position.x,
            y: enemy.position.y,
            angle: leadAngle,
            elevation: 0,
            velocity: 800, // m/s
            caliber: enemy.type.gun.caliber,
            penetration: enemy.type.gun.penetration,
            damage: 100,
            owner: 'enemy',
            type: 'AP',
            distanceTraveled: 0,
            maxDistance: 2000
        });
        
        // Muzzle flash
        this.createMuzzleFlash(enemy.position.x, enemy.position.y, leadAngle);
    }
    
    fireGun() {
        const gun = this.playerTank.gun;
        
        if (gun.isReloading || gun.shells[gun.selectedShell].count <= 0) {
            return;
        }
        
        // Use shell
        gun.shells[gun.selectedShell].count--;
        
        // Calculate firing parameters
        const shell = gun.shells[gun.selectedShell];
        const muzzleVelocity = shell.velocity; // m/s
        
        this.projectiles.push({
            x: this.playerTank.position.x,
            y: this.playerTank.position.y,
            angle: this.playerTank.turretRotation,
            elevation: this.playerTank.gunElevation,
            velocity: muzzleVelocity,
            caliber: gun.caliber,
            penetration: shell.penetration,
            damage: shell.damage,
            owner: 'player',
            type: shell.type,
            distanceTraveled: 0,
            maxDistance: 1500
        });
        
        // Start reload
        gun.isReloading = true;
        gun.reloadProgress = 0;
        
        // Recoil effect
        this.playerTank.position.x -= Math.cos(this.playerTank.turretRotation) * 0.5;
        this.playerTank.position.y -= Math.sin(this.playerTank.turretRotation) * 0.5;
        
        // Muzzle flash
        this.createMuzzleFlash(
            this.playerTank.position.x, 
            this.playerTank.position.y, 
            this.playerTank.turretRotation
        );
        
        // Smoke
        this.createSmoke(
            this.playerTank.position.x + Math.cos(this.playerTank.turretRotation) * 50,
            this.playerTank.position.y + Math.sin(this.playerTank.turretRotation) * 50
        );
        
        this.updateHUD();
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Apply ballistic physics (simplified)
            const gravity = 9.81; // m/s²
            
            // Horizontal velocity
            const horizontalVel = proj.velocity * Math.cos(proj.elevation);
            
            // Update position
            proj.x += Math.cos(proj.angle) * horizontalVel * deltaTime;
            proj.y += Math.sin(proj.angle) * horizontalVel * deltaTime;
            
            // Apply gravity to vertical component
            proj.elevation -= (gravity / proj.velocity) * deltaTime;
            
            // Track distance
            proj.distanceTraveled += proj.velocity * deltaTime;
            
            // Check for collisions or max distance
            if (proj.distanceTraveled > proj.maxDistance) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Check collision with terrain
            if (proj.y > this.terrain.height - 100) {
                this.createExplosion(proj.x, proj.y, 0.5);
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Check collision with player (if enemy projectile)
            if (proj.owner === 'enemy') {
                const dx = proj.x - this.playerTank.position.x;
                const dy = proj.y - this.playerTank.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 50) {
                    this.takeDamage(proj);
                    this.createExplosion(proj.x, proj.y, 1);
                    this.projectiles.splice(i, 1);
                }
            }
            
            // Check collision with enemies (if player projectile)
            if (proj.owner === 'player') {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    const dx = proj.x - enemy.position.x;
                    const dy = proj.y - enemy.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 50) {
                        // Calculate damage based on angle and armor
                        const hitAngle = Math.atan2(dy, dx);
                        const relativeAngle = Math.abs(hitAngle - enemy.turretRotation);
                        
                        // Simple armor calculation
                        let effectiveArmor = enemy.type.armor.front;
                        if (relativeAngle > Math.PI / 4 && relativeAngle < 3 * Math.PI / 4) {
                            effectiveArmor = enemy.type.armor.side;
                        } else if (relativeAngle > 3 * Math.PI / 4) {
                            effectiveArmor = enemy.type.armor.rear;
                        }
                        
                        // Penetration check
                        if (proj.penetration >= effectiveArmor * 0.8) {
                            const damage = proj.damage * (proj.penetration / effectiveArmor);
                            enemy.health -= damage;
                            
                            // Show damage indicator
                            this.showDamageIndicator(enemy.position.x, enemy.position.y, Math.round(damage));
                        } else {
                            // Ricochet
                            this.showDamageIndicator(enemy.position.x, enemy.position.y, "RICOCHET");
                        }
                        
                        this.createExplosion(proj.x, proj.y, 1);
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }
    
    takeDamage(projectile) {
        const tank = this.playerTank;
        
        // Calculate hit location and angle
        const hitAngle = Math.atan2(
            projectile.y - tank.position.y,
            projectile.x - tank.position.x
        );
        const relativeAngle = Math.abs(hitAngle - tank.rotation);
        
        // Determine which armor to use
        let effectiveArmor = tank.armor.hull.front;
        let moduleHit = null;
        
        if (relativeAngle < Math.PI / 4 || relativeAngle > 7 * Math.PI / 4) {
            effectiveArmor = tank.armor.hull.front;
            moduleHit = Math.random() > 0.7 ? "transmission" : "engine";
        } else if (relativeAngle > Math.PI / 4 && relativeAngle < 3 * Math.PI / 4) {
            effectiveArmor = tank.armor.hull.side;
            moduleHit = Math.random() > 0.5 ? "fuelTank" : "ammoRack";
        } else {
            effectiveArmor = tank.armor.hull.rear;
            moduleHit = "engine";
        }
        
        // Penetration calculation
        const penetrationChance = projectile.penetration / effectiveArmor;
        
        if (Math.random() < penetrationChance) {
            // Penetration - take damage
            const damage = projectile.damage * (penetrationChance + 0.5);
            tank.health -= damage;
            
            // Module damage
            if (moduleHit && Math.random() < 0.3) {
                tank.modules[moduleHit].health -= damage * 0.5;
            }
            
            // Crew damage
            if (Math.random() < 0.2) {
                const crewIndex = Math.floor(Math.random() * tank.crew.length);
                tank.crew[crewIndex].health -= 30 + Math.random() * 40;
            }
            
            // Show damage indicator
            this.showDamageIndicator(tank.position.x, tank.position.y, Math.round(damage));
            
            // Check for critical damage
            if (tank.modules.ammoRack.health < 30 && Math.random() < 0.1) {
                this.createExplosion(tank.position.x, tank.position.y, 3);
                this.gameOver();
            }
        } else {
            // Non-penetration or ricochet
            this.showDamageIndicator(tank.position.x, tank.position.y, "RICOCHET");
        }
        
        this.updateHUD();
        
        // Check if tank is destroyed
        if (tank.health <= 0) {
            this.gameOver();
        }
    }
    
    updateParticles(deltaTime) {
        // Update smoke particles
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const particle = this.smokeParticles[i];
            particle.life -= deltaTime;
            particle.size += deltaTime * 10;
            
            if (particle.life <= 0) {
                this.smokeParticles.splice(i, 1);
            }
        }
        
        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.life -= deltaTime;
            
            if (explosion.life <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }
    
    createMuzzleFlash(x, y, angle) {
        this.explosions.push({
            x: x + Math.cos(angle) * 50,
            y: y + Math.sin(angle) * 50,
            size: 20,
            life: 0.1,
            maxLife: 0.1
        });
    }
    
    createSmoke(x, y) {
        for (let i = 0; i < 5; i++) {
            this.smokeParticles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                size: 10,
                life: 1 + Math.random() * 2,
                opacity: 0.8
            });
        }
    }
    
    createExplosion(x, y, size) {
        this.explosions.push({
            x, y,
            size: size * 30,
            life: 0.5,
            maxLife: 0.5
        });
        
        // Shockwave particles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * size * 50;
            
            this.smokeParticles.push({
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                size: 5 + Math.random() * 10,
                life: 0.5 + Math.random(),
                opacity: 0.6
            });
        }
    }
    
    updateCamera() {
        const tank = this.playerTank;
        
        // Smooth camera follow with prediction
        const targetX = tank.position.x - this.canvas.width / (2 * this.zoomLevel);
        const targetY = tank.position.y - this.canvas.height / (2 * this.zoomLevel);
        
        // Add prediction based on velocity
        const predictX = tank.velocity.x * 0.5;
        const predictY = tank.velocity.y * 0.5;
        
        this.camera.x += ((targetX + predictX) - this.camera.x) * 0.1;
        this.camera.y += ((targetY + predictY) - this.camera.y) * 0.1;
        
        // Clamp to map boundaries
        this.camera.x = Math.max(0, Math.min(
            this.terrain.width - this.canvas.width / this.zoomLevel, 
            this.camera.x
        ));
        this.camera.y = Math.max(0, Math.min(
            this.terrain.height - this.canvas.height / this.zoomLevel, 
            this.camera.y
        ));
    }
    
    consumeFuel(deltaTime) {
        const tank = this.playerTank;
        
        // Fuel consumption based on speed and engine load
        const baseConsumption = tank.fuelConsumption; // liters per minute at idle
        const loadFactor = Math.abs(tank.speed) / tank.maxSpeed;
        const consumption = baseConsumption * (1 + loadFactor * 2) * (deltaTime / 60);
        
        tank.currentFuel = Math.max(0, tank.currentFuel - consumption);
        
        if (tank.currentFuel <= 0) {
            tank.speed *= 0.95; // Gradually slow down
        }
        
        this.updateHUD();
    }
    
    reloadGun() {
        if (!this.playerTank.gun.isReloading) {
            this.playerTank.gun.isReloading = true;
            this.playerTank.gun.reloadProgress = 0;
        }
    }
    
    selectShell(index) {
        if (index >= 0 && index < this.playerTank.gun.shells.length) {
            this.playerTank.gun.selectedShell = index;
            this.updateHUD();
        }
    }
    
    showDamageIndicator(x, y, damage) {
        const indicator = document.getElementById('damageIndicator');
        const amount = document.getElementById('damageAmount');
        
        amount.textContent = damage;
        
        // Position near the hit
        indicator.style.left = (x - this.camera.x - 50) + 'px';
        indicator.style.top = (y - this.camera.y - 40) + 'px';
        indicator.style.display = 'flex';
        
        // Hide after delay
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 1000);
    }
    
    updateHUD() {
        const tank = this.playerTank;
        const gun = tank.gun;
        const shell = gun.shells[gun.selectedShell];
        
        // Update tank status
        document.getElementById('tankName').textContent = tank.name;
        document.getElementById('healthValue').textContent = Math.round(tank.health);
        document.getElementById('fuelValue').textContent = Math.round((tank.currentFuel / tank.fuelCapacity) * 100);
        document.getElementById('ammoValue').textContent = `${shell.count}/${shell.count + 10}`;
        
        // Update bars
        document.getElementById('healthBar').style.width = `${tank.health}%`;
        document.getElementById('fuelBar').style.width = `${(tank.currentFuel / tank.fuelCapacity) * 100}%`;
        document.getElementById('ammoBar').style.width = `${(shell.count / (shell.count + 10)) * 100}%`;
        
        // Update combat info
        document.getElementById('damageValue').textContent = `${gun.caliber}mm`;
        document.getElementById('penValue').textContent = `${shell.penetration}mm`;
        document.getElementById('reloadValue').textContent = gun.isReloading ? 
            `${(gun.reloadTime - gun.reloadProgress).toFixed(1)}s` : 
            `${gun.reloadTime.toFixed(1)}s`;
        document.getElementById('shellType').textContent = shell.type;
        
        // Update resources
        document.getElementById('silver').textContent = this.silverLions.toLocaleString();
        document.getElementById('rp').textContent = this.researchPoints.toLocaleString();
        
        // Update crew status
        const aliveCrew = tank.crew.filter(member => member.health > 0).length;
        document.getElementById('crewStatus').textContent = `Crew: ${aliveCrew}/5`;
    }
    
    updateEnemyCounter() {
        document.getElementById('enemies').textContent = this.enemies.length;
    }
    
    toggleResearchModal() {
        const modal = document.getElementById('researchModal');
        modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
        this.isPaused = modal.style.display === 'block';
        
        if (this.isPaused) {
            this.updateResearchUI();
        }
    }
    
    updateResearchUI() {
        // Update research nodes based on progress
        Object.keys(this.research).forEach(researchId => {
            const node = document.querySelector(`[data-id="${researchId}"]`);
            if (node) {
                if (this.research[researchId]) {
                    node.classList.add('unlocked');
                    node.classList.remove('locked');
                } else {
                    // Check prerequisites
                    const canResearch = this.canResearch(researchId);
                    node.classList.toggle('locked', !canResearch);
                }
            }
        });
    }
    
    canResearch(researchId) {
        const prerequisites = {
            'engine2': ['engine1'],
            'gun2': ['gun1'],
            'tank2': ['engine1', 'gun1', 'armor1'],
            'tank3': ['engine1', 'gun1']
        };
        
        const reqs = prerequisites[researchId] || [];
        return reqs.every(req => this.research[req]);
    }
    
    research(researchId) {
        const costs = {
            'engine1': 1000, 'engine2': 5000,
            'gun1': 2500, 'gun2': 7500,
            'armor1': 1500,
            'tank2': 15000, 'tank3': 12000
        };
        
        const cost = costs[researchId];
        
        if (this.researchPoints >= cost && !this.research[researchId] && this.canResearch(researchId)) {
            this.researchPoints -= cost;
            this.research[researchId] = true;
            
            // Apply research effects
            this.applyResearch(researchId);
            
            this.updateHUD();
            this.updateResearchUI();
            
            alert(`Research completed: ${researchId}`);
        } else {
            alert('Cannot research this yet!');
        }
    }
    
    applyResearch(researchId) {
        const tank = this.playerTank;
        
        switch(researchId) {
            case 'engine1':
                tank.enginePower *= 1.2;
                tank.maxSpeed *= 1.1;
                break;
                
            case 'gun1':
                tank.gun.caliber = 76;
                tank.gun.name = "76mm M1";
                tank.gun.reloadTime = 7.5;
                tank.gun.shells.forEach(shell => {
                    shell.penetration *= 1.15;
                    shell.damage *= 1.1;
                });
                break;
                
            case 'armor1':
                tank.modules.ammoRack.wetStorage = true;
                tank.modules.ammoRack.maxHealth *= 1.5;
                tank.modules.ammoRack.health = tank.modules.ammoRack.maxHealth;
                break;
                
            case 'tank2':
                this.unlockedTanks.push("M4A3E2 Jumbo");
                // Would switch tanks here
                break;
                
            case 'tank3':
                this.unlockedTanks.push("M18 Hellcat");
                break;
        }
    }
    
    gameOver() {
        this.gameActive = false;
        
        // Big explosion
        this.createExplosion(this.playerTank.position.x, this.playerTank.position.y, 5);
        
        // Show game over screen
        setTimeout(() => {
            alert(`TANK DESTROYED!\n\nSurvived: ${Math.round(this.gameTime)} seconds\nEnemies destroyed: ${3 - this.enemies.length}\nSilver Lions earned: ${this.silverLions}\nResearch Points: ${this.researchPoints}\n\nRefresh to play again.`);
        }, 1000);
    }
    
    render() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear with sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0a0a14');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Apply camera transform with zoom
        ctx.save();
        ctx.translate(-this.camera.x * this.zoomLevel, -this.camera.y * this.zoomLevel);
        ctx.scale(this.zoomLevel, this.zoomLevel);
        
        // Draw terrain
        this.drawTerrain();
        
        // Draw obstacles
        this.drawObstacles();
        
        // Draw enemies
        this.enemies.forEach(enemy => {
            this.drawEnemyTank(enemy);
        });
        
        // Draw player tank
        this.drawPlayerTank();
        
        // Draw projectiles
        this.projectiles.forEach(proj => {
            this.drawProjectile(proj);
        });
        
        // Draw particles
        this.drawParticles();
        
        ctx.restore();
        
        // Draw zoom overlay if zoomed
        if (this.isZooming) {
            this.drawZoomOverlay();
        }
        
        // Draw shell trajectory preview (when not zoomed)
        if (!this.isZooming) {
            this.drawTrajectoryPreview();
        }
    }
    
    drawTerrain() {
        const ctx = this.ctx;
        
        // Draw ground
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(0, this.terrain.height - 100, this.terrain.width, 100);
        
        // Draw grass pattern
        ctx.fillStyle = '#3a5c1e';
        for (let x = 0; x < this.terrain.width; x += 20) {
            for (let y = this.terrain.height - 100; y < this.terrain.height; y += 20) {
                if ((x + y) % 40 === 0) {
                    ctx.fillRect(x, y, 10, 10);
                }
            }
        }
    }
    
    drawObstacles() {
        const ctx = this.ctx;
        
        this.terrain.obstacles.forEach(obstacle => {
            if (obstacle.type === 'tree') {
                // Draw tree trunk
                ctx.fillStyle = '#5d4037';
                ctx.fillRect(obstacle.x - 5, obstacle.y - 20, 10, 40);
                
                // Draw foliage
                ctx.fillStyle = '#2e7d32';
                ctx.beginPath();
                ctx.arc(obstacle.x, obstacle.y - 30, obstacle.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Draw rock
                ctx.fillStyle = '#616161';
                ctx.beginPath();
                ctx.arc(obstacle.x, obstacle.y, obstacle.size / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Rock details
                ctx.fillStyle = '#424242';
                ctx.beginPath();
                ctx.arc(obstacle.x - 5, obstacle.y - 5, obstacle.size / 6, 0, Math.PI * 2);
                ctx.arc(obstacle.x + 5, obstacle.y + 3, obstacle.size / 8, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
    
    drawPlayerTank() {
        const tank = this.playerTank;
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(tank.position.x, tank.position.y);
        ctx.rotate(tank.rotation);
        
        // Draw tank hull (olive drab)
        ctx.fillStyle = '#556b2f';
        ctx.fillRect(-30, -20, 60, 40);
        
        // Hull details
        ctx.fillStyle = '#6b8e23';
        ctx.fillRect(-25, -15, 50, 30);
        
        // Draw tracks
        ctx.fillStyle = '#2f4f4f';
        ctx.fillRect(-35, -25, 70, 10); // Top track
        ctx.fillRect(-35, 15, 70, 10);  // Bottom track
        ctx.fillRect(-35, -25, 10, 50); // Front track
        ctx.fillRect(25, -25, 10, 50);  // Rear track
        
        // Draw turret (rotates separately)
        ctx.save();
        ctx.rotate(tank.turretRotation - tank.rotation);
        
        // Turret base
        ctx.fillStyle = '#556b2f';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Gun mantlet
        ctx.fillStyle = '#2f4f4f';
        ctx.fillRect(0, -8, 40, 16);
        
        // Gun barrel (with elevation)
        ctx.save();
        ctx.rotate(tank.gunElevation);
        ctx.fillStyle = '#1c1c1c';
        ctx.fillRect(40, -5, 40, 10);
        ctx.restore();
        
        ctx.restore(); // Turret rotation
        
        // Draw commander's cupola
        ctx.fillStyle = '#2f4f4f';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore(); // Tank position/rotation
        
        // Draw tank name
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(tank.name, tank.position.x, tank.position.y - 40);
        
        // Draw health bar above tank
        const barWidth = 60;
        const barHeight = 6;
        const healthPercent = tank.health / 100;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(tank.position.x - barWidth/2, tank.position.y - 50, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : 
                       healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(tank.position.x - barWidth/2, tank.position.y - 50, barWidth * healthPercent, barHeight);
    }
    
    drawEnemyTank(enemy) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(enemy.position.x, enemy.position.y);
        ctx.rotate(enemy.rotation);
        
        // Tank color based on nation
        let hullColor, detailColor;
        switch(enemy.type.nation) {
            case 'Germany': hullColor = '#7a7a7a'; detailColor = '#5a5a5a'; break;
            case 'USSR': hullColor = '#556b2f'; detailColor = '#6b8e23'; break;
            default: hullColor = '#8b4513'; detailColor = '#a0522d';
        }
        
        // Draw hull
        ctx.fillStyle = hullColor;
        ctx.fillRect(-25, -15, 50, 30);
        
        // Details
        ctx.fillStyle = detailColor;
        ctx.fillRect(-20, -10, 40, 20);
        
        // Draw turret
        ctx.save();
        ctx.rotate(enemy.turretRotation - enemy.rotation);
        
        ctx.fillStyle = hullColor;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = detailColor;
        ctx.fillRect(0, -5, 30, 10);
        
        ctx.restore();
        
        ctx.restore();
        
        // Draw enemy name and health
        ctx.fillStyle = enemy.spotted ? 'white' : 'rgba(255,255,255,0.5)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.type.name, enemy.position.x, enemy.position.y - 35);
        
        // Health bar
        const healthPercent = enemy.health / 100;
        const barWidth = 50;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.position.x - barWidth/2, enemy.position.y - 45, barWidth, 4);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#e74c3c' : 
                       healthPercent > 0.25 ? '#f39c12' : '#ff0000';
        ctx.fillRect(enemy.position.x - barWidth/2, enemy.position.y - 45, barWidth * healthPercent, 4);
    }
    
    drawProjectile(proj) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(proj.angle);
        
        // Draw shell
        ctx.fillStyle = proj.owner === 'player' ? '#f39c12' : '#e74c3c';
        ctx.fillRect(0, -2, 10, 4);
        
        // Shell tip
        ctx.beginPath();
        ctx.moveTo(10, -2);
        ctx.lineTo(15, 0);
        ctx.lineTo(10, 2);
        ctx.closePath();
        ctx.fill();
        
        // Tracer effect
        if (proj.distanceTraveled < 100) {
            ctx.strokeStyle = proj.owner === 'player' ? 
                'rgba(243, 156, 18, 0.3)' : 'rgba(231, 76, 60, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.lineTo(0, 0);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    drawParticles() {
        const ctx = this.ctx;
        
        // Draw smoke
        this.smokeParticles.forEach(particle => {
            ctx.globalAlpha = particle.opacity * (particle.life / 2);
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        // Draw explosions
        this.explosions.forEach(explosion => {
            const lifePercent = explosion.life / explosion.maxLife;
            const size = explosion.size * (1 - lifePercent);
            
            // Fire core
            ctx.fillStyle = `rgba(255, ${100 + 155 * lifePercent}, 0, ${lifePercent})`;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, size * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            // Shockwave
            ctx.strokeStyle = `rgba(255, 255, 200, ${lifePercent * 0.5})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, size, 0, Math.PI * 2);
            ctx.stroke();
        });
    }
    
    drawZoomOverlay() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Draw scope overlay
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        
        // Crosshair
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const crossSize = 20;
        
        ctx.beginPath();
        // Horizontal line
        ctx.moveTo(centerX - crossSize, centerY);
        ctx.lineTo(centerX + crossSize, centerY);
        // Vertical line
        ctx.moveTo(centerX, centerY - crossSize);
        ctx.lineTo(centerX, centerY + crossSize);
        ctx.stroke();
        
        // Outer circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        // Range markers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2);
            const markerLength = 10;
            
            ctx.beginPath();
            ctx.moveTo(
                centerX + Math.cos(angle) * 35,
                centerY + Math.sin(angle) * 35
            );
            ctx.lineTo(
                centerX + Math.cos(angle) * (35 + markerLength),
                centerY + Math.sin(angle) * (35 + markerLength)
            );
            ctx.stroke();
        }
        
        // Darken edges
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, centerY - 40);
        ctx.fillRect(0, centerY + 40, canvas.width, canvas.height - (centerY + 40));
        ctx.fillRect(0, centerY - 40, centerX - 40, 80);
        ctx.fillRect(centerX + 40, centerY - 40, canvas.width - (centerX + 40), 80);
    }
    
    drawTrajectoryPreview() {
        const tank = this.playerTank;
        const shell = tank.gun.shells[tank.gun.selectedShell];
        const ctx = this.ctx;
        
        if (tank.gun.isReloading) return;
        
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        // Calculate trajectory points
        const velocity = shell.velocity;
        const angle = tank.turretRotation;
        const elevation = tank.gunElevation;
        const gravity = 9.81;
        
        let x = tank.position.x + Math.cos(angle) * 50;
        let y = tank.position.y + Math.sin(angle) * 50;
        let vx = velocity * Math.cos(elevation) * Math.cos(angle);
        let vy = velocity * Math.cos(elevation) * Math.sin(angle);
        let vz = velocity * Math.sin(elevation);
        
        ctx.beginPath();
        ctx.moveTo(x - this.camera.x * this.zoomLevel, y - this.camera.y * this.zoomLevel);
        
        // Simulate trajectory for 2 seconds
        for (let t = 0; t < 2; t += 0.1) {
            x += vx * 0.1;
            y += vy * 0.1;
            vz -= gravity * 0.1;
            
            // Simple ground collision check
            if (y > this.terrain.height - 100) break;
            
            ctx.lineTo(x - this.camera.x * this.zoomLevel, y - this.camera.y * this.zoomLevel);
        }
        
        ctx.stroke();
        ctx.restore();
    }
}

// Initialize game
let game;

window.addEventListener('load', () => {
    game = new RealisticTankGame();
});

// Global functions for HTML buttons
function toggleResearch() { game.toggleResearchModal(); }
function showResearch() { game.toggleResearchModal(); }
function hideResearch() { game.toggleResearchModal(); }
function showGarage() { /* Implement garage */ }
function hideGarage() { /* Implement garage */ }
function togglePause() { game.isPaused = !game.isPaused; }
function buyResearch(id) { game.research(id); }
function selectTank(type) { /* Implement tank selection */ }
