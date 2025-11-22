import React, { useState, useEffect } from 'react';
import { Block as BlockType } from '@/types/prompt';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { canAddReference } from '@/lib/graph';
import { supabaseStorage } from '@/lib/storage/supabase';
import { Prompt } from '@/types/prompt';

interface BlockProps {
    block: BlockType;
    currentPromptId?: string;
    activeLibrary?: 'local' | 'cloud';
    onUpdate: (id: string, updates: Partial<BlockType>) => void;
    onDelete: (id: string) => void;
    depth?: number;
    isOverlay?: boolean;
    dropIndicator?: {
        targetId: string;
        type: 'before' | 'after' | 'inside';
    } | null;
}

export function Block({ block, currentPromptId, activeLibrary = 'local', onUpdate, onDelete, depth = 0, isOverlay, dropIndicator }: BlockProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isValidReference, setIsValidReference] = useState(true);

    useEffect(() => {
        if (block.type === 'reference' && block.referenceId && currentPromptId) {
            canAddReference(currentPromptId, block.referenceId).then(setIsValidReference);
        } else {
            setIsValidReference(true);
        }
    }, [block.referenceId, currentPromptId, block.type]);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id, data: { type: block.type, block } });

    // Fetch prompts from appropriate storage
    const localPrompts = useLiveQuery(() => db.prompts.toArray());
    const [cloudPrompts, setCloudPrompts] = useState<Prompt[]>([]);
    const [error, setError] = React.useState<string | null>(null);

    // Load cloud prompts when editing a cloud prompt
    useEffect(() => {
        if (activeLibrary === 'cloud') {
            supabaseStorage.getPrompts().then(setCloudPrompts).catch(err => {
                console.error('Failed to load cloud prompts:', err);
                setCloudPrompts([]);
            });
        }
    }, [activeLibrary]);

    // Use prompts from the active library
    const allPrompts = activeLibrary === 'cloud' ? cloudPrompts : (localPrompts || []);

    const handleReferenceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const refId = e.target.value;
        if (!refId) {
            onUpdate(block.id, { referenceId: undefined });
            return;
        }

        if (currentPromptId) {
            const isSafe = await canAddReference(currentPromptId, refId);
            if (!isSafe) {
                setError('Circular dependency detected! Cannot add this reference.');
                return;
            }
        }

        setError(null);
        onUpdate(block.id, { referenceId: refId });
    };

    const style = {
        marginLeft: `${depth * 20}px`,
    };

    // Determine visual indicators
    const isTarget = dropIndicator?.targetId === block.id;
    const showTopLine = isTarget && dropIndicator?.type === 'before';
    const showBottomLine = isTarget && dropIndicator?.type === 'after';
    const showInsideHighlight = isTarget && dropIndicator?.type === 'inside';

    if (isOverlay) {
        return (
            <div className={cn(
                "flex items-start gap-2 p-2 mb-2 rounded-md border bg-card text-card-foreground shadow-xl cursor-grabbing",
                block.type === 'container' && "border-primary/20 bg-primary/5"
            )}>
                <div className="mt-1">
                    <GripVertical size={16} />
                </div>
                <div className="flex-1 font-medium truncate max-w-[200px]">
                    {block.type === 'text'
                        ? (block.content || 'Empty text block')
                        : block.type === 'container'
                            ? `<${block.metadata?.tag || 'container'}>`
                            : `Ref: ${block.referenceId || 'Unknown'}`
                    }
                </div>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className="relative group">
            {/* Drop Indicators */}
            {showTopLine && (
                <div className="absolute -top-1 left-0 right-0 h-1 bg-primary rounded-full z-10 pointer-events-none" />
            )}

            <div className={cn(
                "flex items-start gap-2 p-2 mb-2 rounded-md border bg-card text-card-foreground shadow-sm transition-all duration-200 ease-in-out", // Added transition
                block.type === 'container' && "border-primary/20 bg-primary/5",
                showInsideHighlight && "ring-2 ring-primary ring-inset bg-primary/10 pb-8", // Added pb-8 for expansion
                isDragging && "opacity-50 border-dashed border-primary/50 bg-transparent shadow-none"
            )}>
                <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                    <GripVertical size={16} />
                </div>

                <div className="flex-1 space-y-2">
                    {block.type === 'text' && (
                        <textarea
                            ref={(el) => {
                                if (el) {
                                    el.style.height = 'auto';
                                    el.style.height = el.scrollHeight + 'px';
                                }
                            }}
                            className="w-full min-h-[40px] p-2 rounded bg-transparent border-none focus:ring-0 resize-none overflow-hidden leading-relaxed"
                            value={block.content || ''}
                            onChange={(e) => {
                                onUpdate(block.id, { content: e.target.value });
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            rows={1}
                            placeholder="Enter text..."
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    )}

                    {block.type === 'container' && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground">&lt;</span>
                                <input
                                    type="text"
                                    className="bg-transparent border-none focus:ring-0 p-0 h-auto font-mono text-sm font-bold w-full"
                                    value={block.metadata?.tag || ''}
                                    onChange={(e) => onUpdate(block.id, { metadata: { ...block.metadata, tag: e.target.value } })}
                                    placeholder="tag_name"
                                    onPointerDown={(e) => e.stopPropagation()}
                                />
                                <span className="text-xs font-mono text-muted-foreground">&gt;</span>
                            </div>

                            {/* Recursive Children */}
                            {block.children && (
                                <SortableContext items={block.children.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                    <div className="pl-4 border-l-2 border-border/50 min-h-[20px]">
                                        {block.children.length === 0 && (
                                            <div className="text-xs text-muted-foreground italic p-2">
                                                Drop items here
                                            </div>
                                        )}
                                        {block.children.map((child) => (
                                            <Block
                                                key={child.id}
                                                block={child}
                                                currentPromptId={currentPromptId}
                                                activeLibrary={activeLibrary}
                                                onUpdate={onUpdate}
                                                onDelete={onDelete}
                                                dropIndicator={dropIndicator}
                                                depth={depth + 1}
                                            />
                                        ))}
                                        {/* Show insertion line at the bottom if dropping inside */}
                                        {showInsideHighlight && (
                                            <div className="h-1 bg-primary rounded-full mt-1" />
                                        )}
                                    </div>
                                </SortableContext>
                            )}

                            <div className="text-xs font-mono text-muted-foreground">
                                &lt;/{block.metadata?.tag || 'container'}&gt;
                            </div>
                        </div>
                    )}

                    {block.type === 'reference' && (
                        <div className="p-2 bg-muted/50 rounded border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold uppercase text-muted-foreground">Reference</span>
                                <select
                                    className="flex-1 bg-transparent text-sm border-none focus:ring-0 cursor-pointer"
                                    value={block.referenceId || ''}
                                    onChange={handleReferenceChange}
                                >
                                    <option value="">Select a prompt...</option>
                                    {allPrompts?.filter(p => p.id !== currentPromptId).map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                                {isValidReference ? (
                                    <span className="text-xs text-green-500">Valid</span>
                                ) : (
                                    <span className="text-xs text-red-500">Cycle Detected</span>
                                )}
                            </div>
                            {error && (
                                <div className="text-xs text-destructive font-medium px-2">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => onDelete(block.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {showBottomLine && (
                <div className="absolute -bottom-1 left-0 right-0 h-1 bg-primary rounded-full z-10 pointer-events-none" />
            )}
        </div>
    );
}
