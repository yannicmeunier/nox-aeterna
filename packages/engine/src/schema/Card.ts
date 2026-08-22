import { Schema, type } from "@colyseus/schema";

export class Card extends Schema {
  @type("string") id: string;
  @type("string") templateId: string;
  @type("string") name: string;
  
  @type("number") currentAttack: number;
  @type("number") currentHealth: number;
}
