import Phaser from "phaser";
import { Client, Room, Callbacks } from "@colyseus/sdk";
import Game = require("phaser");


export class DeckSelectScene extends Phaser.Scene {
  constructor() {
    // Le asignamos una clave única a la escena para poder llamarla
    super({ key: 'DeckSelectScene' });
  }

  preload() {
    // Cargamos botones o elementos visuales básicos para el menú
    this.load.image('warrior', 'assets/warrior.png');
    this.load.image('wizard', 'assets/wizard.png');
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.add.text(width / 2, 100, 'SELECCIONA TU MAZO', { fontSize: '32px', color: '#fff' })
      .setOrigin(0.5);

    // --- Definición de Mazos Disponibles ---
    const mazoWarrior = {
      mazo: ['c1', 'c1', 'c2', 'c2', 'c3', 'c3', 'c4', 'c4', 'c5', 'c5', 'c6', 'c6', 'c7', 'c7', 'c8', 'c8', 'c9', 'c9', 'c10', 'c10', 'c11', 'c11', 'c12', 'c12', 'c13', 'c13', 'c14', 'c14', 'c15', 'c15', 'c16', 'c16', 'c17', 'c17', 'c18', 'c18', 'c19', 'c19', 'c20', 'c20'],
      arma: 'c21',
      armadura: 'c22',
      artilugio: 'c23'
    };
    const mazoWizard = {
      mazo: ['c24', 'c25', 'c26', 'c27', 'c28', 'c29', 'c30', 'c31', 'c32', 'c33', 'c34', 'c35', 'c36', 'c37', 'c38', 'c39', 'c40', 'c41', 'c42', 'c43', 'c24', 'c25', 'c26', 'c27', 'c28', 'c29', 'c30', 'c31', 'c32', 'c33', 'c34', 'c35', 'c36', 'c37', 'c38', 'c39', 'c40', 'c41', 'c42', 'c43'],
      arma: 'c44',
      armadura: 'c45',
      artilugio: 'c46'
    };

    // --- Botón Mazo 1 ---
    const btnFuego = this.add.image(width / 4, height / 2, 'warrior').setInteractive();
    this.add.text(width / 4, height / 2 - (btnFuego.height / 2) - 10, 'Guerrero', { color: '#000' }).setOrigin(0.5);

    btnFuego.on('pointerdown', () => {
      // INICIAMOS GameScene y le pasamos el mazo elegido
      this.scene.start('GameScene', mazoWarrior);
    });

    // --- Botón Mazo 2 ---
    const btnAgua = this.add.image((width / 4) * 3, height / 2, 'wizard').setInteractive();
    this.add.text((width / 4) * 3, height / 2 - (btnAgua.height / 2) - 10, 'Mago', { color: '#000' }).setOrigin(0.5);

    btnAgua.on('pointerdown', () => {
      // INICIAMOS GameScene y le pasamos el mazo elegido
      this.scene.start('GameScene', mazoWizard);
    });
  }
}



// custom scene class
export class GameScene extends Phaser.Scene {
  // local input cache

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

  // Tu propiedad privada para guardar el mazo
  private matchCards: string[] = [];
  private arma: string;
  private armadura: string;
  private artilugio: string;
  private discardPile: string[] = [];
  private previewSprites: Phaser.GameObjects.Image[] = []; // Para limpiar los clones del centro
  private isViewingDiscard = false; // Bandera para bloquear interacciones
  private discardBgOverlay!: Phaser.GameObjects.Rectangle; // <-- NUEVO: Fondo oscuro
  private STACK_COLORS = {
    player: 0x00ffff,    // Cian para tus cartas en la pila
    opponent: 0xff0000  // Rojo para las del oponente en la pila
  };

  // Guardaremos las referencias de los gráficos de contorno de las cartas en la pila
  private stackBorderGraphics!: Phaser.GameObjects.Graphics;

  // Colócalo como propiedad de la clase al inicio
  private slotZones: { [name: string]: Phaser.GameObjects.Zone } = {};

  // Códigos de colores para identificar cada equipamiento
  readonly SLOT_COLORS = {
    avatar: 0xff00ff,    // Magenta / Violeta
    arma: 0xff0000,      // Rojo
    armadura: 0x0000ff,  // Azul
    artilugio: 0x00ff00, // Verde
    objeto: 0xffff00     // Amarillo
  };



  // Tu método init() que ya programamos para recibir los datos:
  init(data: {
    mazo: string[],
    arma: string,
    armadura: string,
    artilugio: string
  }) {
    //    this.matchCards = data && data.cardList ? data.cardList : ['c1', 'c2', 'c3', 'c4', 'c5'];
    const originalDeck = data && data.mazo ? data.mazo : ['c1', 'c2', 'c3', 'c4', 'c5'];

    // 2. Creamos una copia del mazo para no alterar la lista original de la pantalla anterior
    this.matchCards = [...originalDeck];
    this.arma = data.arma;
    this.armadura = data.armadura;
    this.artilugio = data.artilugio;
    // 3. ¡BARAJAR EL ARREGLO AL AZAR!
    Phaser.Utils.Array.Shuffle(this.matchCards);

    console.log("Mazo barajado para la partida:", this.matchCards);

  }


  // preload() {
  //   // preload scene
  //   for (let i = 1; i <= 5; i++) {
  //     this.load.image(`c${i}`, `assets/c${i}.png`);
  //     // NUEVO: Versiones HD para la previsualización
  //     this.load.image(`c${i}_500`, `assets/c${i}_500.png`);
  //   }

  //   this.load.image('back', 'assets/b.png');
  // }

