import { StorageProvider } from './types';
import { requireSupabase } from '@/lib/supabase/client';
import { cloudEnabled } from '@/lib/features';
import { Prompt } from '@/types/prompt';

const CLOUD_PROMPT_LIMIT = 30;

type SupabasePromptRow = {
    id: string;
    title: string;
    description?: string | null;
    tags?: string[] | null;
    blocks?: Prompt['blocks'] | null;
    created_at: string;
    updated_at: string;
};

export class SupabaseStorage implements StorageProvider {
    name = 'cloud' as const;
    private get client() {
        if (!cloudEnabled) {
            throw new Error('Cloud sync is disabled in this build.');
        }
        return requireSupabase();
    }

    async getPrompts(userId?: string): Promise<Prompt[]> {
        // If userId is provided, we could filter by it, but RLS handles visibility mostly.
        // However, for "My Prompts" vs "Public Prompts", we might need filters.
        // For now, let's just fetch all prompts visible to the user (RLS applied).

        const { data, error } = await this.client
            .from('prompts')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return data.map(this.mapToPrompt);
    }

    async getPrompt(id: string): Promise<Prompt | undefined> {
        const { data, error } = await this.client
            .from('prompts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return undefined;
        return this.mapToPrompt(data);
    }

    async savePrompt(prompt: Prompt): Promise<void> {
        // We need the current user ID to save
        const { data: { user } } = await this.client.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        // Check if this is a new prompt (INSERT) or update (UPDATE)
        const existingPrompts = await this.getPrompts();
        const isUpdate = existingPrompts.some(p => p.id === prompt.id);

        // Only check limit for new prompts (not updates)
        if (!isUpdate && existingPrompts.length >= CLOUD_PROMPT_LIMIT) {
            throw new Error(
                `Cloud library limit reached (${CLOUD_PROMPT_LIMIT} prompts max). Delete some prompts to upload more.`
            );
        }

        const { error } = await this.client
            .from('prompts')
            .upsert({
                id: prompt.id,
                user_id: user.id,
                title: prompt.title,
                description: prompt.description,
                tags: prompt.tags,
                blocks: prompt.blocks, // JSONB handles this automatically
                updated_at: new Date().toISOString(),
                // created_at is handled by default on insert, but we should preserve it if it exists?
                // Actually, prompt.createdAt is a number (timestamp). Postgres wants ISO string.
                created_at: new Date(prompt.createdAt).toISOString()
            });

        if (error) throw error;
    }

    async deletePrompt(id: string): Promise<void> {
        const { error } = await this.client
            .from('prompts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async importPrompts(prompts: Prompt[]): Promise<void> {
        // Bulk insert
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Check limit before importing
        const existingPrompts = await this.getPrompts();
        const newPrompts = prompts.filter(p => !existingPrompts.some(existing => existing.id === p.id));
        const projectedTotal = existingPrompts.length + newPrompts.length;

        if (projectedTotal > CLOUD_PROMPT_LIMIT) {
            const available = CLOUD_PROMPT_LIMIT - existingPrompts.length;
            const attempting = newPrompts.length;
            throw new Error(
                `Cannot import ${attempting} prompt(s). You have ${existingPrompts.length}/${CLOUD_PROMPT_LIMIT} prompts. ` +
                `You can only import ${available} more. Delete at least ${attempting - available} prompt(s) first.`
            );
        }

        const rows = prompts.map(p => ({
            id: p.id,
            user_id: user.id,
            title: p.title,
            description: p.description,
            tags: p.tags,
            blocks: p.blocks,
            created_at: new Date(p.createdAt).toISOString(),
            updated_at: new Date(p.updatedAt).toISOString()
        }));

        const { error } = await this.client
            .from('prompts')
            .upsert(rows);

        if (error) throw error;
    }

    async clearAll(): Promise<void> {
        // Delete all prompts for this user (RLS will restrict to own prompts)
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await this.client
            .from('prompts')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;
    }

    private mapToPrompt(row: SupabasePromptRow): Prompt {
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            tags: row.tags || [],
            blocks: row.blocks || [],
            createdAt: new Date(row.created_at).getTime(),
            updatedAt: new Date(row.updated_at).getTime()
        };
    }
}

export const supabaseStorage = new SupabaseStorage();
