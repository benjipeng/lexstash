export type BlockType = 'text' | 'container' | 'reference';

export interface Block {
    id: string;
    type: BlockType;
    content?: string; // For text blocks
    metadata?: Record<string, any>; // For container tags (e.g., { tag: "xml", name: "system_prompt" })
    children?: Block[]; // For containers
    referenceId?: string; // For reference blocks (pointing to another Prompt ID)
}

export interface Prompt {
    id: string;
    title: string;
    description?: string;
    tags: string[];
    blocks: Block[];
    createdAt: number;
    updatedAt: number;
}
