// ============================================
// M1 ABRAMS ADVANCED TANK COMBAT
// ============================================

class M1AbramsGame {
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
        this.proximityZoomActive = false;
        
        // Player resources
        this.silverLions = 125000;
        this.researchPoints = 8500;
        
        // Player tank specifications (M1 Abrams)
        this.playerTank = {
            // Identification
            name: "M1 Abrams",
            nation: "USA",
            tier: 7,
            
            // Physical properties
            mass: 61500, // kg
            width: 3.66, // meters
            length: 9.77,
            height: 2.44,
            
            // Mobility
            enginePower: 1500, // hp (AGT1500 gas turbine)
            maxSpeed: 72, // km/h
            reverseSpeed: 42,
            turnRate: 45, // degrees per second
            fuelCapacity: 1907, // liters
            currentFuel: 1907,
            fuelConsumption: 3.8, // liters per minute at idle
            
            // Advanced Armor (mm) - Composite + DU layers
            armor: {
                hull: { front: 600, side: 200, rear: 100, top: 50 },
                turret: { front: 800, side: 300, rear: 150, top: 75 }
            },
            
            // Advanced Fire Control System
            fcs: {
                hasThermal: true,
                hasLaserRangefinder: true,
                hasStabilizer: true,
                reloadAssist: true
            },
            
            // Armament (120mm M256 smoothbore)
            gun: {
                caliber: 120, // mm
                name: "M256 L/44",
                reloadTime: 6.0, // seconds
                reloadProgress: 0,
                isReloading: false,
                
                // Modern shell types
                shells: [
                    { type: "APFSDS", damage: 420, penetration: 450, velocity: 1580, count: 42 },
                    { type: "HEAT", damage: 380, penetration: 400, velocity: 1140, count: 40 },
                    { type: "SMOKE", damage: 0, penetration: 0, velocity: 600, count: 10 }
                ],
                selectedShell: 0
            },
            
            // Crew (4 members)
            crew: [
                { role: "Commander", health: 100, skill: 75 },
                { role: "Gunner", health: 100, skill: 75 },
                { role: "Loader", health: 100, skill: 75 },
                { role: "Driver", health: 100, skill: 75 }
            ],
            
            // Advanced Modules
            modules: {
                engine: { health: 100, maxHealth: 100 },
                transmission: { health: 100, maxHealth: 100 },
                fuelTank: { health: 100, maxHealth: 100, hasBlowout: true },
                ammoRack: { health: 100, maxHealth: 100, blowoutPanels: true },
                tracks: { left: 100, right: 100 },
                optics: { health: 100, maxHealth: 100 },
                fcs: { health: 100, maxHealth: 100 }
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
            m1a1: false,
            m1a2: false,
            m1a2sep: false
        };
        
        // Combat
        this.enemies = [];
        this.allies = [];
        this.projectiles = [];
        this.smokeParticles = [];
        this.explosions = [];
        this.camera = { x: 0, y: 0 };
        
        // Game Objectives
        this.flags = [
            { id: 1, x: 500, y: 500, captured: false, capturing: false, captureProgress: 0 },
            { id: 2, x: 1500, y: 800, captured: false, capturing: false, captureProgress: 0 },
            { id: 3, x: 800, y: 1500, captured: false, capturing: false, captureProgress: 0 }
        ];
        this.flagsCaptured = 0;
        
        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        
        // Terrain (larger map for 2000m zoom-out)
        this.terrain = {
            width: 4000,
            height: 4000,
            elevation: [],
            obstacles: []
        };
        
        // Proximity detection
        this.proximityRange = 800; // meters
        this.enemiesInProximity = 0;
        
        // Initialize
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Setup player
        this.spawnPlayer();
        
        // Setup enemies and allies
        this.spawnEnemies();
        this.spawnAllies();
        
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
        // Spawn 12 enemy tanks (more enemies as requested)
        const enemyTypes = [
            {
                name: "T-72B",
                nation: "USSR",
                armor: { front: 500, side: 80, rear: 50 },
                gun: { caliber: 125, penetration: 420, reload: 8.5 },
                speed: 60,
                ai: "aggressive"
            },
            {
                name: "Leopard 2A4",
                nation: "Germany",
                armor: { front: 600, side: 100, rear: 70 },
                gun: { caliber: 120, penetration: 450, reload: 6.5 },
                speed: 68,
                ai: "defensive"
            },
            {
                name: "Challenger 1",
                nation: "UK",
                armor: { front: 700, side: 120, rear: 80 },
                gun: { caliber: 120, penetration: 430, reload: 7.0 },
                speed: 56,
                ai: "sniper"
            },
            {
                name: "T-80U",
                nation: "USSR",
                armor: { front: 550, side: 90, rear: 60 },
                gun: { caliber: 125, penetration: 440, reload: 7.8 },
                speed: 70,
                ai: "flanker"
            }
        ];
        
        for (let i = 0; i < 12; i++) {
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            this.enemies.push({
                id: i,
                type: type,
                position: {
                    x: 300 + (i % 6) * 600,
                    y: 300 + Math.floor(i / 6) * 500
                },
                rotation: Math.random() * Math.PI * 2,
                turretRotation: 0,
                health: 100,
                speed: 0,
                aiState: "patrol",
                targetPosition: null,
                lastShot: 0,
                shells: 40,
                spotted: false,
                lastKnownPosition: null,
                isDestroyed: false
            });
        }
        
        this.updateEnemyCounter();
    }
    
    spawnAllies() {
        // Spawn 3 allied tanks (as requested)
        const allyTypes = [
            {
                name: "M1 Abrams",
                nation: "USA",
                armor: { front: 600, side: 200, rear: 100 },
                gun: { caliber: 120, penetration: 450, reload: 6.0 },
                speed: 72,
                ai: "support"
            },
            {
                name: "M1A1 Abrams",
                nation: "USA",
                armor: { front: 650, side: 220, rear: 120 },
                gun: { caliber: 120, penetration: 460, reload: 6.0 },
                speed: 72,
                ai: "support"
            }
        ];
        
        for (let i = 0; i < 3; i++) {
            const type = allyTypes[Math.floor(Math.random() * allyTypes.length)];
            this.allies.push({
                id: i,
                type: type,
                position: {
                    x: this.playerTank.position.x + (i - 1) * 150,
                    y: this.playerTank.position.y + 200
                },
                rotation: Math.PI,
                turretRotation: Math.PI,
                health: 100,
                speed: 0,
                aiState: "follow",
                targetPosition: null,
                lastShot: 0,
                shells: 42,
                spotted: true
            });
        }
        
        this.updateAllyCounter();
    }
    
