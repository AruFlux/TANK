// js/systems/Crew.js
export class Crew {
    constructor(tank) {
        this.tank = tank;
        
        this.members = {
            commander: {
                name: 'Commander',
                active: true,
                health: 100,
                role: 'commander',
                skill: 0.8 + Math.random() * 0.4
            },
            gunner: {
                name: 'Gunner',
                active: true,
                health: 100,
                role: 'gunner',
                skill: 0.8 + Math.random() * 0.4
            },
            loader: {
                name: 'Loader',
                active: true,
                health: 100,
                role: 'loader',
                skill: 0.8 + Math.random() * 0.4
            },
            driver: {
                name: 'Driver',
                active: true,
                health: 100,
                role: 'driver',
                skill: 0.8 + Math.random() * 0.4
            }
        };
    }
    
    update(deltaTime) {
        // Check if any crew members are unconscious
        for (let [key, member] of Object.entries(this.members)) {
            if (member.health <= 0) {
                member.active = false;
            }
            
            // Gradual recovery if not completely dead
            if (!member.active && member.health > 0) {
                member.active = true;
            }
        }
    }
    
    injure(memberRole) {
        const member = this.members[memberRole];
        if (!member) return;
        
        // Random injury severity
        const damage = 30 + Math.random() * 50;
        member.health -= damage;
        
        if (member.health <= 0) {
            member.active = false;
            member.health = 0;
        }
        
        // Update UI
        this.updateCrewUI();
    }
    
    heal(memberRole) {
        const member = this.members[memberRole];
        if (member) {
            member.health = 100;
            member.active = true;
        }
        this.updateCrewUI();
    }
    
    updateCrewUI() {
        // Update crew status in HUD
        for (let [role, member] of Object.entries(this.members)) {
            const element = document.getElementById(`crew-${role}`);
            if (element) {
                const statusDot = element.querySelector('.crew-status');
                if (statusDot) {
                    statusDot.style.color = member.active ? '#00ff00' : '#ff0000';
                }
            }
        }
    }
    
    getEffect(role) {
        const member = this.members[role];
        if (!member || !member.active) return 0.3; // Severely reduced effectiveness
        
        return member.skill * (member.health / 100);
    }
}
