// js/systems/MapSystem.js
export class MapSystem {
    constructor(game) {
        this.game = game;
        this.mapSize = 3000; // Same as Config.mapSize
        
        // Map objects
        this.obstacles = [];
        this.buildings = [];
        this.trees = [];
        this.walls = [];
        this.capturableZones = [];
        
        // Collision grid for optimization
        this.cellSize = 100;
        this.collisionGrid = {};
        
        // Generate map
        this.generateMap();
    }
    
    generateMap() {
        // Generate buildings
        for (let i = 0; i < 15; i++) {
            this.buildings.push({
                x: 500 + Math.random() * (this.mapSize - 1000),
                y: 500 + Math.random() * (this.mapSize - 1000),
                width: 80 + Math.random() * 120,
                height: 60 + Math.random() * 100,
                destructible: true,
                health: 500,
                maxHealth: 500
            });
        }
        
        // Generate concrete walls (indestructible)
        for (let i = 0; i < 8; i++) {
            this.walls.push({
                x: 300 + Math.random() * (this.mapSize - 600),
                y: 300 + Math.random() * (this.mapSize - 600),
                width: 200 + Math.random() * 300,
                height: 20,
                destructible: false
            });
            
            // Vertical walls
            this.walls.push({
                x: 300 + Math.random() * (this.mapSize - 600),
                y: 300 + Math.random() * (this.mapSize - 600),
                width: 20,
                height: 200 + Math.random() * 300,
                destructible: false
            });
        }
        
        // Generate trees (cover)
        for (let i = 0; i < 50; i++) {
            this.trees.push({
                x: 200 + Math.random() * (this.mapSize - 400),
                y: 200 + Math.random() * (this.mapSize - 400),
                radius: 15 + Math.random() * 20,
                destructible: true,
                health: 100
            });
        }
        
        // Generate capturable zones (flags)
        this.capturableZones = [
            { x: 800, y: 800, team: null, progress: 0, radius: 100 },
            { x: 1500, y: 1500, team: null, progress: 0, radius: 100 },
            { x: 2200, y: 800, team: null, progress: 0, radius: 100 },
            { x: 800, y: 2200, team: null, progress: 0, radius: 100 }
        ];
        
        // Build collision grid
        this.buildCollisionGrid();
    }
    
