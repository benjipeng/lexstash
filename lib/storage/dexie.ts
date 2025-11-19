import { StorageProvider } from './types';
import { db } from '@/lib/db';
import { Prompt } from '@/types/prompt';

export class DexieStorage implements StorageProvider {
    name: 'local' = 'local';

    async getPrompts(): Promise<Prompt[]> {
        return await db.prompts.orderBy('updatedAt').reverse().toArray();
    }

    async getPrompt(id: string): Promise<Prompt | undefined> {
        return await db.prompts.get(id);
    }

    async savePrompt(prompt: Prompt): Promise<void> {
        await db.prompts.put(prompt);
    }

    async deletePrompt(id: string): Promise<void> {
        await db.prompts.delete(id);
    }

    async importPrompts(prompts: Prompt[]): Promise<void> {
        await db.prompts.bulkPut(prompts);
    }

    async clearAll(): Promise<void> {
        await db.prompts.clear();
    }
}

export const dexieStorage = new DexieStorage();
