export * from "./schema/Card";
export * from "./schema/Player";
export * from "./schema/GameState";

export const GAME_CONSTANTS = {
  MAX_HAND_SIZE: 4,
  STARTING_ENERGY: 4,
  STARTING_HP: 20
};

export class GameEngine {
  constructor() {
    console.log("Nox Æterna Engine Inicializado");
  }
  
}
