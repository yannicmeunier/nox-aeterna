import { Room, Client, CloseCode } from "colyseus";
//import { MyRoomState } from "./schema/MyRoomState.js";
import { GAME_CONSTANTS, GameState, Player, GameEngine } from "@nox-aeterna/engine";

export class MyRoom extends Room {
  maxClients = 2;
  state = new GameState();

  messages = {
    yourMessageType: (client: Client, message: any) => {
      /**
       * Handle "yourMessageType" message.
       */
      console.log(client.sessionId, "sent a message:", message);
    }
  }

  onCreate (options: any) {
    /**
     * Called when a new room is created.
     */
  }

  onJoin (client: Client, options: any) {
    /**
     * Called when a client joins the room.
     */
    console.log(client.sessionId, "joined!");

    const player = new Player();

    player.hp = GAME_CONSTANTS.STARTING_HP;
    player.sessionId = client.sessionId;

    this.state.players.set(client.sessionId, player);

  }

  onLeave (client: Client, code: CloseCode) {
    /**
     * Called when a client leaves the room.
     */
    console.log(client.sessionId, "left!", code);
  }

  onDispose() {
    /**
     * Called when the room is disposed.
     */
    console.log("room", this.roomId, "disposing...");
  }

}
