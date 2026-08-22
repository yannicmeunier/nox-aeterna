"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const schema_1 = require("@colyseus/schema");
const Card_1 = require("./Card");
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        // Zonas de Equipo que inician directamente en mesa
        this.avatar = new Card_1.Card();
        this.weapon = new Card_1.Card();
        this.armor = new Card_1.Card();
        this.gadget = new Card_1.Card();
        // Colecciones dinámicas
        this.hand = new schema_1.ArraySchema();
        this.boardTokens = new schema_1.ArraySchema();
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("string")
], Player.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "hp", void 0);
__decorate([
    (0, schema_1.type)(Card_1.Card)
], Player.prototype, "avatar", void 0);
__decorate([
    (0, schema_1.type)(Card_1.Card)
], Player.prototype, "weapon", void 0);
__decorate([
    (0, schema_1.type)(Card_1.Card)
], Player.prototype, "armor", void 0);
__decorate([
    (0, schema_1.type)(Card_1.Card)
], Player.prototype, "gadget", void 0);
__decorate([
    (0, schema_1.type)([Card_1.Card])
], Player.prototype, "hand", void 0);
__decorate([
    (0, schema_1.type)([Card_1.Card])
], Player.prototype, "boardTokens", void 0);
__decorate([
    (0, schema_1.type)("number")
], Player.prototype, "deckSize", void 0);
