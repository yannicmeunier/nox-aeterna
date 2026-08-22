import Phaser from "phaser";
import { Client, Room, Callbacks } from "@colyseus/sdk";
import c1 from '../assets/c1.png';
import c2 from '../assets/c2.png';
import c3 from '../assets/c3.png';
import c4 from '../assets/c4.png';
import c5 from '../assets/c5.png';
import back from '../assets/b.png';

interface CardDef {
    id: string
    name: string
    type: 'ATK' | 'DEF' | 'SPE'
    cost: number
    description: string
    icon: string
}

interface CardInHand {
    def: CardDef
    container: Phaser.GameObjects.Container
    bgImage: Phaser.GameObjects.Image
    idx: number
}

const CARD_DEFS: Record<string, CardDef> = {
    strike: {
        id: 'strike', name: 'Strike', type: 'ATK', cost: 1,
        description: 'Deal 6 damage', icon: 'icon-strike'
    },
    heavy_blow: {
        id: 'heavy_blow', name: 'Heavy Blow', type: 'ATK', cost: 2,
        description: 'Deal 12 damage', icon: 'icon-heavy'
    },
    slash: {
        id: 'slash', name: 'Slash', type: 'ATK', cost: 1,
        description: 'Deal 4 dmg, draw 1', icon: 'icon-slash'
    },
    block: {
        id: 'block', name: 'Block', type: 'DEF', cost: 1,
        description: 'Gain 5 armor', icon: 'icon-block'
    },
    shieldwall: {
        id: 'shieldwall', name: 'Shield Wall', type: 'DEF', cost: 2,
        description: 'Gain 12 armor', icon: 'icon-shieldwall'
    },
    heal: {
        id: 'heal', name: 'Heal', type: 'SPE', cost: 2,
        description: 'Restore 8 HP', icon: 'icon-heal'
    },
    powerup: {
        id: 'powerup', name: 'Power Up', type: 'SPE', cost: 1,
        description: 'Next ATK x2 dmg', icon: 'icon-powerup'
    },
    fireball: {
        id: 'fireball', name: 'Fireball', type: 'SPE', cost: 3,
        description: 'Deal 20 damage', icon: 'icon-fireball'
    },
}

const STARTING_DECK: string[] = [
    'strike', 'strike', 'strike', 'strike',
    'heavy_blow', 'heavy_blow',
    'slash', 'slash', 'slash', 'slash',
    'block', 'block', 'block',
    'shieldwall', 'shieldwall',
    'heal', 'heal',
    'powerup', 'powerup',
    'fireball',
]

// const ENEMIES: EnemyDef[] = [
//     {
//         name: 'Slime', maxHp: 40, sprite: 'enemy-slime',
//         attacks: [
//             { name: 'Ooze Slap', damage: 4 },
//             { name: 'Acid Spit', damage: 6 },
//             { name: 'Wobble', damage: 2, armor: 3 },
//         ],
//     },
//     {
//         name: 'Skeleton', maxHp: 60, sprite: 'enemy-skeleton',
//         attacks: [
//             { name: 'Bone Strike', damage: 7 },
//             { name: 'Sword Slash', damage: 10 },
//             { name: 'Bone Shield', damage: 3, armor: 6 },
//             { name: 'Rally', damage: 5, armor: 4 },
//         ],
//     },
//     {
//         name: 'Dragon', maxHp: 100, sprite: 'enemy-dragon',
//         attacks: [
//             { name: 'Claw Swipe', damage: 8 },
//             { name: 'Fire Breath', damage: 14 },
//             { name: 'Tail Whip', damage: 6, hits: 2 },
//             { name: 'Wing Buffet', damage: 10, armor: 5 },
//             { name: 'Inferno', damage: 18 },
//         ],
//     },
// ]


// custom scene class
export class GameScene extends Phaser.Scene {
    // local input cache

    preload() {
        // preload scene
        this.load.image('c1', c1);
        this.load.image('c2', c2);
        this.load.image('c3', c3);
        this.load.image('c4', c4);
        this.load.image('c5', c5);
        this.load.image('back', back);
    }