    generateTerrain() {
        // Create varied terrain for larger map
        for (let y = 0; y < this.terrain.height; y += 100) {
            for (let x = 0; x < this.terrain.width; x += 100) {
                const elevation = Math.sin(x * 0.005) * Math.cos(y * 0.005) * 80;
                this.terrain.elevation.push({ x, y, height: elevation });
            }
        }
        
        // Add more obstacles for larger map
        for (let i = 0; i < 100; i++) {
            this.terrain.obstacles.push({
                x: Math.random() * this.terrain.width,
                y: Math.random() * this.terrain.height,
                type: Math.random() > 0.6 ? "tree" : "rock",
                size: 25 + Math.random() * 40
            });
        }
        
        // Add buildings
        for (let i = 0; i < 20; i++) {
            this.terrain.obstacles.push({
                x: Math.random() * this.terrain.width,
                y: Math.random() * this.terrain.height,
                type: "building",
                size: 50 + Math.random() * 100
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
            if (e.key >= '1' && e.key <= '3') {
                this.selectShell(parseInt(e.key) - 1);
            }
            
            // Pause
            if (e.key === 'p' || e.key === 'P') {
                this.isPaused = !this.isPaused;
            }
            
            // Zoom disabled - only proximity zoom
            if (e.key === 'z' || e.key === 'Z') {
                // Zoom is disabled per request
                console.log("Zoom disabled - use proximity detection instead");
            }
            
            // Capture flag (when near flag)
            if (e.key === 'f' || e.key === 'F') {
                this.attemptFlagCapture();
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
            
            // Check for enemies in proximity for zoom effect
            this.checkProximity();
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.mouse.down = true;
                this.fireGun();
            }
            // Right click zoom disabled per request
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.down = false;
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
        
        // Update allies AI
        this.updateAllies(deltaTime);
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update camera with extended zoom-out
        this.updateCamera();
        
        // Consume fuel
        this.consumeFuel(deltaTime);
        
        // Update reload progress
        if (this.playerTank.gun.isReloading) {
            this.playerTank.gun.reloadProgress += deltaTime;
            this.updateReloadBar();
            
            if (this.playerTank.gun.reloadProgress >= this.playerTank.gun.reloadTime) {
                this.playerTank.gun.isReloading = false;
                this.playerTank.gun.reloadProgress = 0;
                this.updateReloadBar();
            }
        }
        
        // Update flag capture progress
        this.updateFlagCapture(deltaTime);
        
        // Check victory condition
        this.checkVictory();
        
        // Update minimap
        this.updateMinimap();
    }
    
    updateTank(deltaTime) {
        const tank = this.playerTank;
        
        // Calculate input forces
        let throttle = 0;
        let steering = 0;
        
        if (this.keys['w'] || this.keys['arrowup']) throttle = 1;
        if (this.keys['s'] || this.keys['arrowdown']) throttle = -0.7; // Reverse speed
        if (this.keys['a'] || this.keys['arrowleft']) steering = -1;
        if (this.keys['d'] || this.keys['arrowright']) steering = 1;
        if (this.keys[' ']) throttle = 0; // Brake
        
        // M1 Abrams has excellent acceleration
        const maxSpeed = throttle > 0 ? tank.maxSpeed : tank.reverseSpeed;
        const targetSpeed = throttle * maxSpeed;
        
        // Powerful gas turbine engine
        const acceleration = (tank.enginePower * 735.5) / tank.mass;
        const speedDiff = targetSpeed - tank.speed;
        
        if (Math.abs(speedDiff) > 0.1) {
            tank.speed += Math.sign(speedDiff) * acceleration * deltaTime * 1.5;
            tank.speed = Math.max(-tank.reverseSpeed, Math.min(tank.maxSpeed, tank.speed));
        }
        
        // Convert km/h to m/s and apply to position
        const speedMs = tank.speed * (1000 / 3600);
        const moveDistance = speedMs * deltaTime;
        
        // Apply rotation (M1 has good turning)
        const turnRate = tank.turnRate * (Math.PI / 180);
        tank.rotation += steering * turnRate * deltaTime * (1 - Math.abs(speedMs) / 25);
        
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
        
        // Update turret rotation (M1 has fast turret traverse)
        const targetAngle = this.getMouseAngle();
        const angleDiff = targetAngle - tank.turretRotation;
        const normalizedDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
        const turretSpeed = 3.5 * (Math.PI / 180); // 3.5 degrees per second (fast)
        
        if (Math.abs(normalizedDiff) > 0.01) {
            tank.turretRotation += Math.sign(normalizedDiff) * 
                Math.min(Math.abs(normalizedDiff), turretSpeed * deltaTime);
        }
        
        // Update gun elevation (M1 has -10 to +20 degrees)
        const targetElevation = this.getMouseElevation();
        const elevationDiff = targetElevation - tank.gunElevation;
        const elevationSpeed = 4.0 * (Math.PI / 180); // Fast elevation
        
        if (Math.abs(elevationDiff) > 0.01) {
            tank.gunElevation += Math.sign(elevationDiff) * 
                Math.min(Math.abs(elevationDiff), elevationSpeed * deltaTime);
        }
        
        // Limit gun elevation
        const maxElevation = 20 * (Math.PI / 180);
        const minElevation = -10 * (Math.PI / 180);
        tank.gunElevation = Math.max(minElevation, Math.min(maxElevation, tank.gunElevation));
    }
    
    checkProximity() {
        const tank = this.playerTank;
        let enemiesNearby = 0;
        
        // Check for enemies within proximity range (800m as requested)
        for (const enemy of this.enemies) {
            if (enemy.isDestroyed) continue;
            
            const dx = enemy.position.x - tank.position.x;
            const dy = enemy.position.y - tank.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.proximityRange) {
                enemiesNearby++;
                enemy.spotted = true;
                
                // Show proximity zoom overlay when enemies are nearby
                if (distance < 400) {
                    this.proximityZoomActive = true;
                    document.getElementById('proximityZoom').style.display = 'block';
                    
                    // Show proximity alert
                    document.getElementById('proximityAlert').style.display = 'block';
                    setTimeout(() => {
                        document.getElementById('proximityAlert').style.display = 'none';
                    }, 2000);
                }
            }
        }
        
        this.enemiesInProximity = enemiesNearby;
        
        if (enemiesNearby === 0) {
            this.proximityZoomActive = false;
            document.getElementById('proximityZoom').style.display = 'none';
        }
    }
    
    attemptFlagCapture() {
        const tank = this.playerTank;
        
        for (const flag of this.flags) {
            if (flag.captured) continue;
            
            const dx = flag.x - tank.position.x;
            const dy = flag.y - tank.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) { // Within capture range
                flag.capturing = true;
                break;
            }
        }
    }
    
    updateFlagCapture(deltaTime) {
        let capturingFlag = null;
        
        // Check if player is near any flag
        const tank = this.playerTank;
        for (const flag of this.flags) {
            if (flag.captured) continue;
            
            const dx = flag.x - tank.position.x;
            const dy = flag.y - tank.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
                if (!flag.capturing) {
                    flag.capturing = true;
                }
                capturingFlag = flag;
                
                // Check for enemies preventing capture
                let enemyPreventingCapture = false;
                for (const enemy of this.enemies) {
                    if (enemy.isDestroyed) continue;
                    
                    const edx = enemy.position.x - flag.x;
                    const edy = enemy.position.y - flag.y;
                    const edistance = Math.sqrt(edx * edx + edy * edy);
                    
                    if (edistance < 200) {
                        enemyPreventingCapture = true;
                        break;
                    }
                }
                
                if (!enemyPreventingCapture) {
                    flag.captureProgress += deltaTime / 10; // 10 seconds to capture
                    
                    if (flag.captureProgress >= 1) {
                        flag.captured = true;
                        flag.capturing = false;
                        this.flagsCaptured++;
                        this.silverLions += 5000;
                        this.researchPoints += 1000;
                        this.updateHUD();
                        
                        // Create capture effect
                        this.createFlagCaptureEffect(flag.x, flag.y);
                    }
                } else {
                    flag.captureProgress = Math.max(0, flag.captureProgress - deltaTime / 5);
                }
            } else {
                flag.capturing = false;
                flag.captureProgress = Math.max(0, flag.captureProgress - deltaTime / 2);
            }
        }
        
        // Update UI
        this.updateFlagUI(capturingFlag);
    }
    
