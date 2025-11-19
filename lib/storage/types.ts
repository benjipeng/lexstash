import { Prompt } from '@/types/prompt';

export interface StorageProvider {
    name: 'local' | 'cloud';

    // Read
    getPrompts(userId?: string): Promise<Prompt[]>;
    getPrompt(id: string): Promise<Prompt | undefined>;

    // Write
    savePrompt(prompt: Prompt): Promise<void>;
    deletePrompt(id: string): Promise<void>;

    // Bulk
    importPrompts(prompts: Prompt[]): Promise<void>;
    clearAll(): Promise<void>;
}
