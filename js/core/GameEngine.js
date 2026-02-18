// js/core/GameEngine.js
import { PlayerTank } from '../entities/PlayerTank.js';
import { EnemyTank } from '../entities/EnemyTank.js';
import { MapSystem } from '../systems/MapSystem.js';
import { UIManager } from '../systems/UIManager.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { DamageSystem } from '../systems/DamageSystem.js';
import { AISystem } from '../systems/AISystem.js';
import { Config } from './Config.js';

export class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.lastTime = 0;
        this.deltaTime = 0;
        this.gameTime = 0;
        
        // Game state
        this.entities = [];
        this.projectiles = [];
        this.player = null;
        this.enemies = [];
        this.isRunning = false;
        
        // Systems
        this.mapSystem = new MapSystem(this);
        this.uiManager = new UIManager(this);
        this.particleSystem = new ParticleSystem(this);
        this.damageSystem = new DamageSystem(this);
        this.aiSystem = new AISystem(this);
        
        // Input handling
        this.keys = {};
        this.mouse = { x: 0, y: 0, pressed: false };
        
        this.init();
    }
    
    init() {
        // Set canvas size
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Initialize input listeners
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', () => this.mouse.pressed = true);
        this.canvas.addEventListener('mouseup', () => this.mouse.pressed = false);
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Create player tank
        this.player = new PlayerTank(this, 1000, 1000);
        this.entities.push(this.player);
        
        // Spawn enemy tanks
        this.spawnEnemies(Config.initialEnemies);
        
        // Start game loop
        this.isRunning = true;
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        this.mouse.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    }
    
    spawnEnemies(count) {
        for (let i = 0; i < count; i++) {
            const x = Config.mapSize * 0.2 + Math.random() * Config.mapSize * 0.6;
            const y = Config.mapSize * 0.2 + Math.random() * Config.mapSize * 0.6;
            const enemy = new EnemyTank(this, x, y, 't90');
            this.enemies.push(enemy);
            this.entities.push(enemy);
        }
    }
    
    gameLoop(currentTime) {
        if (!this.isRunning) return;
        
        // Calculate delta time (capped at 100ms to prevent huge jumps)
        this.deltaTime = Math.min(100, currentTime - this.lastTime) / 16.67;
        this.lastTime = currentTime;
        this.gameTime += this.deltaTime * 16.67;
        
        // Update game state
        this.update();
        
        // Render frame
        this.render();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    update() {
        // Update systems
        this.mapSystem.update(this.deltaTime);
        this.aiSystem.update(this.deltaTime);
        this.particleSystem.update(this.deltaTime);
        
        // Update all entities
        this.entities.forEach(entity => {
            if (entity.active) {
                entity.update(this.deltaTime);
            }
        });
        
        // Update projectiles
        this.projectiles = this.projectiles.filter(p => {
            p.update(this.deltaTime);
            return p.active;
        });
        
        // Update UI
        this.uiManager.update();
        
        // Check collisions
        this.checkCollisions();
    }
    
    render() {
        // Clear canvas with dark background
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate viewport offset (centered on player)
        const offsetX = this.player.x - this.canvas.width / 2;
        const offsetY = this.player.y - this.canvas.height / 2;
        
        // Save context state
        this.ctx.save();
        this.ctx.translate(-offsetX, -offsetY);
        
        // Render map
        this.mapSystem.render(this.ctx);
        
        // Render track marks (from particle system)
        this.particleSystem.renderTracks(this.ctx);
        
        // Render all entities (sort by y for pseudo-depth)
        const sortedEntities = [...this.entities].sort((a, b) => a.y - b.y);
        sortedEntities.forEach(entity => {
            if (entity.active) {
                entity.render(this.ctx);
            }
        });
        
        // Render projectiles
        this.projectiles.forEach(p => p.render(this.ctx));
        
        // Render particles (smoke, fire, etc.)
        this.particleSystem.render(this.ctx);
        
        // Restore context
        this.ctx.restore();
        
        // Render UI (on top, not affected by camera)
        this.uiManager.render(this.ctx);
    }
    
    checkCollisions() {
        // Projectile vs Tank collisions
        this.projectiles.forEach(proj => {
            this.entities.forEach(entity => {
                if (entity.type === 'tank' && entity.team !== proj.team && entity.active) {
                    if (this.damageSystem.checkHit(proj, entity)) {
                        proj.active = false;
                    }
                }
            });
        });
    }
    
    addProjectile(proj) {
        this.projectiles.push(proj);
    }
}