    updateFlagUI(capturingFlag) {
        document.getElementById('flagCount').textContent = `${this.flagsCaptured}/3`;
        
        const captureBar = document.getElementById('captureBar');
        const captureTimer = document.getElementById('captureTimer');
        
        if (capturingFlag) {
            captureBar.style.width = `${capturingFlag.captureProgress * 100}%`;
            captureTimer.textContent = `${Math.round((1 - capturingFlag.captureProgress) * 10)}s`;
        } else {
            captureBar.style.width = '0%';
            captureTimer.textContent = '0s';
        }
    }
    
    checkVictory() {
        if (this.flagsCaptured >= 3) {
            this.victory();
        }
    }
    
    victory() {
        this.gameActive = false;
        
        // Big victory effect
        this.createVictoryEffect();
        
        setTimeout(() => {
            alert(`VICTORY!\n\nAll flags captured!\nTime: ${Math.round(this.gameTime)} seconds\nEnemies destroyed: ${12 - this.enemies.length}\nSilver Lions earned: ${this.silverLions}\nResearch Points: ${this.researchPoints}\n\nRefresh to play again.`);
        }, 1000);
    }
    
    getMouseAngle() {
        const worldX = this.mouse.x + this.camera.x;
        const worldY = this.mouse.y + this.camera.y;
        
        const dx = worldX - this.playerTank.position.x;
        const dy = worldY - this.playerTank.position.y;
        
        return Math.atan2(dy, dx);
    }
    
    getMouseElevation() {
        const screenCenter = this.canvas.height / 2;
        const mouseY = this.mouse.y;
        
        const maxElevation = 20;
        const minElevation = -10;
        const elevationRange = maxElevation - minElevation;
        
        const normalizedY = (mouseY - screenCenter) / screenCenter;
        const elevationDeg = minElevation + (normalizedY + 0.5) * elevationRange;
        
        return elevationDeg * (Math.PI / 180);
    }
    
    canMoveTo(x, y) {
        // Check boundaries (larger map)
        if (x < 50 || x > this.terrain.width - 50 || 
            y < 50 || y > this.terrain.height - 50) {
            return false;
        }
        
        // Check obstacles
        for (const obstacle of this.terrain.obstacles) {
            const dx = x - obstacle.x;
            const dy = y - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < obstacle.size + 60) {
                return false;
            }
        }
        
