import { db } from '@/lib/db';
import { supabaseStorage } from '@/lib/storage/supabase';
import { Prompt } from '@/types/prompt';
import { getAllReferences } from '@/lib/graph';
import { cloudEnabled } from '@/lib/features';

export interface UploadResult {
    needsConfirmation: boolean;
    toUpload: Prompt[];
    alreadyInCloud: number;
}

/**
 * Analyze prompt dependency tree and return list of prompts to upload in order.
 * Uses post-order traversal to ensure dependencies are uploaded before dependents.
 * 
 * @param promptId - ID of the prompt to analyze
 * @returns Array of prompt IDs in dependency order (dependencies first)
 */
export async function getDependencyTree(promptId: string): Promise<string[]> {
    const visited = new Set<string>();
    const order: string[] = [];

    async function traverse(id: string) {
        if (visited.has(id)) return;
        visited.add(id);

        const prompt = await db.prompts.get(id);
        if (!prompt) {
            throw new Error(`Referenced prompt not found: ${id}`);
        }

        // Get all references in this prompt
        const refs = getAllReferences(prompt.blocks);

        // Traverse dependencies first (post-order traversal)
        for (const refId of refs) {
            await traverse(refId);
        }

        // Add current prompt after its dependencies
        order.push(id);
    }

    await traverse(promptId);
    return order;
}

/**
 * Analyze prompt and prepare upload with all dependencies.
 * Validates quota and checks for existing cloud prompts.
 * 
 * @param promptId - ID of the prompt to upload
 * @returns Upload result with prompts to upload and confirmation needs
 * @throws Error if quota would be exceeded or references are broken
 */
export async function uploadWithDependencies(promptId: string): Promise<UploadResult> {
    if (!cloudEnabled) {
        throw new Error('Cloud sync is disabled in this build.');
    }
    // 1. Get dependency tree
    const toUpload = await getDependencyTree(promptId);

    // 2. Check which are already in cloud
    const cloudPrompts = await supabaseStorage.getPrompts();
    const alreadyInCloud = new Set(cloudPrompts.map(p => p.id));
    const needUpload = toUpload.filter(id => !alreadyInCloud.has(id));

    // 3. Validate against quota (30 prompts)
    const currentCount = cloudPrompts.length;
    const projectedCount = currentCount + needUpload.length;

    if (projectedCount > 30) {
        const available = 30 - currentCount;
        throw new Error(
            `Cannot upload: This would add ${needUpload.length} prompt(s) ` +
            `(${toUpload.length} total, ${alreadyInCloud.size} already in cloud). ` +
            `You have ${currentCount}/30 prompts. ` +
            `You can only upload ${available} more. ` +
            `Delete at least ${needUpload.length - available} prompt(s) first.`
        );
    }

    // 4. Get full prompt objects for upload
    const promptsToUpload = await Promise.all(
        needUpload.map(id => db.prompts.get(id))
    );

    // Filter out any undefined (shouldn't happen due to earlier check)
    const validPrompts = promptsToUpload.filter((p): p is Prompt => p !== undefined);

    if (validPrompts.length !== needUpload.length) {
        throw new Error('Some referenced prompts are missing from local storage');
    }

    return {
        needsConfirmation: needUpload.length > 1,
        toUpload: validPrompts,
        alreadyInCloud: alreadyInCloud.size,
    };
}

/**
 * Execute the upload after user confirmation.
 * Atomic operation - only deletes local copies after ALL uploads succeed.
 * 
 * @param prompts - Array of prompts to upload (in dependency order)
 * @throws Error if any upload fails (local copies remain intact)
 */
export async function executeUpload(prompts: Prompt[]): Promise<void> {
    if (!cloudEnabled) {
        throw new Error('Cloud sync is disabled in this build.');
    }
    // Upload all prompts first (don't delete local yet)
    for (const prompt of prompts) {
        await supabaseStorage.savePrompt({
            ...prompt,
            updatedAt: Date.now(),
        });
    }

    // Only after ALL uploads succeed, delete local copies
    for (const prompt of prompts) {
        await db.prompts.delete(prompt.id);
    }
}
