// js/main.js
import { GameEngine } from './core/GameEngine.js';

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new GameEngine();
});
