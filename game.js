// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameTime = 0;
let isPaused = false;
let gameActive = true;

// Player stats
let researchPoints = 100;
let playerTank = {
    type: 'light',
    health: 100,
    maxHealth: 100,
    damage: 20,
    speed: 3.0,
    reloadTime: 0.5,
    lastShot: 0
};

// Research progress
let researchCompleted = {
    damage1: false,
    health1: false,
    speed1: false
};

// Tank garage
let unlockedTanks = ['light'];
let currentTank = 'light';

// Game objects
let player = null;
let enemies = [];
let projectiles = [];
let keys = {};
let mouse = { x: 0, y: 0, down: false };
let camera = { x: 0, y: 0 };

// Initialize
function init() {
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Setup player
    spawnPlayer();
    
    // Setup initial enemies
    for (let i = 0; i < 3; i++) {
        spawnEnemy();
    }
    
    // Setup input listeners
    setupInput();
    
    // Update UI
    updateUI();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function spawnPlayer() {
    player = {
        x: 500,
        y: 300,
        width: 40,
        height: 60,
        turretAngle: 0
    };
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
}

function spawnEnemy() {
    if (enemies.length >= 5) return;
    
    let x, y;
    const side = Math.floor(Math.random() * 4);
    
    switch(side) {
        case 0: x = Math.random() * 1000; y = -50; break;
        case 1: x = 1050; y = Math.random() * 600; break;
        case 2: x = Math.random() * 1000; y = 650; break;
        case 3: x = -50; y = Math.random() * 600; break;
    }
    
    enemies.push({
        x: x, y: y,
        width: 40, height: 60,
        health: 40, maxHealth: 40,
        damage: 10, speed: 1.0,
        turretAngle: 0,
        lastShot: 0, reloadTime: 2
    });
    
    updateEnemyCounter();
}

function setupInput() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        
        if (e.key === 't' || e.key === 'T') showResearch();
        if (e.key === 'g' || e.key === 'G') showGarage();
        if (e.key === 'p' || e.key === 'P') togglePause();
        if (e.key === 'Escape') { hideResearch(); hideGarage(); }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left + camera.x;
        mouse.y = e.clientY - rect.top + camera.y;
    });
    
    canvas.addEventListener('mousedown', () => mouse.down = true);
    canvas.addEventListener('mouseup', () => mouse.down = false);
}

function gameLoop(timestamp) {
    if (!gameTime) gameTime = timestamp;
    const deltaTime = (timestamp - gameTime) / 1000;
    gameTime = timestamp;
    
    if (!isPaused && gameActive) {
        update(deltaTime);
    }
    
    render();
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Update player
    updatePlayer(deltaTime);
    
    // Update enemies
    updateEnemies(deltaTime);
    
    // Update projectiles
    updateProjectiles(deltaTime);
    
    // Update camera
    updateCamera();
    
    // Auto-shoot if mouse down
    if (mouse.down) shoot();
}

function updatePlayer(deltaTime) {
    if (!player) return;
    
    let moveX = 0, moveY = 0;
    if (keys['w'] || keys['arrowup']) moveY -= 1;
    if (keys['s'] || keys['arrowdown']) moveY += 1;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;
    
    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071;
        moveY *= 0.7071;
    }
    
    // Apply movement
    player.x += moveX * playerTank.speed * 60 * deltaTime;
    player.y += moveY * playerTank.speed * 60 * deltaTime;
    
    // Keep in bounds
    player.x = Math.max(20, Math.min(980, player.x));
    player.y = Math.max(20, Math.min(580, player.y));
    
    // Update turret angle
    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;
    player.turretAngle = Math.atan2(dy, dx);
}

function updateEnemies(deltaTime) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move towards player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            enemy.x += (dx / distance) * enemy.speed * 60 * deltaTime;
            enemy.y += (dy / distance) * enemy.speed * 60 * deltaTime;
            enemy.turretAngle = Math.atan2(dy, dx);
        }
        
        // Enemy shooting
        enemy.lastShot += deltaTime;
        if (enemy.lastShot >= enemy.reloadTime && distance < 300) {
            enemyShoot(enemy);
            enemy.lastShot = 0;
        }
        
        // Remove dead enemies
        if (enemy.health <= 0) {
            enemies.splice(i, 1);
            researchPoints += 25;
            updateUI();
            updateEnemyCounter();
            // Spawn new enemy after delay
            setTimeout(spawnEnemy, 2000);
        }
    }
}

function updateProjectiles(deltaTime) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        
        // Move projectile
        proj.x += Math.cos(proj.angle) * proj.speed * 60 * deltaTime;
        proj.y += Math.sin(proj.angle) * proj.speed * 60 * deltaTime;
        
        // Check collisions
        if (proj.owner === 'player') {
            // Player projectile hits enemy
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const dx = proj.x - enemy.x;
                const dy = proj.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 30) {
                    enemy.health -= proj.damage;
                    projectiles.splice(i, 1);
                    break;
                }
            }
        } else {
            // Enemy projectile hits player
            const dx = proj.x - player.x;
            const dy = proj.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 30) {
                playerTank.health -= proj.damage;
                projectiles.splice(i, 1);
                updateUI();
                
                // Game over
                if (playerTank.health <= 0) {
                    gameOver();
                }
            }
        }
        
        // Remove off-screen projectiles
        if (proj.x < -100 || proj.x > 1100 || 
            proj.y < -100 || proj.y > 700) {
            projectiles.splice(i, 1);
        }
    }
}