    buildCollisionGrid() {
        this.collisionGrid = {};
        
        // Add all obstacles to grid
        const addToGrid = (obj, type) => {
            const minX = Math.floor((obj.x - obj.width/2) / this.cellSize);
            const maxX = Math.floor((obj.x + obj.width/2) / this.cellSize);
            const minY = Math.floor((obj.y - obj.height/2) / this.cellSize);
            const maxY = Math.floor((obj.y + obj.height/2) / this.cellSize);
            
            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    const key = `${x},${y}`;
                    if (!this.collisionGrid[key]) this.collisionGrid[key] = [];
                    this.collisionGrid[key].push({ ...obj, type });
                }
            }
        };
        
        this.buildings.forEach(b => addToGrid(b, 'building'));
        this.walls.forEach(w => addToGrid(w, 'wall'));
    }
    
    update(deltaTime) {
        // Update capturable zones
        this.updateCaptureZones(deltaTime);
    }
    
    updateCaptureZones(deltaTime) {
        const player = this.game.player;
        if (!player || !player.active) return;
        
        this.capturableZones.forEach(zone => {
            // Check if player is in zone
            const dx = player.x - zone.x;
            const dy = player.y - zone.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance < zone.radius) {
                // Player is capturing
                zone.progress += deltaTime / 60 * 10; // 10% per second
                
                if (zone.progress >= 100) {
                    zone.team = 'blue';
                    zone.progress = 100;
                    this.game.uiManager.showMessage("FLAG CAPTURED!", "success");
                }
            } else {
                // Progress decays if not being captured
                zone.progress = Math.max(0, zone.progress - deltaTime / 60 * 5);
            }
            
            // Update UI
            this.game.uiManager.updateCaptureProgress(zone.progress);
        });
    }
    
    checkCollision(x, y, radius) {
        // Get grid cells to check
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        const keys = [
            `${cellX},${cellY}`,
            `${cellX+1},${cellY}`,
            `${cellX-1},${cellY}`,
            `${cellX},${cellY+1}`,
            `${cellX},${cellY-1}`
        ];
        
        // Check obstacles in nearby cells
        for (let key of keys) {
            const cellObstacles = this.collisionGrid[key];
            if (cellObstacles) {
                for (let obs of cellObstacles) {
                    if (this.checkObstacleCollision(x, y, radius, obs)) {
                        return obs;
                    }
                }
            }
        }
        
        return null;
    }
    
    checkObstacleCollision(x, y, radius, obstacle) {
        if (obstacle.type === 'building' || obstacle.type === 'wall') {
            // Rectangle collision
            const halfW = obstacle.width / 2;
            const halfH = obstacle.height / 2;
            
            const closestX = Math.max(obstacle.x - halfW, Math.min(x, obstacle.x + halfW));
            const closestY = Math.max(obstacle.y - halfH, Math.min(y, obstacle.y + halfH));
            
            const dx = x - closestX;
            const dy = y - closestY;
            const distance = Math.hypot(dx, dy);
            
            return distance < radius;
        }
        
        return false;
    }
    
    checkLineOfSight(x1, y1, x2, y2) {
        // Bresenham's line algorithm for LOS
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        while (Math.abs(x - x2) > 5 || Math.abs(y - y2) > 5) {
            // Check collision at this point
            const obstacle = this.checkCollision(x, y, 5);
            if (obstacle && obstacle.destructible === false) {
                return false; // Blocked by indestructible obstacle
            }
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        
        return true;
    }
    
    damageObstacle(x, y, damage) {
        const obstacle = this.checkCollision(x, y, 10);
        if (obstacle && obstacle.destructible) {
            obstacle.health -= damage;
            
            if (obstacle.health <= 0) {
                this.removeObstacle(obstacle);
                return true; // Obstacle destroyed
            }
        }
        return false;
    }
    
    removeObstacle(obstacle) {
        // Remove from arrays
        if (obstacle.type === 'building') {
            const index = this.buildings.indexOf(obstacle);
            if (index > -1) this.buildings.splice(index, 1);
        } else if (obstacle.type === 'tree') {
            const index = this.trees.indexOf(obstacle);
            if (index > -1) this.trees.splice(index, 1);
        }
        
        // Rebuild collision grid
        this.buildCollisionGrid();
        
        // Add destruction effect
        this.game.particleSystem.addLargeExplosion(obstacle.x, obstacle.y);
    }
    
    render(ctx) {
        // Draw ground texture
        ctx.fillStyle = '#2a3a2a';
        ctx.fillRect(0, 0, this.mapSize, this.mapSize);
        
        // Draw grid lines
        ctx.strokeStyle = '#3a4a3a';
        ctx.lineWidth = 1;
        for (let i = 0; i <= this.mapSize; i += 200) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, this.mapSize);
            ctx.strokeStyle = '#3a4a3a';
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(this.mapSize, i);
            ctx.stroke();
        }
        
        // Draw capturable zones
        this.capturableZones.forEach(zone => {
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
            
            // Fill based on capture progress
            if (zone.team === 'blue') {
                ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
            } else if (zone.team === 'red') {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            }
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw capture progress
            if (zone.progress > 0) {
                ctx.beginPath();
                ctx.arc(zone.x, zone.y, zone.radius * (zone.progress / 100), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();
            }
        });
        
        // Draw buildings
        this.buildings.forEach(b => {
            ctx.fillStyle = b.destructible ? '#6a4a3a' : '#4a4a6a';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.fillRect(b.x - b.width/2, b.y - b.height/2, b.width, b.height);
            ctx.strokeRect(b.x - b.width/2, b.y - b.height/2, b.width, b.height);
            
            // Show building health if damaged
            if (b.health < b.maxHealth) {
                const healthPercent = b.health / b.maxHealth;
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(b.x - b.width/2, b.y - b.height/2 - 10, b.width * healthPercent, 5);
            }
        });
        
        // Draw walls
        this.walls.forEach(w => {
            ctx.fillStyle = w.destructible ? '#8a8a8a' : '#4a4a4a';
            ctx.fillRect(w.x - w.width/2, w.y - w.height/2, w.width, w.height);
        });
        
        // Draw trees
        this.trees.forEach(t => {
            ctx.fillStyle = '#2a6a2a';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#4a8a4a';
            ctx.beginPath();
            ctx.arc(t.x - 5, t.y - 5, t.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}