  preload() {
    const width = this.scale.width;
    const height = this.scale.height;

    // --- 1. CREAR TEXTOS VISUALES EN PANTALLA ---
    // Texto principal de "Cargando..."
    const loadingText = this.add.text(width / 2, height / 2 - 30, 'Cargando Partida...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Texto de porcentaje (ej: 45%)
    const percentText = this.add.text(width / 2, height / 2 + 20, '0%', {
      fontSize: '18px',
      color: '#ffff00',
      fontFamily: 'Arial'
    }).setOrigin(0.5);


    // --- 2. ESCUCHAR LOS EVENTOS DEL CARGADOR (LOADER) ---
    // Este evento se dispara cada vez que un archivo individual termina de descargarse
    this.load.on('progress', (value: number) => {
      // 'value' es un número decimal entre 0 y 1 (ej: 0.50)
      const percentage = Math.floor(value * 100);
      percentText.setText(`${percentage}%`);
    });

    // Este evento se dispara automáticamente cuando TODO el mazo se ha cargado en memoria
    this.load.on('complete', () => {
      // Destruimos los textos de carga para que no ensucien la mesa de juego
      loadingText.destroy();
      percentText.destroy();
      console.log("¡Todos los recursos se han cargado con éxito!");
    });


    // --- 3. TU LÓGICA EXISTENTE DE CARGA DINÁMICA ---
    // Carga de la parte trasera común
    this.load.image('back', 'assets/b.png');
    this.load.image('c70', 'assets/c70_500.png');
    this.load.image(this.arma, `assets/${this.arma}_500.png`);
    this.load.image(this.armadura, `assets/${this.armadura}_500.png`);
    this.load.image(this.artilugio, `assets/${this.artilugio}_500.png`);

    // Carga del mazo seleccionado enviado desde la pantalla anterior
    this.matchCards.forEach((cardName) => {
      this.load.image(cardName, `assets/${cardName}.png`);
      this.load.image(`${cardName}_500`, `assets/${cardName}_500.png`);
    });
  }


  // toggleDiscardView() {
  //   // 1. Si ya se están viendo y hace clic de nuevo, limpiamos y cerramos
  //   if (this.isViewingDiscard) {
  //     this.previewSprites.forEach(sprite => sprite.destroy());
  //     this.previewSprites = [];
  //     this.isViewingDiscard = false;
  //     return;
  //   }

  //   if (this.discardPile.length === 0) {
  //     console.log("El descarte está vacío.");
  //     return;
  //   }

  //   this.isViewingDiscard = true;
  //   const width = this.scale.width;
  //   const height = this.scale.height;

  //   // 2. Instanciamos imágenes físicas temporales en el centro de la pantalla
  //   this.discardPile.forEach((cardKey) => {
  //     // Las creamos en el centro de la pantalla
  //     const cardClone = this.add.image(width / 2, height / 2, cardKey);
  //     cardClone.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
  //     cardClone.setDepth(300); // Por encima de todo el juego para aislar la vista

  //     // Opcional: Permitir que el hover HD funcione en la vista de descarte
  //     cardClone.setData({ location: 'discardPreview', highImage: 'high_' + cardKey });
  //     cardClone.setInteractive();

  //     this.previewSprites.push(cardClone);
  //   });

  //   // 3. REUTILIZAMOS TU MATEMÁTICA: Alineamos las cartas en un abanico central comprimido
  //   const horizontalSpacing = this.CARD_WIDTH + 10;
  //   const MAX_VIEW_WIDTH = 500; // Un poco más estrecho para que se vea contenido

  //   let stepX = horizontalSpacing;
  //   const totalWidth = (this.previewSprites.length - 1) * horizontalSpacing;

  //   if (totalWidth > MAX_VIEW_WIDTH) {
  //     stepX = MAX_VIEW_WIDTH / (this.previewSprites.length - 1);
  //   }

  //   const finalWidth = (this.previewSprites.length - 1) * stepX;
  //   const startX = (width - finalWidth) / 2;

  //   // Animamos su apertura desde el centro hacia los lados de forma espectacular
  //   this.previewSprites.forEach((sprite, index) => {
  //     sprite.setDepth(300 + index); // Capas correctas

  //     this.tweens.add({
  //       targets: sprite,
  //       x: startX + (index * stepX),
  //       y: height / 2, // Centrado vertical perfecto
  //       duration: 300,
  //       ease: 'Back.out' // Un ligero rebote al abrirse
  //     });
  //   });
  // }

  toggleDiscardView() {
    const width = this.scale.width;
    const height = this.scale.height;

    // === 1. SI YA ESTÁ ABIERTO, LIMPIAMOS Y CERRAMOS ===
    if (this.isViewingDiscard) {
      // Animamos la desaparición del fondo y las cartas antes de destruirlas
      this.tweens.add({
        targets: [this.discardBgOverlay, ...this.previewSprites],
        alpha: 0,
        duration: 200,
        onComplete: () => {
          this.previewSprites.forEach(sprite => sprite.destroy());
          this.previewSprites = [];
          this.discardBgOverlay.destroy(); // Eliminamos el rectángulo de memoria
          //          this.cardPreview.setVisible(false); // Ocultamos el zoom HD lateral si quedó prendido
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

    // === 2. CREAR EL RECTÁNGULO SEMI-TRANSPARENTE ===
    // Creamos un rectángulo negro (0x000000) que cubre toda la pantalla
    this.discardBgOverlay = this.add.rectangle(0, 0, width, height, 0x000000);
    this.discardBgOverlay.setOrigin(0, 0);
    this.discardBgOverlay.setDepth(290); // Justo por debajo de las cartas clonadas (300)
    this.discardBgOverlay.setAlpha(0);   // Empieza invisible para animarlo

    // Hacemos que el fondo reaccione a los clics
    this.discardBgOverlay.setInteractive();
    this.discardBgOverlay.on('pointerdown', () => {
      // Al hacer clic en cualquier parte vacía (el fondo negro), llamamos recursivamente a la función para cerrar
      this.toggleDiscardView();
    });

    // Animación para que el fondo se oscurezca suavemente hasta el 70% de opacidad
    this.tweens.add({
      targets: this.discardBgOverlay,
      alpha: 0.7,
      duration: 200
    });

    // === 3. INSTANCIAR E IMÁGENES CLONADAS (Tu lógica existente con mejoras) ===
    this.discardPile.forEach((cardKey) => {
      // Nacen desde el centro
      const cardClone = this.add.image(width / 2, height / 2, cardKey);
      //cardClone.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
      cardClone.setDisplaySize(cardClone.width, cardClone.height);
      cardClone.setDepth(300);
      cardClone.setAlpha(0); // Empiezan invisibles para que aparezcan de forma fluida

      cardClone.setData({ location: 'discardPreview', image_high: cardKey + '_500' });
      cardClone.setInteractive();

      this.previewSprites.push(cardClone);
    });

    // Matemática del abanico comprimido
    const horizontalSpacing = this.CARD_WIDTH + 10;
    const MAX_VIEW_WIDTH = this.scale.width * 0.7;

    let stepX = horizontalSpacing;
    const totalWidth = (this.previewSprites.length - 1) * horizontalSpacing;

    if (totalWidth > MAX_VIEW_WIDTH) {
      stepX = MAX_VIEW_WIDTH / (this.previewSprites.length - 1);
    }

    const finalWidth = (this.previewSprites.length - 1) * stepX;
    const startX = (width - finalWidth) / 2;

    // Animación coordinada de apertura
    this.previewSprites.forEach((sprite, index) => {
      // sprite.setDepth(300 + this.previewSprites.length - index);
      // sprite.setData('depth', 300 + this.previewSprites.length - index);
      sprite.setDepth(300 + index);
      sprite.setData('depth', 300 + index);
      this.tweens.add({
        targets: sprite,
        x: startX + (index * stepX),
        y: height / 2 - (this.previewSprites.length * 1.5) + (index * 3),
        alpha: 1, // Se vuelven completamente visibles al abrirse
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

    // Creamos un evento de tiempo que se ejecutará repetidamente
    const drawTimer = this.time.addEvent({
      delay: 1600,                // 1000 milisegundos = 1 segundo de retraso
      callback: () => {
        // 1. Ejecutamos la función de robar una carta que ya programamos
        this.drawCard();
        cardsDrawn++;

        // 2. Si ya robamos la cantidad de cartas solicitada, destruimos el temporizador
        if (cardsDrawn >= amount) {
          drawTimer.remove();
          console.log(`¡Robo inicial completado! Se robaron ${amount} cartas.`);
        }
      },
      callbackScope: this,
      loop: true                  // Indica que debe repetirse secuencialmente
    });

  }


  drawCard() {
    // 1. Verificar si quedan cartas en el mazo lógico
    if (this.matchCards.length === 0) {
      return;
    }

    // 2. Sacar el nombre de la carta del frente del mazo barajado
    const cardKey = this.matchCards.shift();
    const deckX = this.scale.width - (this.CARD_WIDTH / 2);
    const deckY = this.scale.height - (this.CARD_HEIGHT / 2) - this.CARD_HEIGHT;
    const card = this.add.image(deckX, deckY, cardKey + '_500');

    const scaleRatio = this.CARD_WIDTH / card.width;
    const cardData = {
      object: 'card',
      image: cardKey,
      image_high: cardKey + '_500',
      location: 'hand',
      scaleRatio: scaleRatio,
      depth: 0,
      isDrawing: true
    };

    //card.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
    card.setScale(scaleRatio);
    card.setDepth(50); // Por encima de la mesa pero debajo del drag activo
    card.setData(cardData);
    // Añadir la carta a nuestro arreglo de la mano
    this.hand.push(card);
    //this.updateHandLayout();

    // 5. Calcular de antemano la posición final a la que debe llegar la carta en la mano
    // Para hacer esto, llamamos temporalmente a nuestra matemática de GridAlign
    const horizontalSpacing = this.CARD_WIDTH;
    const totalGridWidth = this.hand.length * horizontalSpacing;
    //const totalGridWidth = this.HAND_SIZE * horizontalSpacing;
    const startX = (this.scale.width - totalGridWidth) / 2 + (horizontalSpacing / 2);

    // La posición X meta dependerá del índice que ocupa la carta en el arreglo actual
    //const targetX = startX + (this.hand.indexOf(card) * horizontalSpacing);
    // const targetX = this.scale.width * 0.7 ;
    // //const targetY = this.scale.height - (this.CARD_HEIGHT / 2) - 20;
    // const targetY = this.scale.height - this.CARD_HEIGHT - (this.scale.height * 0.20) + (this.CARD_HEIGHT / 2)
    const targetX = this.scale.width / 2;
    //const targetY = this.scale.height - (this.CARD_HEIGHT / 2) - 20;
    const targetY = this.scale.height / 2;
    // 6. ANIMAR LA CARTA CON UN TWEEN HACIA LA MANO
    this.tweens.add({
      targets: card,
      x: targetX,
      y: targetY,
      displayWidth: card.width,
      displayHeight: card.height,

      duration: 1000,        // Duración del viaje en milisegundos
      ease: 'Cubic.out',    // Efecto de frenado suave al llegar
      onComplete: () => {
        //card.setScale(1);
        this.time.delayedCall(600, () => {

          // // Antes de que viaje a la mano, recalculamos el destino exacto en el abanico
          // const horizontalSpacing = this.CARD_WIDTH + 10;
          // const MAX_HAND_WIDTH = 550;
          // let stepX = horizontalSpacing;
          // const totalNormalWidth = (this.hand.length) * horizontalSpacing; // contamos la actual
          // if (totalNormalWidth > MAX_HAND_WIDTH) {
          //   stepX = MAX_HAND_WIDTH / (this.hand.length - 1 || 1);
          // }
          // const finalHandWidth = (this.hand.length - 1) * stepX;
          // const startX = (this.scale.width - finalHandWidth) / 2;

          // const targetX = startX + (this.hand.indexOf(card) * stepX);
          // const targetY = this.scale.height - (this.CARD_HEIGHT / 2) - 20;

          // // === ETAPA 3: ENCOGER Y VIAJAR A LA MANO ===
          // this.tweens.add({
          //   targets: card,
          //   x: targetX,
          //   y: targetY,
          //   // Reducimos el tamaño de vuelta a las constantes estándar de la mano
          //   displayWidth: this.CARD_WIDTH,
          //   displayHeight: this.CARD_HEIGHT,
          //   duration: 400,
          //   ease: 'Quad.out',
          //   onComplete: () => {
          //     // Liberamos la carta para el layout general y la hacemos interactiva
          //     card.setData('isDrawing', false);
          //     card.setDepth(50); // Bajamos su prioridad a nivel de mano
          //     card.setInteractive({ draggable: true });
          //     card.input.hitArea.setTo(0, 0, card.width, card.height);

          //     this.updateHandLayout(); // Refresco final de orden
          //   }
          // });

          // // Metemos la carta al arreglo justo cuando empieza a ir a la mano 
          // // para que las demás se abran de forma fluida mientras esta aterriza
          // if (!this.hand.includes(card)) {
          //   this.hand.push(card);
          // }
          // this.updateHandLayout();


          card.setData('isDrawing', false);
          card.setScale(scaleRatio);

          // Una vez que la carta llega de forma segura a la mano, la volvemos interactiva
          card.setInteractive({ draggable: true });
          //card.input.hitArea.setTo(0, 0, card.width, card.height);
          card.setDepth(0); // Por encima de la mesa pero debajo del drag activo
          // Forzamos el refresco completo del layout por si hay desfases mínimos
          this.updateHandLayout();

        }, [], this);

        // card.setData('isDrawing', false); 
        // card.setScale(scaleRatio);

        // // Una vez que la carta llega de forma segura a la mano, la volvemos interactiva
        // card.setInteractive({ draggable: true });
        // //card.input.hitArea.setTo(0, 0, card.width, card.height);
        // card.setDepth(0); // Por encima de la mesa pero debajo del drag activo
        // // Forzamos el refresco completo del layout por si hay desfases mínimos
        // this.updateHandLayout();
      }
    });
    // Reacomodar inmediatamente el resto de las cartas de la mano para abrir espacio
    //this.updateHandLayout();
    if (this.matchCards.length === 0) {
      this.deckVisual.setVisible(false);
      console.log("El mazo físico ha desaparecido porque ya no quedan cartas.");
    }
  }


  sendToDiscard(card: Phaser.GameObjects.Image) {
    const deckX = this.scale.width - this.CARD_WIDTH - 40;
    const discardY = this.scale.height - (this.CARD_HEIGHT / 2) - this.CARD_HEIGHT - 40;

    // Desactivamos su interactividad para que nadie pueda volver a tocarla
    card.disableInteractive();
    card.setDepth(40); // Por debajo de las cartas activas de la mesa
    this.discardPile.push(card.texture.key);
    this.tweens.add({
      targets: card,
      x: deckX,
      y: discardY,
      duration: 400,
      ease: 'Cubic.in', // Acelera al entrar al descarte
      onComplete: () => {
        // 1. Hacemos que la carta se voltee boca arriba para ver qué se descartó
        //this.flipFront(card);

        // 2. Actualizamos la textura del descarte base para que muestre la última carta jugada
        this.discardVisual.setTexture(card.texture.key);
        this.discardVisual.setScale(card.data.values.scaleRatio);
        this.discardVisual.setTint(0xffffff); // Restauramos su color brillante normal
        this.discardVisual.setAlpha(1);       // Opacidad completa
        // 3. Eliminamos el objeto físico de la carta para liberar memoria de Phaser
        card.destroy();
      }
    });
  }


  equipInitialSetup(setupData: { avatar: string, arma: string, armadura: string, artilugio: string }) {
    const categories = ['avatar', 'arma', 'armadura', 'artilugio'];

    categories.forEach((cat, index) => {
      const cardKey = setupData[cat]; // ej: 'c1'
      if (!cardKey) return;

      // Buscamos las coordenadas físicas de la zona destino que guardamos en el objeto
      const targetZone = this.slotZones[cat];
      const targetX = targetZone.x + (targetZone.width / 2);
      const targetY = targetZone.y + (targetZone.height / 2);

      // Coordenadas de salida del mazo
      const deckX = this.scale.width - this.CARD_WIDTH - 40;
      const deckY = this.scale.height - (this.CARD_HEIGHT * 1.5) - 20;

      // Instanciamos la carta inicialmente pequeña en el mazo
      const card = this.add.image(deckX, deckY, cardKey);
      card.setDisplaySize(this.CARD_WIDTH * 0.1, this.CARD_HEIGHT * 0.1);
      card.setDepth(200);

      const scaleRatio = this.CARD_WIDTH / card.width;

      card.setData({
        object: 'card',
        image: cardKey,
        image_high: cardKey + '_500',
        //location: 'equipment',
        //equipmentType: cat,
        location: cat,
        scaleRatio: scaleRatio
      });

      this.hand.push(card); // La registramos en el listado global del juego

      // Animamos su salida escalonada agregando un pequeño retraso (delay) por cada pieza
      this.tweens.add({
        targets: card,
        x: targetX,
        y: targetY,
        displayWidth: this.CARD_WIDTH,
        displayHeight: this.CARD_HEIGHT,
        delay: index * 250, // Se equipan una tras otra elegantemente cada 250ms
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

  // updateHandLayout() {
  //   const cardsInHand = this.hand.filter(card => card.depth === 0);

  //   const width = this.scale.width;
  //   const height = this.scale.height;

  //   Phaser.Actions.GridAlign(cardsInHand, {
  //     width: this.HAND_SIZE,          // Maximum number of cards in a row
  //     height: 1,         // Single row layout
  //     cellWidth: this.CARD_WIDTH,    // Horizontal spacing between card centers
  //     cellHeight: this.CARD_HEIGHT,   // Vertical cell allocation
  //     position: Phaser.Display.Align.CENTER,
  //     //x: width - * 0.05,            // Starting X position of the first card
  //     x: (width - this.HAND_WIDTH) / 2,            // Starting X position of the first card
  //     y: height - this.CARD_HEIGHT - (height * 0.01)             // Constant Y height for the hand row
  //   });
  // }

  updateOpponentHandLayout() {
    // Filtramos solo las cartas del oponente que no han sido jugadas en la mesa
    const cardsInOpponentHand = this.opponentHand.filter(card => card.depth === 0);
    const width = this.scale.width;
    const height = this.scale.height;

    Phaser.Actions.GridAlign(cardsInOpponentHand, {
      width: this.HAND_SIZE,          // Máximo de cartas por fila
      height: 1,
      cellWidth: this.CARD_WIDTH,    // Mismo espaciado horizontal
      cellHeight: this.CARD_HEIGHT,
      position: Phaser.Display.Align.CENTER,
      x: (width - this.HAND_WIDTH) / 2,
      y: height * 0.01 - (this.CARD_HEIGHT / 2)
    });
  }

  // updateHandLayout() {
  //   const cardsInHand = this.hand.filter(card => card.depth === 0);
  //   const width = this.scale.width;
  //   const height = this.scale.height;
  //   const horizontalSpacing = this.CARD_WIDTH;
  //   const totalGridWidth = cardsInHand.length * horizontalSpacing;
  //   const startX = (width - totalGridWidth) / 2 + (horizontalSpacing / 2);

  //   cardsInHand.forEach((card, index) => {
  //     const targetX = startX + (index * horizontalSpacing);
  //     //const targetY = this.scale.height - (this.CARD_HEIGHT / 2);
  //     const targetY = height - this.CARD_HEIGHT - (height * 0.01) + (this.CARD_HEIGHT / 2);

  //     // Movemos las cartas con un tween sutil en lugar de teletransportarlas con GridAlign
  //     this.tweens.add({
  //       targets: card,
  //       x: targetX,
  //       y: targetY,
  //       duration: 200,
  //       ease: 'Power1'
  //     });
  //   });
  // }
  redrawStackBorders() {
    // Limpiamos los trazos viejos
    this.stackBorderGraphics.clear();

    // Buscamos todas las cartas en juego (locales y del oponente) que estén en la pila
    const allCards = [...this.hand, ...this.opponentHand];

    allCards.forEach(card => {
      if (card.getData('location') === 'stack') {
        // Identificamos al dueño: si pertenece al arreglo 'hand' es del jugador local
        const isPlayerCard = this.hand.includes(card);
        const color = isPlayerCard ? this.STACK_COLORS.player : this.STACK_COLORS.opponent;

        // Configuramos el grosor y color del marco alrededor de la carta
        this.stackBorderGraphics.lineStyle(4, color, 0.9);

        // Dibujamos el contorno considerando que el origen de la carta es (0.5, 0.5)
        this.stackBorderGraphics.strokeRect(
          card.x - this.CARD_WIDTH / 2 - 2,
          card.y - this.CARD_HEIGHT / 2 - 2,
          this.CARD_WIDTH + 4,
          this.CARD_HEIGHT + 4
        );
      }
    });
  }


  updateHandLayout() {
    // 1. Filtrar solo las cartas que están activas en la mano
    const cardsInHand = this.hand.filter(card => card.getData('location') === 'hand' && card.getData('isDrawing') !== true);
    if (cardsInHand.length === 0) return;

    const width = this.scale.width;
    const height = this.scale.height;

    // 2. CONFIGURACIÓN DEL ESPACIO MÁXIMO FIJO EN MESA
    const MAX_HAND_WIDTH = this.CARD_WIDTH * this.HAND_SIZE // El ancho máximo que permitiremos que ocupe toda la mano junta
    const normalSpacing = this.CARD_WIDTH; // Espaciado normal cuando hay pocas cartas (130px)

    // 3. CÁLCULO DINÁMICO DEL ESPACIADO (STEP)
    let stepX = normalSpacing;

    // Calculamos cuánto mediría la mano con el espaciado normal
    //const totalNormalWidth = (cardsInHand.length - 1) * normalSpacing;
    const totalNormalWidth = cardsInHand.length * normalSpacing;

    // Si el tamaño normal supera nuestro límite máximo, calculamos una separación más pequeña (superposición)
    if (totalNormalWidth > MAX_HAND_WIDTH) {
      stepX = (MAX_HAND_WIDTH - this.CARD_WIDTH) / (cardsInHand.length - 1);
      //stepX = MAX_HAND_WIDTH / (cardsInHand.length - 1);
    }

    // 4. CALCULAR EL PUNTO DE INICIO CENTRADO
    const finalHandWidth = ((cardsInHand.length - 1) * stepX) + this.CARD_WIDTH;
    const startX = (width - finalHandWidth) / 2 + (this.CARD_WIDTH / 2) + this.CARD_WIDTH;
    // const startX = (width - this.HAND_WIDTH) / 2 + (this.CARD_WIDTH / 2);

    // 5. REUBICAR Y ORDENAR CAPAS (DEPTH)
    cardsInHand.forEach((card, index) => {
      const targetX = startX + (index * stepX);
      //const targetY = this.scale.height - (this.CARD_HEIGHT / 2) - 20;
      const targetY = height - (this.CARD_HEIGHT / 2) - (height * 0.01) + (this.CARD_HEIGHT / 2);

      // IMPORTANTE para la superposición: Cada carta de la izquierda debe estar por debajo
      // de la que tiene a su derecha. Incrementamos el depth progresivamente (1, 2, 3...)

      card.setData('depth', 1 + index);
      card.setDepth(1 + index);

      // Movemos las cartas con una transición suave
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
    // Limpiar mano anterior si existiera
    this.opponentHand.forEach(card => card.destroy());
    this.opponentHand = [];

    for (let i = 1; i <= cardCount; i++) {
      // Las cartas del oponente nacen boca abajo y sin interactividad de arrastre

      const card = this.add.image(0, 0, 'back');
      const scaleRatio = this.CARD_WIDTH / card.width;
      card.setData({ location: 'opponentHand', scaleRatio: scaleRatio });
      card.setScale(scaleRatio);
      // card.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
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

    const width = this.scale.width;
    const height = this.scale.height;

    // El tamaño de cada slot se acopla exactamente a tus constantes globales de carta
    const slotW = this.CARD_WIDTH + 10;
    const slotH = this.CARD_HEIGHT + 10;

    // Punto de partida base en la esquina inferior izquierda
    const startSlotX = 40;
    const startSlotY = height - (slotH * 2) - 30; // Deja espacio para las dos filas

    // Definimos la grilla exacta: [nombre, columna, fila]
    const slotsConfig = [
      { name: 'avatar', col: 1, row: 0 },
      { name: 'arma', col: 0, row: 0 },
      { name: 'armadura', col: 2, row: 0 },
      { name: 'artilugio', col: 0, row: 1 },
      { name: 'objeto', col: 1, row: 1 }
    ];

    const slotGraphics = this.add.graphics().setDepth(0);

    slotsConfig.forEach(cfg => {
      // Calculamos la posición X e Y de cada slot de equipamiento
      const posX = startSlotX + (cfg.col * (slotW + 10)) + (cfg.row * this.CARD_WIDTH / 2);
      const posY = startSlotY + (cfg.row * (slotH + 10));

      // 1. Crear la Zona Física de drop (Origen 0,0 para consistencia)
      const zone = this.add
        .zone(posX, posY, slotW, slotH)
        .setOrigin(0, 0)
        .setRectangleDropZone(slotW, slotH)
        .setName(cfg.name);

      this.slotZones[cfg.name] = zone;

      // 2. Pintar su borde visual único sin usar imágenes adicionales
      const color = this.SLOT_COLORS[cfg.name] || 0xffffff;
      slotGraphics.lineStyle(3, color, 0.6);
      slotGraphics.strokeRect(posX, posY, slotW, slotH);
    });



    // La ubicamos a la derecha de la pantalla de forma responsiva
    //const previewX = this.scale.width - (this.PREVIEW_WIDTH / 2) - 20;
    const previewX = width * 0.01 + (this.PREVIEW_WIDTH / 2);
    const previewY = height / 2;

    // Creamos el objeto de la carta grande (usamos 'back' como placeholder inicial)
    this.cardPreview = this.add.image(previewX, previewY, 'back');
    this.cardPreview.setDisplaySize(this.PREVIEW_WIDTH, this.PREVIEW_HEIGHT);
    this.cardPreview.setDepth(200); // Bien arriba de todo
    this.cardPreview.setVisible(false); // Oculta al iniciar


    // --- 1. CENTERED PLAY ZONE ---
    const playerPlayWidth = (this.CARD_WIDTH * 2);
    const playerPlayHeight = this.CARD_HEIGHT;
    const playerPlayZone = this.add
      .zone((width - playerPlayWidth) / 2, height / 2 + this.ZONE_PADDING, playerPlayWidth, playerPlayHeight)
      .setOrigin(0, 0)
      .setRectangleDropZone(playerPlayWidth, playerPlayHeight)
      .setName("playPlayer");

    this.input.enableDebug(playerPlayZone, 0xffff00);

    // --- 1. CENTERED PLAY ZONE ---
    const oponentPlayWidth = (this.CARD_WIDTH * 2);
    const oponentPlayHeight = this.CARD_HEIGHT;
    const oponentPlayZone = this.add
      .zone((width - oponentPlayWidth) / 2, (height / 2) - oponentPlayHeight - this.ZONE_PADDING, oponentPlayWidth, oponentPlayHeight)
      .setOrigin(0, 0)
      .setRectangleDropZone(oponentPlayWidth, oponentPlayHeight)
      .setName("playOpponent");

    this.input.enableDebug(oponentPlayZone, 0xffff00);

    // --- 2. ZONA MANO JUGADOR (ABAJO) ---
    const handZone = this.add
      .zone((width - this.HAND_WIDTH) / 2 + this.CARD_WIDTH, height - (this.CARD_HEIGHT / 2) - (height * 0.01), this.HAND_WIDTH, this.CARD_HEIGHT)
      .setOrigin(0, 0)
      .setRectangleDropZone(this.HAND_WIDTH, this.CARD_HEIGHT)
      .setName("hand");

    this.input.enableDebug(handZone, 0xffff00);

    // --- 3. OPPONENT HAND ZONE (Top) ---
    const opponentHandZone = this.add
      .zone((width - this.HAND_WIDTH) / 2, (height * 0.01) - (this.CARD_HEIGHT / 2), this.HAND_WIDTH, this.CARD_HEIGHT)
      .setOrigin(0, 0)
      .setRectangleDropZone(this.HAND_WIDTH, this.CARD_HEIGHT)
      .setName("opponentHand");

    this.input.enableDebug(opponentHandZone, 0xff0000); // Red color for opponent tracking

    const stackZone = this.add
      .zone(((width - (this.CARD_WIDTH * 2)) / 2) + (this.CARD_WIDTH * 2) + this.ZONE_PADDING, (height / 2) - (this.CARD_HEIGHT + this.ZONE_PADDING), this.CARD_WIDTH * 1.5, (this.CARD_HEIGHT * 1.5) + (this.ZONE_PADDING * 2))
      .setOrigin(0, 0)
      .setRectangleDropZone(this.CARD_WIDTH * 1.5, (this.CARD_HEIGHT * 2) + (this.ZONE_PADDING * 2))
      .setName("stack");

    this.input.enableDebug(stackZone, 0xffffff); // Borde blanco para la pila


    this.stackBorderGraphics = this.add.graphics().setDepth(15);

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

    this.equipInitialSetup({ avatar: 'c70', arma: this.arma, armadura: this.armadura, artilugio: this.artilugio })
    this.drawCards(4);
    // for (let i = 0; i < this.STARTING_HAND_SIZE; i++) {
    //   this.drawCard();
    // }

    // for (let i = 1; i <= 5; i++) {
    //   //const data = this.deck.pop();

    //   //const card = this.add.image(0, 0, 'back');
    //   const card = this.add.image(0, 0, 'c' + i + '_500');
    //   const scaleRatio = this.CARD_WIDTH / card.width;
    //   const data = { image: 'c' + i, location: 'hand', scaleRatio: scaleRatio, image_high: 'c' + i + '_500' };
    //   card.setData(data);
    //   card.setScale(scaleRatio);
    //   card.setInteractive({ draggable: true });
    //   //card.input.hitArea.setTo(0, 0, card.width, card.height);
    //   //this.input.enableDebug(card, 0x00ff00);

    //   // card.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
    //   this.hand.push(card);
    // }

    // for (let i = 0; i < this.matchCards.length; i++) {
    //   const cardKey = this.matchCards[i];
    //   const card = this.add.image(0, 0, cardKey + '_500');
    //   const scaleRatio = this.CARD_WIDTH / card.width;
    //   const cardData = {
    //     image: cardKey,
    //     image_high: cardKey + '_500',
    //     location: 'hand',
    //     scaleRatio: scaleRatio
    //   };
    //   card.setData(cardData);
    //   card.setScale(scaleRatio);
    //   //card.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
    //   card.setInteractive({ draggable: true });
    //   //card.input.hitArea.setTo(0, 0, card.width, card.height);
    //   this.hand.push(card);
    // }

    // --- 2. CREAR LA ZONA VISUAL DEL MAZO ---
    const deckX = this.scale.width - (this.CARD_WIDTH / 2) - (this.scale.width * 0.02); // Esquina inferior derecha
    const deckY = this.scale.height - (this.CARD_HEIGHT / 2) - this.CARD_HEIGHT - (this.scale.height * 0.04);
    const discardY = this.scale.height - (this.CARD_HEIGHT / 2) - (this.scale.height * 0.02);

    // Agregamos una imagen que represente el mazo boca abajo
    this.deckVisual = this.add.image(deckX, deckY, 'back');
    this.deckVisual.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
    this.deckVisual.setInteractive({ useHandCursor: true });

    // Sutil efecto visual al pasar el mouse por el mazo
    this.deckVisual.on('pointerover', () => this.deckVisual.setTint(0xdddddd));
    this.deckVisual.on('pointerout', () => this.deckVisual.clearTint());

    // --- 3. ESCUCHAR EL CLIC PARA ROBAR ---
    this.deckVisual.on('pointerdown', () => {
      this.drawCard();
    });

    this.discardVisual = this.add.image(deckX, discardY, 'back'); // O una textura de silueta si tienes
    this.discardVisual.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
    this.discardVisual.setTint(0x444444); // Lo oscurecemos para indicar que está vacío
    this.discardVisual.setAlpha(0.5);    // Opacidad baja inicial
    this.discardVisual.setInteractive({ useHandCursor: true });

    this.discardVisual.on('pointerdown', () => {
      console.log(this.discardPile);
      this.toggleDiscardView();
    })

    // Creamos un único objeto de gráficos para dibujar ambos marcos
    const framesGraphics = this.add.graphics();
    framesGraphics.setDepth(5); // Por debajo de las cartas pero visible sobre el fondo

    // --- 1. BORDE PARA EL MAZO (Color Azul/Cian) ---
    framesGraphics.lineStyle(3, 0x00ffff, 0.8); // Grosor de línea: 3px, Color: Cian, Opacidad: 80%
    // Como las imágenes usan origen (0.5, 0.5), restamos la mitad del ancho/alto para centrar el marco
    framesGraphics.strokeRect(
      deckX - this.CARD_WIDTH / 2 - 2,
      deckY - this.CARD_HEIGHT / 2 - 2,
      this.CARD_WIDTH + 4,
      this.CARD_HEIGHT + 4
    );

    // --- 2. BORDE PARA EL DESCARTE (Color Naranja/Rojo) ---
    framesGraphics.lineStyle(3, 0xffaa00, 0.8); // Grosor de línea: 3px, Color: Naranja, Opacidad: 80%
    framesGraphics.strokeRect(
      deckX - this.CARD_WIDTH / 2 - 2,
      discardY - this.CARD_HEIGHT / 2 - 2,
      this.CARD_WIDTH + 4,
      this.CARD_HEIGHT + 4
    );


    // this.hand.forEach((card) => {
    //   card.setInteractive({ draggable: true });
    //   this.flipFront(card);
    // });

    this.updateHandLayout();
    this.createOpponentHand(this.STARTING_HAND_SIZE);

    // this.input.on('gameobjectdown', (pointer, gameObject) =>{
    //   this.flipBack(gameObject);
    // })

    // Al pasar el mouse por encima de una carta de tu mano
    this.input.on('gameobjectover', (pointer, gameObject) => {
      if (gameObject.getData('object') === 'card') {
        console.log('gameobjectover');
        if (gameObject.getData('isDrawing') !== true) {
          gameObject.setData('depth', gameObject.depth);
          gameObject.setData('isPreview', true)
          gameObject.setScale(1);
          gameObject.setDepth(400);
          ///console.log(gameObject.x + ', ' + gameObject.y);
          const finalX = gameObject.x;
          const finalY = gameObject.y;
          gameObject.setData('origX', finalX);
          gameObject.setData('origY', finalY);
          let drawX = gameObject.x;
          let drawY = gameObject.y;
          if (finalX - (gameObject.width / 2) < 0) {
            drawX = (gameObject.width / 2) + 10;

          } else if (finalX + (gameObject.width / 2) > this.scale.width) {
            drawX = this.scale.width - (gameObject.width / 2) - 10;

          }
          if (finalY + (gameObject.height / 2) > this.scale.height) {
            drawY = this.scale.height - (gameObject.height / 2) - 10;

          } else if (finalY - (gameObject.height / 2) < 0) {
            drawY = (gameObject.height / 2) + 10;

          }
          if (finalX !== drawX) { gameObject.x = drawX; };
          if (finalY !== drawY) { gameObject.y = drawY; };
        }


        // if ((gameObject.getData('location') === 'hand' || gameObject.getData('location') === 'play') && gameObject.getData('isDrawing') !== true) {



        //   // console.log(gameObject.data.values.scaleRatio);
        //   // gameObject.setDepth(30);
        //   // this.tweens.add({
        //   //   targets: gameObject,
        //   //   y: height - (this.CARD_HEIGHT) - (height * 0.20) + (this.CARD_HEIGHT / 2),          // La elevamos 20 píxeles (originalmente está en 410)
        //   //   //x: width / 2, 
        //   //   //y: height / 2, 
        //   //   scale: gameObject.data.values.scaleRatio * 2.5,     // La agrandamos un 5% para dar profundidad
        //   //   //scale: 1,
        //   //   duration: 100,   // Animación rápida y responsiva
        //   //   ease: 'Power1'
        //   // });
        // } else if (gameObject.getData('location') === 'discardPreview') {
        //   gameObject.setDepth(400);
        // } else if (gameObject.getData('location') === 'equipment') {
        //   gameObject.setScale(1);
        //   gameObject.setDepth(400);
        //   console.log(gameObject.x + ', ' + gameObject.y);
        //   const finalX = gameObject.x;
        //   const finalY = gameObject.y;
        //   gameObject.setData('origX', finalX);
        //   gameObject.setData('origY', finalY);
        //   let drawX = gameObject.x;
        //   let drawY = gameObject.y;
        //   if (finalX - (gameObject.width / 2) < 0) {
        //     drawX = (gameObject.width / 2) + 10;

        //   } else if (finalX + (gameObject.width / 2) > this.scale.width) {
        //     drawX = this.scale.width - (gameObject.width / 2) - 10;

        //   }
        //   if (finalY + (gameObject.height / 2) > this.scale.height) {
        //     drawY = this.scale.height - (gameObject.height / 2) - 10;

        //   } else if (finalY - (gameObject.height / 2) < 0) {
        //     drawY = (gameObject.height / 2) + 10;

        //   }
        //   if (finalX !== drawX) { gameObject.x = drawX; };
        //   if (finalY !== drawY) { gameObject.y = drawY; };
        // }
      }
    });

    // Al quitar el mouse de encima de la carta
    this.input.on('gameobjectout', (pointer, gameObject) => {
      if (gameObject.getData('object') === 'card') {
        console.log('gameobjectout');
        if (gameObject.getData('isDrawing') !== true && gameObject.getData('location') !== 'dragging' && gameObject.getData('isPreview') === true) {
          gameObject.setScale(gameObject.getData('scaleRatio'));
          gameObject.setDepth(gameObject.getData('depth'));
          gameObject.setData('isPreview', false)
          gameObject.x = gameObject.getData('origX');
          gameObject.y = gameObject.getData('origY');
        }
        // // Solo restauramos si sigue en la mano y no la estamos arrastrando
        // if (gameObject.getData('location') === 'hand' && gameObject.getData('isDrawing') !== true) {
        //   gameObject.setDepth(gameObject.getData('handDepth'));
        //   this.tweens.add({
        //     targets: gameObject,
        //     y: height - (this.CARD_HEIGHT / 2) - (height * 0.01) + (this.CARD_HEIGHT / 2),          // Regresa a su altura original de la cuadrícula
        //     scale: gameObject.data.values.scaleRatio,        // Regresa a su tamaño original
        //     //scale: 1,
        //     duration: 100,
        //     ease: 'Power1'
        //   });
        //   //this.updateHandLayout();
        // } else if (gameObject.getData('location') === 'discardPreview') {
        //   gameObject.setDepth(gameObject.getData('depth'));
        // } else if (gameObject.getData('location') === 'equipment') {
        //   gameObject.setScale(gameObject.getData('scaleRatio'));
        //   gameObject.setDepth(gameObject.getData(10));
        //   gameObject.x = gameObject.getData('origX');
        //   gameObject.y = gameObject.getData('origY');
        // }
      }
    });

    // // Al pasar el mouse por encima de una carta
    // this.input.on('gameobjectover', (pointer, gameObject) => {
    //   // Tu lógica existente de elevación hover...
    //   if (gameObject.getData('location') === 'hand' && gameObject.depth === 0) {
    //     // this.tweens.add({
    //     //   targets: gameObject,
    //     //   y: this.scale.height - (this.CARD_HEIGHT / 2) - 40,
    //     //   scale: 1.05,
    //     //   duration: 100,
    //     //   ease: 'Power1'
    //     // });

    //     // === NUEVO: MOSTRAR PREVISUALIZACIÓN HD ===
    //     // Obtenemos el nombre de la textura HD que guardamos en el setData
    //     const highResTexture = gameObject.getData('image_high');
    //       this.cardPreview.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);


    //     // Si la carta está boca arriba (su textura actual no es 'back'), mostramos la versión HD
    //     if (gameObject.texture.key !== 'back' && highResTexture) {
    //       this.cardPreview.setTexture(highResTexture);
    //       this.cardPreview.setDisplaySize(this.PREVIEW_WIDTH, this.PREVIEW_HEIGHT);
    //       this.cardPreview.setVisible(true);
    //     }
    //   }
    // });

    // // Al quitar el mouse de encima de la carta
    // this.input.on('gameobjectout', (pointer, gameObject) => {
    //   // Tu lógica existente de restaurar posición...
    //   if (gameObject.getData('location') === 'hand' && gameObject.depth === 0) {
    //     // this.tweens.add({
    //     //   targets: gameObject,
    //     //   y: this.scale.height - (this.CARD_HEIGHT / 2) - 20,
    //     //   scale: 1,
    //     //   duration: 100,
    //     //   ease: 'Power1'
    //     // });

    //     // === NUEVO: OCULTAR PREVISUALIZACIÓN ===
    //     this.cardPreview.setVisible(false);
    //   }
    // });

    this.input.on('dragstart', (pointer, gameObject) => {
      if (gameObject.getData('object') === 'card') {
        console.log('dragstart');
        // Bring the moving card to the very top layer
        //console.log(pointer);
        // gameObject.x = pointer.downX + (this.CARD_WIDTH/2);
        // gameObject.y = pointer.downY + (this.CARD_HEIGHT/2);
        gameObject.setData('depth', gameObject.depth);
        gameObject.x = pointer.downX;
        gameObject.y = pointer.downY;
        gameObject.setDepth(100);
        gameObject.setScale(gameObject.data.values.scaleRatio);
        gameObject.setData('isPreview', false)

        //console.log(pointer.downX + ',' + pointer.downY);
        //gameObject.setScale(1);

        //gameObject.setDisplaySize(this.CARD_WIDTH, this.CARD_HEIGHT);
        // if (this.cardPreview) {
        //   this.cardPreview.setVisible(false);
        // }

        //if (gameObject.getData('location') === 'play') {
        gameObject.setData('originalLocation', gameObject.getData('location'))
        gameObject.setData('location', 'dragging');
        //}
      }
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (gameObject.getData('object') === 'card') {
        console.log('drag');
        // console.log('Drag: ' + dragX + ',' + dragY);
        // console.log('Pointer: ' + pointer.x + ', ' + pointer.y);
        // gameObject.x = dragX;
        // gameObject.y = dragY;

        gameObject.x = pointer.x;
        gameObject.y = pointer.y;
      }
    }
    );

    this.input.on('drop', (pointer, gameObject, dropZone) => {
      if (gameObject.getData('object') === 'card') {
        console.log('drop ' + dropZone.name);
        if (dropZone.name === 'play') {
          // ... your existing code for checking zone fullness and centering cards ...
          const isZoneFull = this.hand.some(card => card.getData('location') === dropZone.name);
          if (isZoneFull) {
            gameObject.setData('location', gameObject.getData('originalLocation'));
            //this.flipBack(gameObject);
            gameObject.setDepth(gameObject.getData('depth'));
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
        else if (this.SLOT_COLORS.hasOwnProperty(dropZone.name)) {

          // 1. Validar si ya hay una carta ocupando este slot específico
          const isSlotFull = this.hand.some(card => card.getData('location') === dropZone.name);

          if (isSlotFull) {
            // RECHAZADO: Regresa a la mano comprimida
            gameObject.setData('location', gameObject.getData('originalLocation'));
            //this.flipBack(gameObject);
            gameObject.setDepth(gameObject.getData('depth'));
            this.updateHandLayout();
            return;
          }

          // ACEPTADO: Centramos la carta perfectamente en el slot especial
          gameObject.x = dropZone.x + (dropZone.width / 2);
          gameObject.y = dropZone.y + (dropZone.height / 2);
          //this.flipFront(gameObject);
          gameObject.setDepth(10);
          gameObject.setData('location', dropZone.name);
          //gameObject.setData('location', 'equipment');

          this.updateHandLayout();
          return; // Finaliza el bloque para este drop
        } 
        else if (dropZone.name === 'stack') {
          // Contamos cuántas cartas ya hay en la pila para encimarla verticalmente
          const cardsInStack = this.hand.filter(card => card.getData('location') === 'stack');

          // Posición base central de la zona de pila
          gameObject.x = dropZone.x + (dropZone.width / 2);
          // Desplazamiento vertical sutil (ej: 25px hacia abajo por cada carta nueva en la pila)
          gameObject.y = dropZone.y + (this.CARD_HEIGHT / 2) + height * 0.01 + (cardsInStack.length * this.CARD_HEIGHT * 0.3);

          //this.flipFront(gameObject);
          gameObject.setDepth(cardsInStack.length); // Capas progresivas en la pila
          gameObject.setData('location', dropZone.name);

          // Dibujamos los marcos de colores correspondientes
          this.redrawStackBorders();
          this.updateHandLayout();
        }

      }
    });



    this.input.on('dragend', (pointer, gameObject, dropped) => {
      if (gameObject.getData('object') === 'card') {
        console.log('dragend');
        if (!dropped) {
          // gameObject.x = gameObject.input.dragStartX;
          // gameObject.y = gameObject.input.dragStartY;
          // //this.flipBack(gameObject);
          // gameObject.setDepth(0);
          // this.updateHandLayout();
          // Return to player's own hand layout
          //this.flipBack(gameObject);

          // this.sendToDiscard(gameObject);
          // this.updateHandLayout();

          gameObject.setDepth(0);
          gameObject.setData('location', gameObject.getData('originalLocation'));

          if (gameObject.getData('location') === 'hand') {

            const index = this.hand.indexOf(gameObject);
            if (index > -1) {
              this.hand.splice(index, 1);
              this.hand.push(gameObject);
            }
            this.updateHandLayout();
          }
        }
      }
    }
    );

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
  width: 1920, //1366
  height: 1080, //768
  backgroundColor: '#898990',
  parent: 'game-container',
  physics: { default: "arcade" },
  pixelArt: false,
  antialias: true,      // Activa el filtro para suavizar los bordes al reducir tamaño
  antialiasGL: true,    // Fuerza el suavizado avanzado si usa WebGL en el navegador
  scene: [DeckSelectScene, GameScene],
  //  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

};

// instantiate the game
const game = new Phaser.Game(config);

