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


  client = new Client("http://localhost:2567");
  room: Room;

  // we will assign each player visual representation here
  // by their `sessionId`
  playerEntities: { [sessionId: string]: any } = {};

  async create() {
    console.log("Joining room...");

    const playZone = this.add
      .zone(510, 110, 260, 180)
      .setOrigin(0, 0)
      .setRectangleDropZone(260, 180)
      .setName("play");

    this.input.enableDebug(playZone, 0xffff00);

    // this.add.graphics().lineStyle(2, 0xffff00).strokeRect(510, 110, 260, 180);


    const handZone = this.add
      .zone(50, 410, 700, 180)
      .setOrigin(0, 0)
      .setRectangleDropZone(700, 180)
      .setName("hand");

    this.input.enableDebug(handZone, 0xffff00);

    // this.add.graphics().lineStyle(2, 0xffff00).strokeRect(50, 410, 700, 180);



    // this.deck = [];
    // const suits = ['picas', 'treboles', 'diamantes', 'corazones'];

    // for (const s of suits) {
    //   for (let r = 1; r <= 13; r++) {
    //     this.deck.push({ suit: s, rank: r });
    //   }
    // }

    // Phaser.Utils.Array.Shuffle(this.deck);


    this.hand = [];
    for (let i = 1; i <= 5; i++) {
      //const data = this.deck.pop();
      const data = { image: 'c' + i, location: 'hand' };
      const card = this.add.image(0, 0, 'back');
      card.setData(data);
      this.hand.push(card);
    }

    this.hand.forEach((card) => {
      card.setInteractive({ draggable: true });
    });

    this.updateHandLayout();


    this.input.on('dragstart', (pointer, gameObject) => {
      // Bring the moving card to the very top layer
      gameObject.setDepth(100);
    });

    this.input.on('drag',
      (pointer, gameObject, dragX, dragY) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    )

    this.input.on('drop', (pointer, gameObject, dropZone) => {

      if (dropZone.name === 'play') {
        const isZoneFull = this.hand.some(card => card.getData('location') === dropZone.name);
        if (isZoneFull) {
          // REJECT: Zone is full! Send the card back to the hand grid
          gameObject.setData('location', 'hand');
          this.flipBack(gameObject);
          gameObject.setDepth(0);
          this.updateHandLayout();
          return; // Stop execution here so it doesn't snap to the zone
        }
        gameObject.x = dropZone.x + (dropZone.width / 2);
        gameObject.y = dropZone.y + (dropZone.height / 2);
        this.flipFront(gameObject);
        gameObject.setDepth(10); // Marks it as "on board"
        gameObject.setData('location', dropZone.name);
        // Rearrange remaining cards to close the gaps
        this.updateHandLayout();
      }
      else if (dropZone.name === 'hand') {
        this.flipBack(gameObject);
        gameObject.setDepth(0);  // Marks it as "in hand"
        gameObject.setData('location', dropZone.name);
        // Optional: Sort or push card to the end of the array if you want to reorder
        const index = this.hand.indexOf(gameObject);
        if (index > -1) {
          this.hand.splice(index, 1);
          this.hand.push(gameObject); // Moves dropped card to the far right
        }

        this.updateHandLayout();
      }
    });


    this.input.on('dragend',
      (pointer, gameObject, dropped) => {
        if (!dropped) {
          gameObject.x = gameObject.input.dragStartX;
          gameObject.y = gameObject.input.dragStartY;
          this.flipBack(gameObject);
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
