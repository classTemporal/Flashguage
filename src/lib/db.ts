import Dexie, { type EntityTable, type Table } from "dexie";

export interface Card {
  id: string;
  front: string;
  back: string;
  tags: string[];
  source: string;
  media?: string;
  deckId: string;
  synced: boolean;
  updatedAt: string;
}

export interface Review {
  id: string;
  cardId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  lastReview?: string;
  synced: boolean;
  updatedAt: string;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  synced: boolean;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  action: "create" | "update" | "delete";
  entity: "card" | "review" | "deck";
  data: unknown;
  timestamp: number;
}

const db = new Dexie("english-flashcards-db") as Dexie & {
  cards: Table<Card>;
  reviews: Table<Review>;
  decks: Table<Deck>;
  syncQueue: Table<SyncQueueItem>;
};

db.version(1).stores({
  cards: "id, deckId, synced, updatedAt",
  reviews: "id, cardId, synced, updatedAt",
  decks: "id, synced, updatedAt",
  syncQueue: "id, entity, timestamp, synced",
});

export { db };
