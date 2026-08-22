import Phaser from "phaser";
import { Client, Room, Callbacks } from "@colyseus/sdk";

// custom scene class
export class GameScene extends Phaser.Scene {
  // local input cache

  preload() {
    // preload scene
    this.load.image('c1', 'assets/c1.png');
    this.load.image('c2', 'assets/c2.png');
    this.load.image('c3', 'assets/c3.png');
    this.load.image('c4', 'assets/c4.png');
    this.load.image('c5', 'assets/c5.png');
    this.load.image('back', 'assets/b.png');
  }

  update(time: number, delta: number): void {

    if (!this.room) { return; }

  }

  flipFront(card) {
    this.tweens.add(
      {
        targets: card,
        scaleX: 0,
        duration: 150,
        yoyo: true,
        onYoyo: () => {
          card.setTexture(card.data.values.image);
        }
      }
    )
  }

  flipBack(card) {
    if (card.texture.key !== 'back') {
      this.tweens.add(
        {
          targets: card,
          scaleX: 0,
          duration: 150,
          yoyo: true,
          onYoyo: () => {
            card.setTexture('back');
          }
        }
      )
    }
  }

  updateHandLayout() {
    const cardsInHand = this.hand.filter(card => card.depth === 0);

    Phaser.Actions.GridAlign(cardsInHand, {
      width: 5,          // Maximum number of cards in a row
      height: 1,         // Single row layout
      cellWidth: 130,    // Horizontal spacing between card centers
      cellHeight: 180,   // Vertical cell allocation
      x: 50,            // Starting X position of the first card
      y: 410             // Constant Y height for the hand row
    });
  }

  updateOpponentHandLayout() {
    // Filtramos solo las cartas del oponente que no han sido jugadas en la mesa
    const cardsInOpponentHand = this.opponentHand.filter(card => card.depth === 0);

    Phaser.Actions.GridAlign(cardsInOpponentHand, {
      width: 5,          // Máximo de cartas por fila
      height: 1,
      cellWidth: 130,    // Mismo espaciado horizontal
      cellHeight: 180,
      x: 50,             // Alineado perfectamente con tu zona
      y: 10              // Altura constante en la parte superior (eje Y)
    });
  }

  createOpponentHand(cardCount: number) {
    // Limpiar mano anterior si existiera
    this.opponentHand.forEach(card => card.destroy());
    this.opponentHand = [];

    for (let i = 1; i <= cardCount; i++) {
      // Las cartas del oponente nacen boca abajo y sin interactividad de arrastre
      const card = this.add.image(0, 0, 'back');

      // Le asignamos un estado inicial en su data manager
      card.setData({ location: 'opponentHand' });

      this.opponentHand.push(card);
    }

    // Las ordenamos en su cuadrícula superior
    this.updateOpponentHandLayout();
  }

  client = new Client("http://localhost:2567");
  room: Room;

  // we will assign each player visual representation here
  // by their `sessionId`
  playerEntities: { [sessionId: string]: any } = {};

