import Phaser from "phaser";
import { Client, Room, Callbacks } from "@colyseus/sdk";


export class DeckSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DeckSelectScene' });
  }

  preload() {
    this.load.image('warrior', 'assets/warrior.png');
    this.load.image('wizard', 'assets/wizard.png');
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.add.text(width / 2, 100, 'SELECCIONA TU MAZO', { fontSize: '32px', color: '#fff' })
      .setOrigin(0.5);

    const mazoWarrior = ['c1', 'c1', 'c2', 'c2', 'c3', 'c3', 'c4', 'c4', 'c5', 'c5', 'c6', 'c6', 'c7', 'c7', 'c8', 'c8', 'c9', 'c9', 'c10', 'c10', 'c11', 'c11', 'c12', 'c12', 'c13', 'c13', 'c14', 'c14', 'c15', 'c15', 'c16', 'c16', 'c17', 'c17', 'c18', 'c18', 'c19', 'c19', 'c20', 'c20'];
    const mazoWizard = ['c24', 'c25', 'c26', 'c27', 'c28', 'c29', 'c30', 'c31', 'c32', 'c33', 'c34', 'c35', 'c36', 'c37', 'c38', 'c39', 'c40', 'c41', 'c42', 'c43', 'c24', 'c25', 'c26', 'c27', 'c28', 'c29', 'c30', 'c31', 'c32', 'c33', 'c34', 'c35', 'c36', 'c37', 'c38', 'c39', 'c40', 'c41', 'c42', 'c43'];

    const btnFuego = this.add.image(width / 4, height / 2, 'warrior').setInteractive();
    this.add.text(width / 4, height / 2 - (btnFuego.height / 2) - 10, 'Guerrero', { color: '#000' }).setOrigin(0.5);

    btnFuego.on('pointerdown', () => {
      this.scene.start('GameScene', { cardList: mazoWarrior });
    });

    const btnAgua = this.add.image((width / 4) * 3, height / 2, 'wizard').setInteractive();
    this.add.text((width / 4) * 3, height / 2 - (btnAgua.height / 2) - 10, 'Mago', { color: '#000' }).setOrigin(0.5);

    btnAgua.on('pointerdown', () => {
      this.scene.start('GameScene', { cardList: mazoWizard });
    });
  }
}

export class GameScene extends Phaser.Scene {

  get CARD_WIDTH(): number {
    return this.scale.width * 0.1;
  }

  get CARD_HEIGHT(): number {
    return this.scale.height * 0.24;
  }

  get HAND_SIZE(): number {
    return 4;
  }

  get STARTING_HAND_SIZE(): number {
    return 4;
  }

  get HAND_WIDTH(): number {
    return this.CARD_WIDTH * this.HAND_SIZE;
  }

  get ZONE_PADDING(): number {
    return 20;
  }

  get PREVIEW_WIDTH(): number {
    return this.scale.width * 0.2;
  }

  get PREVIEW_HEIGHT(): number {
    return this.scale.height * 0.48;
  }

  constructor() {
    super({ key: 'GameScene' });
  }

  private matchCards: string[] = [];
  private discardPile: string[] = [];
  private previewSprites: Phaser.GameObjects.Image[] = [];
  private isViewingDiscard = false;
  private discardBgOverlay!: Phaser.GameObjects.Rectangle;
  private slotZones: { [name: string]: Phaser.GameObjects.Zone } = {};

  readonly SLOT_COLORS = {
    avatar: 0xff00ff,
    arma: 0xff0000,
    armadura: 0x0000ff,
    artilugio: 0x00ff00,
    objeto: 0xffff00
  };

  init(data: { cardList: string[] }) {

    const originalDeck = data && data.cardList ? data.cardList : ['c1', 'c2', 'c3', 'c4', 'c5'];

    this.matchCards = [...originalDeck];

    Phaser.Utils.Array.Shuffle(this.matchCards);

    console.log("Mazo barajado para la partida:", this.matchCards);

  }

