import { Schema, type, ArraySchema } from "@colyseus/schema";
import { Card } from "./Card";

export class Player extends Schema {
  @type("string") sessionId: string;
  @type("number") hp: number;

  // Zonas de Equipo que inician directamente en mesa
  @type(Card) avatar: Card = new Card();
  @type(Card) weapon: Card = new Card();
  @type(Card) armor: Card = new Card();
  @type(Card) gadget: Card = new Card();

  // Colecciones dinámicas
  @type([Card]) hand = new ArraySchema<Card>();
  @type([Card]) boardTokens = new ArraySchema<Card>();
  
  @type("number") deckSize: number; 
}
