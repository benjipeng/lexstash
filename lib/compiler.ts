import { db } from '@/lib/db';
import { Block, Prompt } from '@/types/prompt';

export async function compilePrompt(prompt: Prompt, values?: Record<string, string>): Promise<string> {
    return compileBlocks(prompt.blocks, values);
}

export async function compileBlocks(blocks: Block[], values?: Record<string, string>): Promise<string> {
    let output = '';

    for (const block of blocks) {
        if (block.type === 'text') {
            let content = block.content || '';

            // Interpolate variables if values are provided
            if (values) {
                content = content.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
                    const key = variable.trim();
                    return values[key] !== undefined ? values[key] : match;
                });
            }

            output += content + '\n';
        } else if (block.type === 'container') {
            const openTag = block.metadata?.tag ? `<${block.metadata.tag}>` : '';
            const closeTag = block.metadata?.tag ? `</${block.metadata.tag}>` : '';

            const childrenContent = block.children
                ? await compileBlocks(block.children, values)
                : '';

            output += `${openTag}\n${childrenContent}${closeTag}\n`;
        } else if (block.type === 'reference') {
            // In a real app, we'd fetch the referenced prompt here.
            // For now, we'll just put a placeholder or try to fetch if we had async access
            // Since this is a synchronous compilation in this simplified version (or async but no DB access here easily without circular deps)
            // We will assume references are already resolved or just print ID.
            // Ideally, the caller should resolve references before compiling, OR we inject a resolver.
            output += `{{Ref: ${block.referenceId}}}\n`;
        }
    }

    return output.trim();
}

export function extractVariables(blocks: Block[]): string[] {
    const variables = new Set<string>();

    function traverse(currentBlocks: Block[]) {
        for (const block of currentBlocks) {
            if (block.type === 'text' && block.content) {
                const matches = block.content.match(/\{\{([^}]+)\}\}/g);
                if (matches) {
                    matches.forEach(match => {
                        // Remove {{ and }} and trim whitespace
                        const varName = match.slice(2, -2).trim();
                        variables.add(varName);
                    });
                }
            } else if (block.type === 'container' && block.children) {
                traverse(block.children);
            }
        }
    }

    traverse(blocks);
    return Array.from(variables);
}