function updateCamera() {
    if (!player) return;
    
    const targetX = player.x - canvas.width / 2;
    const targetY = player.y - canvas.height / 2;
    
    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;
}

function shoot() {
    if (!player || isPaused || !gameActive) return;
    
    if (gameTime / 1000 - playerTank.lastShot < playerTank.reloadTime) {
        return;
    }
    
    playerTank.lastShot = gameTime / 1000;
    
    projectiles.push({
        x: player.x + Math.cos(player.turretAngle) * 35,
        y: player.y + Math.sin(player.turretAngle) * 35,
        angle: player.turretAngle,
        speed: 12,
        damage: playerTank.damage,
        owner: 'player'
    });
}

function enemyShoot(enemy) {
    projectiles.push({
        x: enemy.x + Math.cos(enemy.turretAngle) * 35,
        y: enemy.y + Math.sin(enemy.turretAngle) * 35,
        angle: enemy.turretAngle,
        speed: 8,
        damage: enemy.damage,
        owner: 'enemy'
    });
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.2)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    const startX = Math.floor(camera.x / gridSize) * gridSize;
    const startY = Math.floor(camera.y / gridSize) * gridSize;
    
    for (let x = startX; x < camera.x + canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - camera.x, 0);
        ctx.lineTo(x - camera.x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = startY; y < camera.y + canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - camera.y);
        ctx.lineTo(canvas.width, y - camera.y);
        ctx.stroke();
    }
    
    // Apply camera
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Draw player
    if (player) {
        drawTank(player.x, player.y, player.turretAngle, '#3498db', playerTank.health, playerTank.maxHealth);
    }
    
    // Draw enemies
    enemies.forEach(enemy => {
        drawTank(enemy.x, enemy.y, enemy.turretAngle, '#e74c3c', enemy.health, enemy.maxHealth);
    });
    
    // Draw projectiles
    projectiles.forEach(proj => {
        ctx.fillStyle = proj.owner === 'player' ? '#2ecc71' : '#e74c3c';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.owner === 'player' ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.restore();
}

function drawTank(x, y, angle, color, health, maxHealth) {
    ctx.save();
    ctx.translate(x, y);
    
    // Tank body
    ctx.fillStyle = color;
    ctx.fillRect(-20, -30, 40, 60);
    
    // Tank outline
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.strokeRect(-20, -30, 40, 60);
    
    // Turret
    ctx.rotate(angle);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, -8, 30, 16);
    
    ctx.restore();
    
    // Health bar
    if (health < maxHealth) {
        const barWidth = 40;
        const healthPercent = health / maxHealth;
        
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x - barWidth/2 - camera.x, y - 45 - camera.y, barWidth, 5);
        
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(x - barWidth/2 - camera.x, y - 45 - camera.y, barWidth * healthPercent, 5);
    }
}

function updateUI() {
    document.getElementById('health').textContent = Math.max(0, playerTank.health);
    document.getElementById('damage').textContent = playerTank.damage.toFixed(1);
    document.getElementById('speed').textContent = playerTank.speed.toFixed(1);
    document.getElementById('points').textContent = researchPoints;
}

function updateEnemyCounter() {
    document.getElementById('enemyCount').textContent = enemies.length;
}

// UI Functions
function showResearch() {
    document.getElementById('researchModal').style.display = 'block';
    isPaused = true;
}

function hideResearch() {
    document.getElementById('researchModal').style.display = 'none';
    isPaused = false;
}

function showGarage() {
    document.getElementById('garageModal').style.display = 'block';
    isPaused = true;
}

function hideGarage() {
    document.getElementById('garageModal').style.display = 'none';
    isPaused = false;
}

function togglePause() {
    isPaused = !isPaused;
    alert(isPaused ? 'Game Paused' : 'Game Resumed');
}

function buyResearch(researchId) {
    const costs = { damage1: 50, health1: 50, speed1: 50 };
    const cost = costs[researchId];
    
    if (researchPoints >= cost && !researchCompleted[researchId]) {
        researchPoints -= cost;
        researchCompleted[researchId] = true;
        
        // Apply effect
        switch(researchId) {
            case 'damage1': playerTank.damage *= 1.15; break;
            case 'health1': 
                playerTank.maxHealth *= 1.25;
                playerTank.health = playerTank.maxHealth;
                if (player) player.health = playerTank.health;
                break;
            case 'speed1': playerTank.speed *= 1.20; break;
        }
        
        updateUI();
        alert(`Research purchased: ${researchId}`);
    } else {
        alert('Not enough points or already purchased!');
    }
}

function selectTank(tankType) {
    if (!unlockedTanks.includes(tankType)) {
        alert('This tank is locked!');
        return;
    }
    
    currentTank = tankType;
    
    if (tankType === 'light') {
        playerTank = {
            type: 'light',
            health: 100,
            maxHealth: 100,
            damage: 20,
            speed: 3.0,
            reloadTime: 0.5,
            lastShot: playerTank.lastShot
        };
    } else if (tankType === 'heavy') {
        playerTank = {
            type: 'heavy',
            health: 200,
            maxHealth: 200,
            damage: 35,
            speed: 1.5,
            reloadTime: 0.8,
            lastShot: playerTank.lastShot
        };
    }
    
    if (player) player.health = playerTank.health;
    updateUI();
    alert(`${tankType} tank selected!`);
}

function gameOver() {
    gameActive = false;
    alert(`GAME OVER!\nEnemies killed: ${3 - enemies.length}\nResearch Points: ${researchPoints}\nRefresh to restart.`);
}

// Start game when page loads
window.addEventListener('load', init);
