// js/core/Config.js
export const Config = {
    mapSize: 3000,
    initialEnemies: 8,
    
    tanks: {
        player: {
            maxSpeed: 12,
            acceleration: 0.5,
            hullTraverse: 30, // degrees per second
            turretTraverse: 40,
            health: 1000,
            reloadTime: 6.5,
            armor: {
                front: 600,
                left: 200,
                right: 200,
                rear: 100
            }
        },
        t90: {
            maxSpeed: 10,
            acceleration: 0.4,
            hullTraverse: 35,
            turretTraverse: 45,
            health: 900,
            reloadTime: 7.0,
            armor: {
                front: 650,
                left: 180,
                right: 180,
                rear: 80
            }
        }
    }
};
