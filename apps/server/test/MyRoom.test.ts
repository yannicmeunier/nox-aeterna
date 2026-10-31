import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { GAME_CONSTANTS } from "@nox-aeterna/engine";

// import your "app.config.ts" file here.
import appConfig from "../src/app.config.js";
import { MyRoom } from "../src/rooms/MyRoom.js";

describe("testing your Colyseus app", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  before(async () => colyseus = await boot(appConfig));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("connecting into a room", async () => {
    // `room` is the server-side Room instance reference.
    const room = await colyseus.createRoom<MyRoom>("my_room", {});

    // `client1` is the client-side `Room` instance reference (same as JavaScript SDK)
    const client1 = await colyseus.connectTo(room);

    // make your assertions
    assert.strictEqual(client1.sessionId, room.clients[0].sessionId);

    // wait for the initial state to be delivered to the client
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("timed out waiting for the client state to sync")),
        3000
      );
      client1.onStateChange.once(() => {
        clearTimeout(timeout);
        resolve();
      });
    });

    const player = client1.state.players.get(client1.sessionId);

    assert.ok(player, "the joined player should exist in the state");
    assert.strictEqual(player.sessionId, client1.sessionId);
    assert.strictEqual(player.hp, GAME_CONSTANTS.STARTING_HP);
    assert.deepStrictEqual(room.state.toJSON(), client1.state.toJSON());
  });
});