  preload() {
    const width = this.scale.width;
    const height = this.scale.height;

    const loadingText = this.add.text(width / 2, height / 2 - 30, 'Cargando Partida...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2 + 20, '0%', {
      fontSize: '18px',
      color: '#ffff00',
      fontFamily: 'Arial'
    }).setOrigin(0.5);


    this.load.on('progress', (value: number) => {
      // 'value' es un número decimal entre 0 y 1 (ej: 0.50)
      const percentage = Math.floor(value * 100);
      percentText.setText(`${percentage}%`);
    });

    this.load.on('complete', () => {
      loadingText.destroy();
      percentText.destroy();
      console.log("¡Todos los recursos se han cargado con éxito!");
    });

    this.load.image('back', 'assets/b.png');

    this.matchCards.forEach((cardName) => {
      this.load.image(cardName, `assets/${cardName}.png`);
      this.load.image(`${cardName}_500`, `assets/${cardName}_500.png`);
    });
  }

  toggleDiscardView() {
    const width = this.scale.width;
    const height = this.scale.height;

    if (this.isViewingDiscard) {
      this.tweens.add({
        targets: [this.discardBgOverlay, ...this.previewSprites],
        alpha: 0,
        duration: 200,
        onComplete: () => {
          this.previewSprites.forEach(sprite => sprite.destroy());
          this.previewSprites = [];
          this.discardBgOverlay.destroy();
          this.cardPreview.setVisible(false);
          this.isViewingDiscard = false;
        }
      });
      return;
    }

    if (this.discardPile.length === 0) {
      console.log("El descarte está vacío.");
      return;
    }

    this.isViewingDiscard = true;
    this.discardBgOverlay = this.add.rectangle(0, 0, width, height, 0x000000);
    this.discardBgOverlay.setOrigin(0, 0);
    this.discardBgOverlay.setDepth(290);
    this.discardBgOverlay.setAlpha(0);
    this.discardBgOverlay.setInteractive();
    this.discardBgOverlay.on('pointerdown', () => {
      this.toggleDiscardView();
    });

    this.tweens.add({
      targets: this.discardBgOverlay,
      alpha: 0.7,
      duration: 200
    });

    this.discardPile.forEach((cardKey) => {
      const cardClone = this.add.image(width / 2, height / 2, cardKey);
      cardClone.setDisplaySize(cardClone.width, cardClone.height);
      cardClone.setDepth(300);
      cardClone.setAlpha(0);
      cardClone.setData({ location: 'discardPreview', image_high: cardKey + '_500' });
      cardClone.setInteractive();

      this.previewSprites.push(cardClone);
    });

    const horizontalSpacing = this.CARD_WIDTH + 10;
    const MAX_VIEW_WIDTH = this.scale.width * 0.7;

    let stepX = horizontalSpacing;
    const totalWidth = (this.previewSprites.length - 1) * horizontalSpacing;

    if (totalWidth > MAX_VIEW_WIDTH) {
      stepX = MAX_VIEW_WIDTH / (this.previewSprites.length - 1);
    }

    const finalWidth = (this.previewSprites.length - 1) * stepX;
    const startX = (width - finalWidth) / 2;

    this.previewSprites.forEach((sprite, index) => {
      sprite.setDepth(300 + this.previewSprites.length - index);
      sprite.setData('depth', 300 + this.previewSprites.length - index);
      this.tweens.add({
        targets: sprite,
        x: startX + (index * stepX),
        y: height / 2 - (this.previewSprites.length * 1.5) + (index * 3),
        alpha: 1,
        duration: 300,
        ease: 'Back.out'
      });
    });
  }



  update(time: number, delta: number): void {

    if (!this.room) { return; }

  }

  drawCards(amount: number) {

    let cardsDrawn = 0;
    const drawTimer = this.time.addEvent({
      delay: 1600,
      callback: () => {
        this.drawCard();
        cardsDrawn++;

        if (cardsDrawn >= amount) {
          drawTimer.remove();
          console.log(`¡Robo inicial completado! Se robaron ${amount} cartas.`);
        }
      },
      callbackScope: this,
      loop: true
    });

  }


  drawCard() {

    if (this.matchCards.length === 0) {
      return;
    }

    const cardKey = this.matchCards.shift();
    const deckX = this.scale.width - (this.CARD_WIDTH / 2);
    const deckY = this.scale.height - (this.CARD_HEIGHT / 2) - this.CARD_HEIGHT;
    const card = this.add.image(deckX, deckY, cardKey + '_500');

    const scaleRatio = this.CARD_WIDTH / card.width;
    const cardData = {
      image: cardKey,
      image_high: cardKey + '_500',
      location: 'hand',
      scaleRatio: scaleRatio,
      handDepth: 0,
      isDrawing: true
    };

    card.setScale(scaleRatio);
    card.setDepth(50);
    card.setData(cardData);
    this.hand.push(card);

    const horizontalSpacing = this.CARD_WIDTH;
    const totalGridWidth = this.hand.length * horizontalSpacing;
    const startX = (this.scale.width - totalGridWidth) / 2 + (horizontalSpacing / 2);

    const targetX = this.scale.width / 2;
    const targetY = this.scale.height / 2;

    this.tweens.add({
      targets: card,
      x: targetX,
      y: targetY,
      displayWidth: card.width,
      displayHeight: card.height,

      duration: 1000,
      ease: 'Cubic.out',
      onComplete: () => {
        //card.setScale(1);
        this.time.delayedCall(600, () => {

          card.setData('isDrawing', false);
          card.setScale(scaleRatio);
          card.setInteractive({ draggable: true });
          card.setDepth(0);
          this.updateHandLayout();

        }, [], this);
      }
    });

    if (this.matchCards.length === 0) {
      this.deckVisual.setVisible(false);
      console.log("El mazo físico ha desaparecido porque ya no quedan cartas.");
    }
  }


  sendToDiscard(card: Phaser.GameObjects.Image) {
    const deckX = this.scale.width - this.CARD_WIDTH - 40;
    const discardY = this.scale.height - (this.CARD_HEIGHT / 2) - this.CARD_HEIGHT - 40;

    card.disableInteractive();
    card.setDepth(40); 
    this.discardPile.push(card.texture.key);
    this.tweens.add({
      targets: card,
      x: deckX,
      y: discardY,
      duration: 400,
      ease: 'Cubic.in', 
      onComplete: () => {
        this.discardVisual.setTexture(card.texture.key);
        this.discardVisual.setScale(card.data.values.scaleRatio);
        this.discardVisual.setTint(0xffffff);
        this.discardVisual.setAlpha(1);
        card.destroy();
      }
    });
  }


  equipInitialSetup(setupData: { avatar: string, arma: string, armadura: string, artilugio: string }) {
    const categories = ['avatar', 'arma', 'armadura', 'artilugio'];

    categories.forEach((cat, index) => {
      const cardKey = setupData[cat];
      if (!cardKey) return;

      const targetZone = this.slotZones[cat];
      const targetX = targetZone.x + (targetZone.width / 2);
      const targetY = targetZone.y + (targetZone.height / 2);

      const deckX = this.scale.width - this.CARD_WIDTH - 40;
      const deckY = this.scale.height - (this.CARD_HEIGHT * 1.5) - 20;

      const card = this.add.image(deckX, deckY, cardKey);
      card.setDisplaySize(this.CARD_WIDTH * 0.1, this.CARD_HEIGHT * 0.1);
      card.setDepth(200);

      const scaleRatio = this.CARD_WIDTH / card.width;

      card.setData({
        image: cardKey,
        image_high: cardKey + '_500',
        location: 'equipment',
        equipmentType: cat,
        scaleRatio: scaleRatio
      });

      this.hand.push(card);

      this.tweens.add({
        targets: card,
        x: targetX,
        y: targetY,
        displayWidth: this.CARD_WIDTH,
        displayHeight: this.CARD_HEIGHT,
        delay: index * 250,
        duration: 500,
        ease: 'Cubic.out',
        onComplete: () => {
          card.setDepth(10);
          card.setInteractive({ draggable: true });
          card.setScale(scaleRatio);
          card.input.hitArea.setTo(0, 0, card.width, card.height);
        }
      });
    });
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

  updateOpponentHandLayout() {
    const cardsInOpponentHand = this.opponentHand.filter(card => card.depth === 0);
    const width = this.scale.width;
    const height = this.scale.height;

    Phaser.Actions.GridAlign(cardsInOpponentHand, {
      width: this.HAND_SIZE,
      height: 1,
      cellWidth: this.CARD_WIDTH,
      cellHeight: this.CARD_HEIGHT,
      position: Phaser.Display.Align.CENTER,
      x: (width - this.HAND_WIDTH) / 2,
      y: height * 0.01 - (this.CARD_HEIGHT / 2)
    });
  }

  updateHandLayout() {
    const cardsInHand = this.hand.filter(card => card.getData('location') === 'hand' && card.getData('isDrawing') !== true);
    if (cardsInHand.length === 0) return;

    const width = this.scale.width;
    const height = this.scale.height;

    const MAX_HAND_WIDTH = this.CARD_WIDTH * this.HAND_SIZE;
    const normalSpacing = this.CARD_WIDTH;

    let stepX = normalSpacing;

    const totalNormalWidth = cardsInHand.length * normalSpacing;

    if (totalNormalWidth > MAX_HAND_WIDTH) {
      stepX = (MAX_HAND_WIDTH - this.CARD_WIDTH) / (cardsInHand.length - 1);
    }

    const finalHandWidth = ((cardsInHand.length - 1) * stepX) + this.CARD_WIDTH;
    const startX = (width - finalHandWidth) / 2 + (this.CARD_WIDTH / 2) + this.CARD_WIDTH;

    cardsInHand.forEach((card, index) => {
      const targetX = startX + (index * stepX);
      const targetY = height - (this.CARD_HEIGHT / 2) - (height * 0.01) + (this.CARD_HEIGHT / 2);

      card.setData('handDepth', 1 + index);
      card.setDepth(1 + index);

      this.tweens.add({
        targets: card,
        x: targetX,
        y: targetY,
        duration: 200,
        ease: 'Power1'
      });
    });
  }

  createOpponentHand(cardCount: number) {
    this.opponentHand.forEach(card => card.destroy());
    this.opponentHand = [];

    for (let i = 1; i <= cardCount; i++) {

      const card = this.add.image(0, 0, 'back');
      const scaleRatio = this.CARD_WIDTH / card.width;
      card.setData({ location: 'opponentHand', scaleRatio: scaleRatio });
      card.setScale(scaleRatio);
      this.opponentHand.push(card);
    }

    this.updateOpponentHandLayout();
  }

  client = new Client("http://localhost:2567");
  room: Room;
  playerEntities: { [sessionId: string]: any } = {};

  async create() {
    console.log("Joining room...");

    const width = this.scale.width;
    const height = this.scale.height;

    const slotW = this.CARD_WIDTH + 10;
    const slotH = this.CARD_HEIGHT + 10;

    const startSlotX = 40;
    const startSlotY = height - (slotH * 2) - 30; // Deja espacio para las dos filas

    const slotsConfig = [
      { name: 'avatar', col: 1, row: 0 },
      { name: 'arma', col: 0, row: 0 },
      { name: 'armadura', col: 2, row: 0 },
      { name: 'artilugio', col: 0, row: 1 },
      { name: 'objeto', col: 1, row: 1 }
    ];

    const slotGraphics = this.add.graphics().setDepth(5);

    slotsConfig.forEach(cfg => {
      const posX = startSlotX + (cfg.col * (slotW + 10)) + (cfg.row * this.CARD_WIDTH / 2);
      const posY = startSlotY + (cfg.row * (slotH + 10));
      const zone = this.add
        .zone(posX, posY, slotW, slotH)
        .setOrigin(0, 0)
        .setRectangleDropZone(slotW, slotH)
        .setName(cfg.name);
      this.slotZones[cfg.name] = zone;
      const color = this.SLOT_COLORS[cfg.name] || 0xffffff;
      slotGraphics.lineStyle(3, color, 0.6);
      slotGraphics.strokeRect(posX, posY, slotW, slotH);
    });

    const previewX = width * 0.01 + (this.PREVIEW_WIDTH / 2);
    const previewY = height / 2;

    this.cardPreview = this.add.image(previewX, previewY, 'back');
    this.cardPreview.setDisplaySize(this.PREVIEW_WIDTH, this.PREVIEW_HEIGHT);
    this.cardPreview.setDepth(200); // Bien arriba de todo
    this.cardPreview.setVisible(false); // Oculta al iniciar

    const playWidth = (this.CARD_WIDTH * 2) + this.ZONE_PADDING;
    const playHeight = this.CARD_HEIGHT + (this.ZONE_PADDING * 2);
    const playZone = this.add
      .zone((width - playWidth) / 2, (height - playHeight) / 2, playWidth, playHeight)
      .setOrigin(0, 0)
      .setRectangleDropZone(playWidth, playHeight)
      .setName("play");

    this.input.enableDebug(playZone, 0xffff00);

    const handZone = this.add
      .zone((width - this.HAND_WIDTH) / 2 + this.CARD_WIDTH, height - (this.CARD_HEIGHT / 2) - (height * 0.01), this.HAND_WIDTH, this.CARD_HEIGHT)
      .setOrigin(0, 0)
      .setRectangleDropZone(this.HAND_WIDTH, this.CARD_HEIGHT)
      .setName("hand");

    this.input.enableDebug(handZone, 0xffff00);

    const opponentHandZone = this.add
      .zone((width - this.HAND_WIDTH) / 2, (height * 0.01) - (this.CARD_HEIGHT / 2), this.HAND_WIDTH, this.CARD_HEIGHT) // 10px de margen superior
      .setOrigin(0, 0)
      .setRectangleDropZone(this.HAND_WIDTH, this.CARD_HEIGHT)
      .setName("opponentHand");

    this.input.enableDebug(opponentHandZone, 0xff0000);

    this.hand = [];
    this.opponentHand = [];

    this.equipInitialSetup({ avatar: 'c1', arma: 'c2', armadura: 'c3', artilugio: 'c4' })
    this.drawCards(4);
    
    const deckX = this.scale.width - (this.CARD_WIDTH / 2) - (this.scale.width * 0.02); // Esquina inferior derecha
    const deckY = this.scale.height - (this.CARD_HEIGHT / 2) - this.CARD_HEIGHT - (this.scale.height * 0.04);
    const discardY = this.scale.height - (this.CARD_HEIGHT / 2) - (this.scale.height * 0.02);

    this.deckVisual = this.add.image(deckX, deckY, 'back');
    this.deckVisual.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
    this.deckVisual.setInteractive({ useHandCursor: true });

    this.deckVisual.on('pointerover', () => this.deckVisual.setTint(0xdddddd));
    this.deckVisual.on('pointerout', () => this.deckVisual.clearTint());
    this.deckVisual.on('pointerdown', () => {
      this.drawCard();
    });

    this.discardVisual = this.add.image(deckX, discardY, 'back');
    this.discardVisual.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
    this.discardVisual.setTint(0x444444);
    this.discardVisual.setAlpha(0.5);
    this.discardVisual.setInteractive({ useHandCursor: true });

    this.discardVisual.on('pointerdown', () => {
      console.log(this.discardPile);
      this.toggleDiscardView();
    })

    const framesGraphics = this.add.graphics();
    framesGraphics.setDepth(5); 
    framesGraphics.lineStyle(3, 0x00ffff, 0.8);
    framesGraphics.strokeRect(
      deckX - this.CARD_WIDTH / 2 - 2,
      deckY - this.CARD_HEIGHT / 2 - 2,
      this.CARD_WIDTH + 4,
      this.CARD_HEIGHT + 4
    );

    framesGraphics.lineStyle(3, 0xffaa00, 0.8);
    framesGraphics.strokeRect(
      deckX - this.CARD_WIDTH / 2 - 2,
      discardY - this.CARD_HEIGHT / 2 - 2,
      this.CARD_WIDTH + 4,
      this.CARD_HEIGHT + 4
    );

    this.updateHandLayout();
    this.createOpponentHand(this.STARTING_HAND_SIZE);


    this.input.on('gameobjectover', (pointer, gameObject) => {
      if (gameObject.getData('location') === 'hand' && gameObject.getData('isDrawing') !== true) { // && gameObject.depth === 0
        console.log(gameObject.data.values.scaleRatio);
        gameObject.setDepth(30);
        this.tweens.add({
          targets: gameObject,
          y: height - (this.CARD_HEIGHT) - (height * 0.20) + (this.CARD_HEIGHT / 2),  
          scale: gameObject.data.values.scaleRatio * 2.5,
          duration: 100,
          ease: 'Power1'
        });
      } else if (gameObject.getData('location') === 'discardPreview') {
        gameObject.setDepth(400);
      } else if (gameObject.getData('location') === 'equipment') {
        gameObject.setScale(1);
        gameObject.setDepth(400);
      }
    });

    this.input.on('gameobjectout', (pointer, gameObject) => {
      if (gameObject.getData('location') === 'hand' && gameObject.getData('isDrawing') !== true) {
        gameObject.setDepth(gameObject.getData('handDepth'));
        this.tweens.add({
          targets: gameObject,
          y: height - (this.CARD_HEIGHT / 2) - (height * 0.01) + (this.CARD_HEIGHT / 2),          // Regresa a su altura original de la cuadrícula
          scale: gameObject.data.values.scaleRatio, 
          duration: 100,
          ease: 'Power1'
        });
      } else if (gameObject.getData('location') === 'discardPreview') {
        gameObject.setDepth(gameObject.getData('depth'));
      } else if (gameObject.getData('location') === 'equipment') {
        gameObject.setScale(gameObject.getData('scaleRatio'));
        gameObject.setDepth(gameObject.getData(10));
      }
    });

    
    this.input.on('dragstart', (pointer, gameObject) => {
  
      gameObject.x = pointer.downX;
      gameObject.y = pointer.downY;
      gameObject.setDepth(100);
      gameObject.setScale(gameObject.data.values.scaleRatio);
      gameObject.setData('location', 'dragging');

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
          gameObject.setData('location', 'hand');
          gameObject.setDepth(0);
          this.updateHandLayout();
          return;
        }
        gameObject.x = dropZone.x + (dropZone.width / 2);
        gameObject.y = dropZone.y + (dropZone.height / 2);
        gameObject.setDepth(10);
        gameObject.setData('location', dropZone.name);
        this.updateHandLayout();
      }
      else if (dropZone.name === 'hand') {
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
        gameObject.setData('location', 'hand');
        gameObject.setDepth(0);
        this.updateHandLayout();
      } else if (this.SLOT_COLORS.hasOwnProperty(dropZone.name)) {

        const isSlotFull = this.hand.some(card => card.getData('location') === dropZone.name);

        if (isSlotFull) {

          gameObject.setData('location', 'hand');

          gameObject.setDepth(0);
          this.updateHandLayout();
          return;
        }


        gameObject.x = dropZone.x + (dropZone.width / 2);
        gameObject.y = dropZone.y + (dropZone.height / 2);
        gameObject.setDepth(10);
        gameObject.setData('location', dropZone.name);

        this.updateHandLayout();
        return;
      }
    });



    this.input.on('dragend',
      (pointer, gameObject, dropped) => {
        if (!dropped) {

          this.sendToDiscard(gameObject);

          // gameObject.setDepth(0);
          // gameObject.setData('location', 'hand');
          // const index = this.hand.indexOf(gameObject);
          // if (index > -1) {
          //   this.hand.splice(index, 1);
          //   this.hand.push(gameObject);
          // }

          this.updateHandLayout();

        }
      }
    )

    try {
      this.room = await this.client.joinOrCreate("my_room");
      console.log("Joined successfully!");

      const callbacks = Callbacks.get(this.room);

      callbacks.onAdd("players", (player, sessionId) => {

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

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  backgroundColor: '#898990',
  parent: 'game-container',
  physics: { default: "arcade" },
  pixelArt: false,
  antialias: true,
  antialiasGL: true,
  scene: [DeckSelectScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

};

const game = new Phaser.Game(config);
