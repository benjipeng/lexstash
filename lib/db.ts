import Dexie, { Table } from 'dexie';
import { Prompt } from '@/types/prompt';

export class LexstashDB extends Dexie {
    prompts!: Table<Prompt>;

    constructor() {
        super('LexstashDB');
        this.version(1).stores({
            prompts: 'id, title, *tags, createdAt, updatedAt'
        });
    }
}

export const db = new LexstashDB();
