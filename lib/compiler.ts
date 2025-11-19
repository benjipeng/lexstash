import { db } from '@/lib/db';
import { Block, Prompt } from '@/types/prompt';

export async function compilePrompt(prompt: Prompt, values?: Record<string, string>): Promise<string> {
    return compileBlocks(prompt.blocks, values);
}

export async function compileBlocks(blocks: Block[], values?: Record<string, string>, isRoot: boolean = true): Promise<string> {
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
                ? await compileBlocks(block.children, values, false)
                : '';

            // Ensure childrenContent ends with a newline if it's not empty, so closeTag starts on a new line
            const formattedChildren = childrenContent.endsWith('\n') || childrenContent === ''
                ? childrenContent
                : childrenContent + '\n';

            output += `${openTag}\n${formattedChildren}${closeTag}\n`;
        } else if (block.type === 'reference') {
            if (block.referenceId) {
                try {
                    const referencedPrompt = await db.prompts.get(block.referenceId);
                    if (referencedPrompt) {
                        const refContent = await compileBlocks(referencedPrompt.blocks, values, false);
                        output += refContent + '\n';
                    } else {
                        output += `{{Ref: ${block.referenceId} (Not Found)}}\n`;
                    }
                } catch (error) {
                    console.error(`Failed to resolve reference ${block.referenceId}`, error);
                    output += `{{Ref: ${block.referenceId} (Error)}}\n`;
                }
            } else {
                output += `{{Ref: Unknown}}\n`;
            }
        }
    }

    return isRoot ? output.trim() : output;
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