  async create() {
    console.log("Joining room...");

    // --- 1. CENTERED PLAY ZONE ---
    const playZone = this.add
      .zone(270, 210, 260, 180) // Centered perfectly on 800x600 canvas
      .setOrigin(0, 0)
      .setRectangleDropZone(260, 180)
      .setName("play");

    this.input.enableDebug(playZone, 0xffff00);

    // --- 2. PLAYER HAND ZONE (Bottom) ---
    const handZone = this.add
      .zone(50, 410, 700, 180)
      .setOrigin(0, 0)
      .setRectangleDropZone(700, 180)
      .setName("hand");

    this.input.enableDebug(handZone, 0xffff00);

    // --- 3. OPPONENT HAND ZONE (Top) ---
    const opponentHandZone = this.add
      .zone(50, 10, 700, 180) // Symmetrical top alignment
      .setOrigin(0, 0)
      .setRectangleDropZone(700, 180)
      .setName("opponentHand"); // Unique name to filter drag events

    this.input.enableDebug(opponentHandZone, 0xff0000); // Red color for opponent tracking


    // this.deck = [];
    // const suits = ['picas', 'treboles', 'diamantes', 'corazones'];

    // for (const s of suits) {
    //   for (let r = 1; r <= 13; r++) {
    //     this.deck.push({ suit: s, rank: r });
    //   }
    // }

    // Phaser.Utils.Array.Shuffle(this.deck);

    // Debajo de tu declaración de client y room
    this.hand = []; // Tu mano actual
    this.opponentHand = []; // <-- NUEVO: Guarda las cartas visuales del oponente


    for (let i = 1; i <= 5; i++) {
      //const data = this.deck.pop();
      const data = { image: 'c' + i, location: 'hand' };
      const card = this.add.image(0, 0, 'back');
      card.setData(data);
      this.hand.push(card);
    }

    this.hand.forEach((card) => {
      card.setInteractive({ draggable: true });
      this.flipFront(card);
    });

    this.updateHandLayout();
    this.createOpponentHand(5);


    // Al pasar el mouse por encima de una carta de tu mano
    this.input.on('gameobjectover', (pointer, gameObject) => {
      // Solo aplicamos el efecto si la carta está actualmente en la mano del jugador
      if (gameObject.getData('location') === 'hand' && gameObject.depth === 0) {
        gameObject.setDepth(50);
        this.tweens.add({
          targets: gameObject,
          y: 390,          // La elevamos 20 píxeles (originalmente está en 410)
          scale: 1.3,     // La agrandamos un 5% para dar profundidad
          duration: 100,   // Animación rápida y responsiva
          ease: 'Power1'
        });
      }
    });

    // Al quitar el mouse de encima de la carta
    this.input.on('gameobjectout', (pointer, gameObject) => {
      // Solo restauramos si sigue en la mano y no la estamos arrastrando
      if (gameObject.getData('location') === 'hand' && gameObject.depth === 50) {
        gameObject.setDepth(0);
        this.tweens.add({
          targets: gameObject,
          y: 410 + (gameObject.height / 2),          // Regresa a su altura original de la cuadrícula
          scale: 1,        // Regresa a su tamaño original
          duration: 100,
          ease: 'Power1'
        });
      }
    });


    this.input.on('dragstart', (pointer, gameObject) => {
      // Bring the moving card to the very top layer
      gameObject.setDepth(100);
      gameObject.setScale(1); // <-- Añade esto para limpiar el efecto hover al arrastrar

      if (gameObject.getData('location') === 'play') {
        gameObject.setData('location', 'dragging');
      }

    });

    this.input.on('drag',
      (pointer, gameObject, dragX, dragY) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    )

    this.input.on('drop', (pointer, gameObject, dropZone) => {
      if (dropZone.name === 'play') {
        // ... your existing code for checking zone fullness and centering cards ...
        const isZoneFull = this.hand.some(card => card.getData('location') === dropZone.name);
        if (isZoneFull) {
          gameObject.setData('location', 'hand');
          //this.flipBack(gameObject);
          gameObject.setDepth(0);
          this.updateHandLayout();
          return;
        }
        gameObject.x = dropZone.x + (dropZone.width / 2);
        gameObject.y = dropZone.y + (dropZone.height / 2);
        //this.flipFront(gameObject);
        gameObject.setDepth(10);
        gameObject.setData('location', dropZone.name);
        this.updateHandLayout();
      }
      else if (dropZone.name === 'hand') {
        // Return to player's own hand layout
        //this.flipBack(gameObject);
        gameObject.setDepth(0);
        gameObject.setData('location', dropZone.name);

        const index = this.hand.indexOf(gameObject);
        if (index > -1) {
          this.hand.splice(index, 1);
          this.hand.push(gameObject);
        }
        this.updateHandLayout();
      }
      else if (dropZone.name === 'opponentHand') {
        // REJECT: Players cannot drop cards directly into the opponent's hand area
        gameObject.setData('location', 'hand');
        //this.flipBack(gameObject);
        gameObject.setDepth(0);
        this.updateHandLayout();
      }
    });



    this.input.on('dragend',
      (pointer, gameObject, dropped) => {
        if (!dropped) {
          gameObject.x = gameObject.input.dragStartX;
          gameObject.y = gameObject.input.dragStartY;
          //this.flipBack(gameObject);
          gameObject.setDepth(0);
          this.updateHandLayout();
        }
      }
    )

    try {
      this.room = await this.client.joinOrCreate("my_room");
      console.log("Joined successfully!");

      const callbacks = Callbacks.get(this.room);

      callbacks.onAdd("players", (player, sessionId) => {
        //
        // A player has joined!
        //
        console.log("A player has joined! Their unique session id is", sessionId);

        callbacks.onChange(player, () => {
          // update local position immediately
        });


      });

      callbacks.onRemove("players", (player, sessionId) => {

      });


    } catch (e) {
      console.error(e);
    }
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