        return true;
    }
    
    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.isDestroyed) continue;
            
            const playerPos = this.playerTank.position;
            const dx = playerPos.x - enemy.position.x;
            const dy = playerPos.y - enemy.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Enemy AI behavior
            if (distance < 1000) { // Longer engagement range
                enemy.spotted = true;
                enemy.lastKnownPosition = { ...playerPos };
                
                // Turn turret toward player
                const targetAngle = Math.atan2(dy, dx);
                const angleDiff = targetAngle - enemy.turretRotation;
                const normalizedDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
                
                if (Math.abs(normalizedDiff) > 0.01) {
                    enemy.turretRotation += Math.sign(normalizedDiff) * 
                        Math.min(Math.abs(normalizedDiff), 2.5 * (Math.PI / 180) * deltaTime);
                }
                
                // Shoot if aimed at player
                if (Math.abs(normalizedDiff) < 0.08 && distance > 150) {
                    enemy.lastShot += deltaTime;
                    if (enemy.lastShot > enemy.type.gun.reload + Math.random() * 2) {
                        this.enemyFire(enemy);
                        enemy.lastShot = 0;
                    }
                }
                
                // Movement based on AI type
                switch(enemy.type.ai) {
                    case 'aggressive':
                        // Charge toward player
                        if (distance > 150) {
                            const moveAngle = Math.atan2(dy, dx);
                            enemy.position.x += Math.cos(moveAngle) * 2.5;
                            enemy.position.y += Math.sin(moveAngle) * 2.5;
                        }
                        break;
                        
                    case 'flanker':
                        // Try to flank from side
                        const flankAngle = Math.atan2(dy, dx) + Math.PI / 2;
                        enemy.position.x += Math.cos(flankAngle) * 2;
                        enemy.position.y += Math.sin(flankAngle) * 2;
                        break;
                        
                    case 'sniper':
                        // Find cover and snipe
                        if (distance < 300) {
                            const retreatAngle = Math.atan2(dy, dx) + Math.PI;
                            enemy.position.x += Math.cos(retreatAngle) * 1.5;
                            enemy.position.y += Math.sin(retreatAngle) * 1.5;
                        }
                        break;
                        
                    case 'defensive':
                        // Use cover effectively
                        if (distance < 250) {
                            const retreatAngle = Math.atan2(dy, dx) + Math.PI;
                            enemy.position.x += Math.cos(retreatAngle) * 1.2;
                            enemy.position.y += Math.sin(retreatAngle) * 1.2;
                        }
                        break;
                }
            } else {
                // Patrol behavior
                if (!enemy.targetPosition || Math.random() < 0.01 * deltaTime) {
                    enemy.targetPosition = {
                        x: enemy.position.x + (Math.random() - 0.5) * 300,
                        y: enemy.position.y + (Math.random() - 0.5) * 300
                    };
                }
                
                if (enemy.targetPosition) {
                    const tdx = enemy.targetPosition.x - enemy.position.x;
                    const tdy = enemy.targetPosition.y - enemy.position.y;
                    const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
                    
                    if (tdist > 15) {
                        const moveAngle = Math.atan2(tdy, tdx);
                        enemy.position.x += Math.cos(moveAngle) * 1.2;
                        enemy.position.y += Math.sin(moveAngle) * 1.2;
                    }
                }
            }
            
            // Check if enemy is dead
            if (enemy.health <= 0 && !enemy.isDestroyed) {
                enemy.isDestroyed = true;
                this.createExplosion(enemy.position.x, enemy.position.y, 2.5);
                this.silverLions += 3000;
                this.researchPoints += 750;
                this.updateEnemyCounter();
                this.updateHUD();
                
                // Remove after explosion
                setTimeout(() => {
                    const index = this.enemies.findIndex(e => e.id === enemy.id);
                    if (index !== -1) {
                        this.enemies.splice(index, 1);
                    }
                }, 1000);
            }
        }
    }
    
    updateAllies(deltaTime) {
        for (let i = this.allies.length - 1; i >= 0; i--) {
            const ally = this.allies[i];
            const playerPos = this.playerTank.position;
            
            // Follow player but maintain formation
            const formationOffset = {
                x: (i - 1) * 150,
                y: 200
            };
            
            const targetX = playerPos.x + formationOffset.x;
            const targetY = playerPos.y + formationOffset.y;
            
            const dx = targetX - ally.position.x;
            const dy = targetY - ally.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 50) {
                const moveAngle = Math.atan2(dy, dx);
                ally.position.x += Math.cos(moveAngle) * 2;
                ally.position.y += Math.sin(moveAngle) * 2;
                ally.rotation = moveAngle;
            }
            
            // Help fight enemies
            let closestEnemy = null;
            let closestDistance = Infinity;
            
            for (const enemy of this.enemies) {
                if (enemy.isDestroyed) continue;
                
                const edx = enemy.position.x - ally.position.x;
                const edy = enemy.position.y - ally.position.y;
                const edistance = Math.sqrt(edx * edx + edy * edy);
                
                if (edistance < 800 && edistance < closestDistance) {
                    closestDistance = edistance;
                    closestEnemy = enemy;
                }
            }
            
            if (closestEnemy) {
                // Aim at enemy
                const targetAngle = Math.atan2(
                    closestEnemy.position.y - ally.position.y,
                    closestEnemy.position.x - ally.position.x
                );
                const angleDiff = targetAngle - ally.turretRotation;
                const normalizedDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
                
                if (Math.abs(normalizedDiff) > 0.01) {
                    ally.turretRotation += Math.sign(normalizedDiff) * 
                        Math.min(Math.abs(normalizedDiff), 2 * (Math.PI / 180) * deltaTime);
                }
                
                // Shoot at enemy
                ally.lastShot += deltaTime;
                if (Math.abs(normalizedDiff) < 0.1 && ally.lastShot > 7 + Math.random() * 3) {
                    this.allyFire(ally, closestEnemy);
                    ally.lastShot = 0;
                }
            }
            
            // Check if ally is dead
            if (ally.health <= 0) {
                this.createExplosion(ally.position.x, ally.position.y, 2);
                this.allies.splice(i, 1);
                this.updateAllyCounter();
            }
        }
    }
    
    allyFire(ally, target) {
        if (ally.shells <= 0) return;
        
        ally.shells--;
        
        const dx = target.position.x - ally.position.x;
        const dy = target.position.y - ally.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Simple lead calculation
        const targetSpeed = target.speed * (1000 / 3600);
        const timeToTarget = distance / 1600;
        const leadDistance = targetSpeed * timeToTarget;
        const leadAngle = Math.atan2(dy, dx + leadDistance);
        
        this.projectiles.push({
            x: ally.position.x,
            y: ally.position.y,
            angle: leadAngle,
            elevation: 0,
            velocity: 1600, // m/s
            caliber: ally.type.gun.caliber,
            penetration: ally.type.gun.penetration,
            damage: 400,
            owner: 'ally',
            type: 'APFSDS',
            distanceTraveled: 0,
            maxDistance: 3000
        });
        
        this.createMuzzleFlash(ally.position.x, ally.position.y, leadAngle);
    }
    
    enemyFire(enemy) {
        if (enemy.shells <= 0) return;
        
        enemy.shells--;
        
        const playerPos = this.playerTank.position;
        const dx = playerPos.x - enemy.position.x;
        const dy = playerPos.y - enemy.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Lead calculation for moving target
        const playerSpeed = this.playerTank.speed * (1000 / 3600);
        const timeToTarget = distance / 1500;
        const leadDistance = playerSpeed * timeToTarget;
        const leadAngle = Math.atan2(dy, dx + leadDistance);
        
        this.projectiles.push({
            x: enemy.position.x,
            y: enemy.position.y,
            angle: leadAngle,
            elevation: 0,
            velocity: 1500, // m/s
            caliber: enemy.type.gun.caliber,
            penetration: enemy.type.gun.penetration,
            damage: 350,
            owner: 'enemy',
            type: 'APFSDS',
            distanceTraveled: 0,
            maxDistance: 2500
        });
        
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
        
        this.projectiles.push({
            x: this.playerTank.position.x,
            y: this.playerTank.position.y,
            angle: this.playerTank.turretRotation,
            elevation: this.playerTank.gunElevation,
            velocity: shell.velocity,
            caliber: gun.caliber,
            penetration: shell.penetration,
            damage: shell.damage,
            owner: 'player',
            type: shell.type,
            distanceTraveled: 0,
            maxDistance: 3000
        });
        
        // Start reload
        gun.isReloading = true;
        gun.reloadProgress = 0;
        
        // Recoil effect
        this.playerTank.position.x -= Math.cos(this.playerTank.turretRotation) * 0.8;
        this.playerTank.position.y -= Math.sin(this.playerTank.turretRotation) * 0.8;
        
        // Muzzle flash
        this.createMuzzleFlash(
            this.playerTank.position.x, 
            this.playerTank.position.y, 
            this.playerTank.turretRotation
        );
        
        // Smoke
        this.createSmoke(
            this.playerTank.position.x + Math.cos(this.playerTank.turretRotation) * 60,
            this.playerTank.position.y + Math.sin(this.playerTank.turretRotation) * 60
        );
        
        this.updateHUD();
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Apply ballistic physics
            const gravity = 9.81;
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
                this.createExplosion(proj.x, proj.y, 0.6);
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Check collision with player (if enemy projectile)
            if (proj.owner === 'enemy') {
                const dx = proj.x - this.playerTank.position.x;
                const dy = proj.y - this.playerTank.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 60) {
                    this.takeDamage(proj);
                    this.createExplosion(proj.x, proj.y, 1.2);
                    this.projectiles.splice(i, 1);
                }
            }
            
            // Check collision with enemies (if player/ally projectile)
            if (proj.owner === 'player' || proj.owner === 'ally') {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    if (enemy.isDestroyed) continue;
                    
                    const dx = proj.x - enemy.position.x;
                    const dy = proj.y - enemy.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 60) {
                        // Advanced damage calculation
                        const hitAngle = Math.atan2(dy, dx);
                        const relativeAngle = Math.abs(hitAngle - enemy.turretRotation);
                        
                        let effectiveArmor = enemy.type.armor.front;
                        if (relativeAngle > Math.PI / 4 && relativeAngle < 3 * Math.PI / 4) {
                            effectiveArmor = enemy.type.armor.side;
                        } else if (relativeAngle > 3 * Math.PI / 4) {
                            effectiveArmor = enemy.type.armor.rear;
                        }
                        
                        // Modern armor vs projectile calculation
                        const penetrationChance = proj.penetration / effectiveArmor;
                        
                        if (Math.random() < penetrationChance * 1.2) {
                            const damage = proj.damage * (proj.penetration / effectiveArmor);
                            enemy.health -= damage;
                            
                            this.showDamageIndicator(enemy.position.x, enemy.position.y, Math.round(damage));
                        } else {
                            this.showDamageIndicator(enemy.position.x, enemy.position.y, "NO PEN");
                        }
                        
                        this.createExplosion(proj.x, proj.y, 1.2);
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
            moduleHit = Math.random() > 0.8 ? "transmission" : "engine";
        } else if (relativeAngle > Math.PI / 4 && relativeAngle < 3 * Math.PI / 4) {
            effectiveArmor = tank.armor.hull.side;
            moduleHit = Math.random() > 0.6 ? "fuelTank" : "ammoRack";
        } else {
            effectiveArmor = tank.armor.hull.rear;
            moduleHit = "engine";
        }
        
        // Advanced penetration calculation for modern tanks
        const penetrationChance = projectile.penetration / effectiveArmor;
        
        if (Math.random() < penetrationChance) {
            // Penetration - take damage
            const damage = projectile.damage * (penetrationChance + 0.3);
            tank.health -= damage / 10; // M1 Abrams is tough!
            
            // Module damage
            if (moduleHit && Math.random() < 0.2) {
                tank.modules[moduleHit].health -= damage * 0.3;
            }
            
            // Crew damage (reduced by armor)
            if (Math.random() < 0.1) {
                const crewIndex = Math.floor(Math.random() * tank.crew.length);
                tank.crew[crewIndex].health -= 20 + Math.random() * 30;
            }
            
            this.showDamageIndicator(tank.position.x, tank.position.y, Math.round(damage / 10));
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
            particle.size += deltaTime * 12;
            
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
            x: x + Math.cos(angle) * 60,
            y: y + Math.sin(angle) * 60,
            size: 25,
            life: 0.08,
            maxLife: 0.08
        });
    }
    
    createSmoke(x, y) {
        for (let i = 0; i < 8; i++) {
            this.smokeParticles.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                size: 12,
                life: 1.5 + Math.random() * 3,
                opacity: 0.9
            });
        }
    }
    
    createExplosion(x, y, size) {
        this.explosions.push({
            x, y,
            size: size * 40,
            life: 0.6,
            maxLife: 0.6
        });
        
        // Shockwave particles
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * size * 70;
            
            this.smokeParticles.push({
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                size: 8 + Math.random() * 15,
                life: 0.8 + Math.random() * 1.2,
                opacity: 0.7
            });
        }
    }
    
    createFlagCaptureEffect(x, y) {
        // Create celebration effect for flag capture
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100;
            
            this.smokeParticles.push({
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                size: 5 + Math.random() * 10,
                life: 2 + Math.random() * 2,
                opacity: 0.8,
                color: Math.random() > 0.5 ? '#00ff00' : '#ffff00'
            });
        }
    }
    
    createVictoryEffect() {
        // Create victory celebration effects
        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 500;
            
            this.smokeParticles.push({
                x: this.playerTank.position.x + Math.cos(angle) * distance,
                y: this.playerTank.position.y + Math.sin(angle) * distance,
                size: 10 + Math.random() * 20,
                life: 3 + Math.random() * 3,
                opacity: 0.9,
                color: '#ffff00'
            });
        }
    }
    
    updateCamera() {
        const tank = this.playerTank;
        
        // Extended zoom-out (2000m view as requested)
        const baseZoom = 0.7; // Zoomed out further
        const zoom = this.proximityZoomActive ? 2.0 : baseZoom;
        
        const targetX = tank.position.x - this.canvas.width / (2 * zoom);
        const targetY = tank.position.y - this.canvas.height / (2 * zoom);
        
        // Add prediction based on velocity
        const predictX = tank.velocity.x * 0.5;
        const predictY = tank.velocity.y * 0.5;
        
        this.camera.x += ((targetX + predictX) - this.camera.x) * 0.08;
        this.camera.y += ((targetY + predictY) - this.camera.y) * 0.08;
        
        // Clamp to map boundaries
        this.camera.x = Math.max(0, Math.min(
            this.terrain.width - this.canvas.width / zoom, 
            this.camera.x
        ));
        this.camera.y = Math.max(0, Math.min(
            this.terrain.height - this.canvas.height / zoom, 
            this.camera.y
        ));
    }
    
    consumeFuel(deltaTime) {
        const tank = this.playerTank;
        
        // Gas turbine consumes more fuel
        const baseConsumption = tank.fuelConsumption;
        const loadFactor = Math.abs(tank.speed) / tank.maxSpeed;
        const consumption = baseConsumption * (1 + loadFactor * 2.5) * (deltaTime / 60);
        
        tank.currentFuel = Math.max(0, tank.currentFuel - consumption);
        
        if (tank.currentFuel <= 0) {
            tank.speed *= 0.9;
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
            
            // Update UI
            document.querySelectorAll('.shell-option').forEach((el, i) => {
                if (i === index) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });
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
        }, 1200);
    }
    
    updateHUD() {
        const tank = this.playerTank;
        const gun = tank.gun;
        const shell = gun.shells[gun.selectedShell];
        
        // Update resources
        document.getElementById('silverLions').textContent = this.silverLions.toLocaleString();
        document.getElementById('researchPoints').textContent = this.researchPoints.toLocaleString();
        document.getElementById('enemyCount').textContent = `${this.enemies.length}/12`;
        document.getElementById('allyCount').textContent = `${this.allies.length}/3`;
        
        // Update tank status
        document.getElementById('crewStatus').textContent = `${tank.crew.filter(m => m.health > 0).length}/4`;
        document.getElementById('healthValue').textContent = Math.round(tank.health) + '%';
        document.getElementById('fuelValue').textContent = Math.round((tank.currentFuel / tank.fuelCapacity) * 100) + '%';
        
        // Update bars
        document.getElementById('healthBar').style.width = `${tank.health}%`;
        document.getElementById('fuelBar').style.width = `${(tank.currentFuel / tank.fuelCapacity) * 100}%`;
        
        // Update ammo counts
        document.getElementById('apfsdsCount').textContent = gun.shells[0].count;
        document.getElementById('heatCount').textContent = gun.shells[1].count;
        document.getElementById('smokeCount').textContent = gun.shells[2].count;
        
        // Update reload timer
        if (gun.isReloading) {
            const timeLeft = gun.reloadTime - gun.reloadProgress;
            document.getElementById('reloadTime').textContent = timeLeft.toFixed(1) + 's';
        } else {
            document.getElementById('reloadTime').textContent = gun.reloadTime.toFixed(1) + 's';
        }
    }
    
    updateReloadBar() {
        const gun = this.playerTank.gun;
        const reloadBar = document.getElementById('reloadBar');
        
        if (gun.isReloading) {
            const progress = gun.reloadProgress / gun.reloadTime;
            reloadBar.style.width = `${progress * 100}%`;
        } else {
            reloadBar.style.width = '0%';
        }
    }
    
    updateEnemyCounter() {
        document.getElementById('enemyCount').textContent = `${this.enemies.length}/12`;
    }
    
    updateAllyCounter() {
        document.getElementById('allyCount').textContent = `${this.allies.length}/3`;
    }
    
    updateMinimap() {
        const minimap = document.getElementById('minimap');
        const playerDot = document.getElementById('playerDot');
        
        // Clear old dots
        const oldDots = minimap.querySelectorAll('.enemy-dot, .ally-dot, .flag-dot');
        oldDots.forEach(dot => dot.remove());
        
        // Calculate minimap scale
        const scale = 200 / Math.max(this.terrain.width, this.terrain.height);
        
        // Add enemy dots
        this.enemies.forEach(enemy => {
            if (enemy.isDestroyed) return;
            
            const dot = document.createElement('div');
            dot.className = 'enemy-dot';
            dot.style.left = `${enemy.position.x * scale}px`;
            dot.style.top = `${enemy.position.y * scale}px`;
            minimap.appendChild(dot);
        });
        
        // Add ally dots
        this.allies.forEach(ally => {
            const dot = document.createElement('div');
            dot.className = 'ally-dot';
            dot.style.left = `${ally.position.x * scale}px`;
            dot.style.top = `${ally.position.y * scale}px`;
            minimap.appendChild(dot);
        });
        
        // Add flag dots
        this.flags.forEach(flag => {
            const dot = document.createElement('div');
            dot.className = 'flag-dot';
            dot.style.left = `${flag.x * scale}px`;
            dot.style.top = `${flag.y * scale}px`;
            
            if (flag.captured) {
                dot.style.background = '#00ff00';
                dot.style.boxShadow = '0 0 8px #00ff00';
            } else if (flag.capturing) {
                dot.style.animation = 'pulse 1s infinite';
            }
            
            minimap.appendChild(dot);
        });
    }
    
    toggleResearchModal() {
        const modal = document.getElementById('researchModal');
        modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
        this.isPaused = modal.style.display === 'block';
    }
    
    gameOver() {
        this.gameActive = false;
        
        // Big explosion
        this.createExplosion(this.playerTank.position.x, this.playerTank.position.y, 6);
        
        // Show game over screen
        setTimeout(() => {
            alert(`M1 ABRAMS DESTROYED!\n\nSurvived: ${Math.round(this.gameTime)} seconds\nEnemies destroyed: ${12 - this.enemies.length}\nFlags captured: ${this.flagsCaptured}\nSilver Lions earned: ${this.silverLions}\nResearch Points: ${this.researchPoints}\n\nRefresh to play again.`);
        }, 1500);
    }
    
    render() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear with desert sky gradient (M1 Abrams theme)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(1, '#1a252f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Apply camera transform with zoom
        ctx.save();
        const zoom = this.proximityZoomActive ? 2.0 : 0.7;
        ctx.translate(-this.camera.x * zoom, -this.camera.y * zoom);
        ctx.scale(zoom, zoom);
        
        // Draw terrain (desert theme)
        this.drawTerrain();
        
        // Draw obstacles
        this.drawObstacles();
        
        // Draw flags
        this.drawFlags();
        
        // Draw enemies
        this.enemies.forEach(enemy => {
            if (!enemy.isDestroyed) {
                this.drawEnemyTank(enemy);
            }
        });
        
        // Draw allies
        this.allies.forEach(ally => {
            this.drawAllyTank(ally);
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
        
        // Draw proximity indicator if active
        if (this.proximityZoomActive) {
            this.drawProximityIndicator();
        }
    }
    
    drawTerrain() {
        const ctx = this.ctx;
        
        // Draw desert ground
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(0, this.terrain.height - 150, this.terrain.width, 150);
        
        // Draw desert pattern
        ctx.fillStyle = '#a0522d';
        for (let x = 0; x < this.terrain.width; x += 40) {
            for (let y = this.terrain.height - 150; y < this.terrain.height; y += 40) {
                if ((x + y) % 80 === 0) {
                    ctx.fillRect(x, y, 15, 15);
                }
            }
        }
    }
    
    drawObstacles() {
        const ctx = this.ctx;
        
        this.terrain.obstacles.forEach(obstacle => {
            if (obstacle.type === 'tree') {
                // Desert tree
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(obstacle.x - 8, obstacle.y - 25, 16, 50);
                
                ctx.fillStyle = '#556b2f';
                ctx.beginPath();
                ctx.arc(obstacle.x, obstacle.y - 40, obstacle.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (obstacle.type === 'building') {
                // Building
                ctx.fillStyle = '#696969';
                ctx.fillRect(obstacle.x - obstacle.size/2, obstacle.y - obstacle.size/2, obstacle.size, obstacle.size);
                
                // Windows
                ctx.fillStyle = '#1a1a1a';
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        ctx.fillRect(
                            obstacle.x - obstacle.size/2 + (i + 1) * obstacle.size/4 - 5,
                            obstacle.y - obstacle.size/2 + (j + 1) * obstacle.size/4 - 5,
                            8, 8
                        );
                    }
                }
            } else {
                // Rock
                ctx.fillStyle = '#708090';
                ctx.beginPath();
                ctx.arc(obstacle.x, obstacle.y, obstacle.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
    
    drawFlags() {
        const ctx = this.ctx;
        
        this.flags.forEach(flag => {
            // Flag pole
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(flag.x - 2, flag.y - 40, 4, 80);
            
            // Flag
            if (flag.captured) {
                ctx.fillStyle = '#00ff00';
            } else if (flag.capturing) {
                ctx.fillStyle = '#ffff00';
            } else {
                ctx.fillStyle = '#ff0000';
            }
            
            ctx.beginPath();
            ctx.moveTo(flag.x, flag.y - 40);
            ctx.lineTo(flag.x + 30, flag.y - 20);
            ctx.lineTo(flag.x, flag.y);
            ctx.closePath();
            ctx.fill();
            
            // Capture progress ring
            if (flag.capturing) {
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(flag.x, flag.y, 50, -Math.PI/2, -Math.PI/2 + 2 * Math.PI * flag.captureProgress);
                ctx.stroke();
            }
        });
    }
    
    drawPlayerTank() {
        const tank = this.playerTank;
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(tank.position.x, tank.position.y);
        ctx.rotate(tank.rotation);
        
        // M1 Abrams hull (desert tan)
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(-35, -25, 70, 50);
        
        // Hull details
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(-30, -20, 60, 40);
        
        // Sloped armor
        ctx.fillStyle = '#a0522d';
        ctx.beginPath();
        ctx.moveTo(-35, -25);
        ctx.lineTo(-20, -40);
        ctx.lineTo(20, -40);
        ctx.lineTo(35, -25);
        ctx.closePath();
        ctx.fill();
        
        // Tracks
        ctx.fillStyle = '#2f4f4f';
        ctx.fillRect(-40, -30, 80, 10); // Top track
        ctx.fillRect(-40, 20, 80, 10);  // Bottom track
        
        // Draw turret (rotates separately)
        ctx.save();
        ctx.rotate(tank.turretRotation - tank.rotation);
        
        // M1 Abrams distinctive turret
        ctx.fillStyle = '#b8860b';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Gun mantlet
        ctx.fillStyle = '#696969';
        ctx.fillRect(0, -10, 50, 20);
        
        // Gun barrel (with elevation)
        ctx.save();
        ctx.rotate(tank.gunElevation);
        ctx.fillStyle = '#1c1c1c';
        ctx.fillRect(50, -6, 60, 12);
        ctx.restore();
        
        // Commander's independent sight
        ctx.fillStyle = '#2f4f4f';
        ctx.beginPath();
        ctx.arc(0, -15, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore(); // Turret rotation
        
        ctx.restore(); // Tank position/rotation
        
        // Draw tank name
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('M1 ABRAMS', tank.position.x, tank.position.y - 60);
        
        // Draw health bar above tank
        const barWidth = 80;
        const barHeight = 8;
        const healthPercent = tank.health / 100;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(tank.position.x - barWidth/2, tank.position.y - 70, barWidth, barHeight);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : 
                       healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(tank.position.x - barWidth/2, tank.position.y - 70, barWidth * healthPercent, barHeight);
    }
    
    drawEnemyTank(enemy) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(enemy.position.x, enemy.position.y);
        ctx.rotate(enemy.rotation);
        
        // Tank color based on nation
        let hullColor, detailColor;
        switch(enemy.type.nation) {
            case 'USSR': hullColor = '#556b2f'; detailColor = '#6b8e23'; break;
            case 'Germany': hullColor = '#708090'; detailColor = '#5a6268'; break;
            case 'UK': hullColor = '#8b4513'; detailColor = '#a0522d'; break;
            default: hullColor = '#696969'; detailColor = '#808080';
        }
        
        // Draw hull
        ctx.fillStyle = hullColor;
        ctx.fillRect(-30, -18, 60, 36);
        
        // Details
        ctx.fillStyle = detailColor;
        ctx.fillRect(-25, -13, 50, 26);
        
        // Draw turret
        ctx.save();
        ctx.rotate(enemy.turretRotation - enemy.rotation);
        
        ctx.fillStyle = hullColor;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = detailColor;
        ctx.fillRect(0, -7, 35, 14);
        
        ctx.restore();
        
        ctx.restore();
        
        // Draw enemy name and health
        ctx.fillStyle = enemy.spotted ? 'white' : 'rgba(255,255,255,0.5)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.type.name, enemy.position.x, enemy.position.y - 45);
        
        // Health bar
        const healthPercent = enemy.health / 100;
        const barWidth = 60;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.position.x - barWidth/2, enemy.position.y - 55, barWidth, 5);
        
        ctx.fillStyle = healthPercent > 0.5 ? '#e74c3c' : 
                       healthPercent > 0.25 ? '#f39c12' : '#ff0000';
        ctx.fillRect(enemy.position.x - barWidth/2, enemy.position.y - 55, barWidth * healthPercent, 5);
    }
    
    drawAllyTank(ally) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(ally.position.x, ally.position.y);
        ctx.rotate(ally.rotation);
        
        // Ally tank (blue accents)
        ctx.fillStyle = '#4a6fa5';
        ctx.fillRect(-28, -16, 56, 32);
        
        ctx.fillStyle = '#6b8cbc';
        ctx.fillRect(-23, -11, 46, 22);
        
        // Draw turret
        ctx.save();
        ctx.rotate(ally.turretRotation - ally.rotation);
        
        ctx.fillStyle = '#4a6fa5';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#6b8cbc';
        ctx.fillRect(0, -6, 30, 12);
        
        ctx.restore();
        
        ctx.restore();
        
        // Draw ally marker
        ctx.fillStyle = '#00aaff';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ally.type.name, ally.position.x, ally.position.y - 40);
    }
    
    drawProjectile(proj) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(proj.angle);
        
        // Draw modern APFSDS dart
        if (proj.type === 'APFSDS') {
            ctx.fillStyle = proj.owner === 'player' ? '#f39c12' : 
                           proj.owner === 'ally' ? '#3498db' : '#e74c3c';
            ctx.fillRect(0, -1, 15, 2);
            
            // Dart tip
            ctx.beginPath();
            ctx.moveTo(15, -1);
            ctx.lineTo(20, 0);
            ctx.lineTo(15, 1);
            ctx.closePath();
            ctx.fill();
        } else {
            // HEAT or other shells
            ctx.fillStyle = proj.owner === 'player' ? '#f39c12' : '#e74c3c';
            ctx.fillRect(0, -2, 12, 4);
        }
        
        // Tracer effect
        if (proj.distanceTraveled < 150) {
            ctx.strokeStyle = proj.owner === 'player' ? 
                'rgba(243, 156, 18, 0.4)' : 
                proj.owner === 'ally' ? 'rgba(52, 152, 219, 0.4)' : 'rgba(231, 76, 60, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-25, 0);
            ctx.lineTo(0, 0);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    drawParticles() {
        const ctx = this.ctx;
        
        // Draw smoke
        this.smokeParticles.forEach(particle => {
            ctx.globalAlpha = particle.opacity * (particle.life / 3);
            ctx.fillStyle = particle.color || '#aaa';
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
            ctx.arc(explosion.x, explosion.y, size * 0.8, 0, Math.PI * 2);
            ctx.fill();
            
            // Shockwave
            ctx.strokeStyle = `rgba(255, 255, 200, ${lifePercent * 0.6})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, size, 0, Math.PI * 2);
            ctx.stroke();
        });
    }
    
    drawProximityIndicator() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw enhanced targeting reticle for proximity zoom
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        
        // Inner circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
        ctx.stroke();
        
        // Crosshair
        const crossSize = 15;
        ctx.beginPath();
        // Horizontal
        ctx.moveTo(centerX - crossSize, centerY);
        ctx.lineTo(centerX + crossSize, centerY);
        // Vertical
        ctx.moveTo(centerX, centerY - crossSize);
        ctx.lineTo(centerX, centerY + crossSize);
        ctx.stroke();
        
        // Range markers
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI / 4);
            const markerLength = 8;
            
            ctx.beginPath();
            ctx.moveTo(
                centerX + Math.cos(angle) * 25,
                centerY + Math.sin(angle) * 25
            );
            ctx.lineTo(
                centerX + Math.cos(angle) * (25 + markerLength),
                centerY + Math.sin(angle) * (25 + markerLength)
            );
            ctx.stroke();
        }
        
        // Proximity warning text
        ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ENEMY IN RANGE', centerX, centerY + 60);
        ctx.fillText(`${this.enemiesInProximity} TARGET(S)`, centerX, centerY + 80);
    }
}

// Initialize game
let m1AbramsGame;

window.addEventListener('load', () => {
    m1AbramsGame = new M1AbramsGame();
});

// Global functions for HTML buttons
function toggleResearch() { m1AbramsGame.toggleResearchModal(); }
function hideResearch() { 
    document.getElementById('researchModal').style.display = 'none';
    m1AbramsGame.isPaused = false;
}
function buyResearch(id) { /* Implement research purchase */ }
