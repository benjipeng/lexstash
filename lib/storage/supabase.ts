import { StorageProvider } from './types';
import { createClient } from '@/lib/supabase/client';
import { Prompt } from '@/types/prompt';

export class SupabaseStorage implements StorageProvider {
    name: 'cloud' = 'cloud';
    private supabase = createClient();

    async getPrompts(userId?: string): Promise<Prompt[]> {
        // If userId is provided, we could filter by it, but RLS handles visibility mostly.
        // However, for "My Prompts" vs "Public Prompts", we might need filters.
        // For now, let's just fetch all prompts visible to the user (RLS applied).

        const { data, error } = await this.supabase
            .from('prompts')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return data.map(this.mapToPrompt);
    }

    async getPrompt(id: string): Promise<Prompt | undefined> {
        const { data, error } = await this.supabase
            .from('prompts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return undefined;
        return this.mapToPrompt(data);
    }

    async savePrompt(prompt: Prompt): Promise<void> {
        // We need the current user ID to save
        const { data: { user } } = await this.supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        const { error } = await this.supabase
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
        const { error } = await this.supabase
            .from('prompts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async importPrompts(prompts: Prompt[]): Promise<void> {
        // Bulk insert
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

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

        const { error } = await this.supabase
            .from('prompts')
            .upsert(rows);

        if (error) throw error;
    }

    async clearAll(): Promise<void> {
        // Delete all prompts for this user (RLS will restrict to own prompts)
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await this.supabase
            .from('prompts')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;
    }

    private mapToPrompt(row: any): Prompt {
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
