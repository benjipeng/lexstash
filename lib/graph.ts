import { db } from '@/lib/db';
import { supabaseStorage } from '@/lib/storage/supabase';
import { Block, Prompt } from '@/types/prompt';

/**
 * Checks if adding a reference to `childId` within `parentId` would create a cycle.
 * Returns true if safe, false if a cycle is detected.
 */
export async function canAddReference(
    parentId: string,
    childId: string,
    library: 'local' | 'cloud' = 'local'
): Promise<boolean> {
    if (parentId === childId) return false;

    const visited = new Set<string>();
    const stack = [childId];

    while (stack.length > 0) {
        const currentId = stack.pop()!;

        if (currentId === parentId) return false; // Cycle detected
        if (visited.has(currentId)) continue;

        visited.add(currentId);

        visited.add(currentId);

        const prompt = library === 'local'
            ? await db.prompts.get(currentId)
            : await supabaseStorage.getPrompt(currentId);

        if (!prompt) continue;

        // Find all references in this prompt
        const references = getAllReferences(prompt.blocks);
        stack.push(...references);
    }

    return true;
}

export function getAllReferences(blocks: Block[]): string[] {
    const refs: string[] = [];

    for (const block of blocks) {
        if (block.type === 'reference' && block.referenceId) {
            refs.push(block.referenceId);
        }
        if (block.children) {
            refs.push(...getAllReferences(block.children));
        }
    }

    return refs;
}