    update(time: number, delta: number): void {
        // skip loop if not connected with room yet.
        if (!this.room) { return; }

    }

    async create() {
    }

    private shuffleDeck(): void {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]
        }
    }

    private drawCards(count: number): void {
        const toDraw = Math.min(count, 8 - this.hand.length)
        let drawn = 0

        const drawOne = () => {
            if (drawn >= toDraw) {
                this.repositionHand()
                this.updateAllUI()
                return
            }

            // Reshuffle if deck empty
            if (this.deck.length === 0) {
                if (this.discardPile.length === 0) return
                this.deck = [...this.discardPile]
                this.discardPile = []
                this.shuffleDeck()
            }

            const cardId = this.deck.pop()!
            const def = CARD_DEFS[cardId]
            const card = this.createCardVisual(def, this.hand.length)

            // Animate from deck position
            card.container.setPosition(40, this.cameras.main.height - 100)
            card.container.setScale(0.3).setAlpha(0)

            this.hand.push(card)
            drawn++

            const targetPos = this.getHandPosition(this.hand.length - 1, this.hand.length)
            this.tweens.add({
                targets: card.container,
                x: targetPos.x, y: targetPos.y,
                scaleX: 0.65, scaleY: 0.65,
                alpha: 1, angle: targetPos.angle,
                duration: 250, ease: 'Back.easeOut',
                onComplete: () => {
                    this.updateAllUI()
                    this.time.delayedCall(80, drawOne)
                },
            })
        }
        drawOne()
    }

    private startPlayerTurn(): void {
        this.energy = this.maxEnergy  // Reset to 3
        this.playerArmor = 0          // Armor is temporary
        this.isPlayerTurn = true
        this.isAnimating = false
        this.updateAllUI()
        this.drawCards(5 - this.hand.length)  // Draw up to 5
    }

    private endPlayerTurn(): void {
        this.isPlayerTurn = false
        this.isAnimating = true
        this.time.delayedCall(400, () => this.enemyTurn())
    }

    private playCard(cardInHand: CardInHand): void {
        if (!this.isPlayerTurn || this.isAnimating) return
        if (this.energy < cardInHand.def.cost) {
            // Shake card to indicate insufficient energy
            this.tweens.add({
                targets: cardInHand.container,
                x: cardInHand.container.x - 5,
                duration: 50, yoyo: true, repeat: 3,
            })
            return
        }

        this.isAnimating = true
        this.energy -= cardInHand.def.cost

        // Animate card to play area, then apply effect
        this.tweens.add({
            targets: cardInHand.container,
            x: this.cameras.main.width / 2,
            y: 320, scaleX: 0.9, scaleY: 0.9,
            duration: 300, ease: 'Quad.easeOut',
            onComplete: () => {
                this.applyCardEffect(cardInHand.def)
                // Fade out and clean up
                this.tweens.add({
                    targets: cardInHand.container,
                    alpha: 0, scaleX: 0.5, scaleY: 0.5,
                    duration: 200,
                    onComplete: () => {
                        cardInHand.container.destroy()
                        this.hand = this.hand.filter(c => c !== cardInHand)
                        this.discardPile.push(cardInHand.def.id)
                        this.repositionHand()
                        this.isAnimating = false
                    },
                })
            },
        })
    }

    private applyCardEffect(def: CardDef): void {
        switch (def.id) {
            case 'strike': {
                let dmg = 6
                if (this.powerUpActive) { dmg *= 2; this.powerUpActive = false }
                this.dealDamageToEnemy(dmg)
                break
            }
            case 'slash': {
                let dmg = 4
                if (this.powerUpActive) { dmg *= 2; this.powerUpActive = false }
                this.dealDamageToEnemy(dmg)
                this.time.delayedCall(200, () => {
                    if (this.hand.length < 8) this.drawCards(1)
                })
                break
            }
            case 'block': {
                this.playerArmor += 5
                this.showFloatingText(160, this.cameras.main.height - 200,
                    '+5 Armor', '#60a5fa')
                break
            }
            case 'powerup': {
                this.powerUpActive = true
                this.showFloatingText(400, 350, 'POWER UP!', '#fde68a')
                break
            }
            case 'fireball': {
                let dmg = 20
                if (this.powerUpActive) { dmg *= 2; this.powerUpActive = false }
                this.dealDamageToEnemy(dmg)
                this.cameras.main.shake(200, 0.01)
                break
            }
        }
    }

    private chooseEnemyAttack(): EnemyAttack {
        const attacks = this.enemyDef.attacks
        const hpRatio = this.enemyHp / this.enemyMaxHp
        const playerHpRatio = this.playerHp / this.playerMaxHp

        // Low enemy HP: prefer armor attacks
        if (hpRatio < 0.35) {
            const armorAttacks = attacks.filter(a => a.armor)
            if (armorAttacks.length > 0 && Math.random() < 0.6) {
                return armorAttacks[Math.floor(Math.random() * armorAttacks.length)]
            }
        }

        // Low player HP: go for the kill
        if (playerHpRatio < 0.3) {
            const sorted = [...attacks].sort((a, b) => {
                const aDmg = a.damage * (a.hits || 1)
                const bDmg = b.damage * (b.hits || 1)
                return bDmg - aDmg
            })
            if (Math.random() < 0.7) return sorted[0]
        }

        // Default: random
        return attacks[Math.floor(Math.random() * attacks.length)]
    }

    private dealDamageToEnemy(rawDmg: number): void {
        let dmg = rawDmg

        // Enemy armor absorbs first
        if (this.enemyArmor > 0) {
            const absorbed = Math.min(this.enemyArmor, dmg)
            this.enemyArmor -= absorbed
            dmg -= absorbed
            if (absorbed > 0) {
                this.showFloatingText(w / 2 + 60, 180,
                    `Blocked ${absorbed}`, '#60a5fa')
            }
        }

        if (dmg > 0) {
            this.enemyHp = Math.max(0, this.enemyHp - dmg)
            this.showFloatingText(w / 2, 100, `-${dmg}`, '#fbbf24')
            // Hit flash and shake animations
        }
    }


    private startEncounter(idx: number): void {
        this.encounter = idx
        this.enemyDef = ENEMIES[idx]
        this.enemyHp = this.enemyDef.maxHp
        this.enemyMaxHp = this.enemyDef.maxHp
        this.enemyArmor = 0
        this.playerArmor = 0
        this.powerUpActive = false

        // Fresh deck for each encounter
        this.deck = [...STARTING_DECK]
        this.discardPile = []
        this.clearHand()
        this.shuffleDeck()

        this.updateAllUI()
        this.time.delayedCall(700, () => this.startPlayerTurn())
    }



    private createCardVisual(def: CardDef, idx: number): CardInHand {
        const container = this.add.container(0, 0).setDepth(20)

        // Background based on card type
        let bgKey: string
        switch (def.type) {
            case 'ATK': bgKey = 'card-attack'; break
            case 'DEF': bgKey = 'card-defense'; break
            case 'SPE': bgKey = 'card-special'; break
        }

        const bg = this.add.image(0, 0, bgKey)
        container.add(bg)

        // Energy cost circle (top-left)
        const costCircle = this.add.circle(-45, -65, 14, 0x4c1d95, 1)
            .setStrokeStyle(2, 0xa78bfa)
        container.add(costCircle)

        const costText = this.add.text(-45, -65, `${def.cost}`, {
            fontSize: '16px', color: '#e2e8f0', fontStyle: 'bold',
        }).setOrigin(0.5)
        container.add(costText)

        // Card name, icon, description...
        // (additional elements added to container)

        return { def, container, bgImage: bg, idx }
    }

}

// game config
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#898990',
    parent: 'game-container',
    physics: { default: "arcade" },
    pixelArt: true,
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },

};

// instantiate the game
const game = new Phaser.Game(config);
