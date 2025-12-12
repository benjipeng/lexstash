'use client';

import React, { useState, useEffect } from 'react';
import { Block as BlockType, Prompt } from '@/types/prompt';
import { db } from '@/lib/db';
import { Block } from './Block';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DropAnimation,
    MeasuringStrategy,
    pointerWithin,
    rectIntersection,
    getFirstCollision,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Eye, Cloud, HardDrive, UploadCloud } from 'lucide-react';
import { PreviewDialog } from './PreviewDialog';
import { cloudEnabled } from '@/lib/features';

interface CanvasProps {
    prompt?: Prompt;
    onSave: (prompt: Prompt) => void;
    activeLibrary?: 'local' | 'cloud';
    onUpload?: (prompt: Prompt) => void;
    onLibraryChange?: (lib: 'local' | 'cloud') => void;
}

// Helper to find a block by ID in the tree
function findBlock(blocks: BlockType[], id: string): BlockType | undefined {
    for (const block of blocks) {
        if (block.id === id) return block;
        if (block.children) {
            const found = findBlock(block.children, id);
            if (found) return found;
        }
    }
    return undefined;
}

// Helper to find the container (parent array) of a block ID
function findContainer(blocks: BlockType[], id: string): BlockType[] | undefined {
    // Check if the ID is directly in the current blocks array
    if (blocks.some(b => b.id === id)) return blocks;

    for (const block of blocks) {
        // Only search children if they exist
        if (block.children && block.children.length > 0) {
            const found = findContainer(block.children, id);
            if (found) return found;
        }
    }
    return undefined;
}

// Helper to get all IDs in a list (for SortableContext)
function getIds(blocks: BlockType[]): string[] {
    return blocks.map(b => b.id);
}

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

export function Canvas({ prompt, onSave, activeLibrary, onUpload, onLibraryChange }: CanvasProps) {
    const [title, setTitle] = useState('Untitled Prompt');
    const [tags, setTags] = useState<string[]>([]);
    const [blocks, setBlocks] = useState<BlockType[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        if (prompt) {
            setTitle(prompt.title);
            setTags(prompt.tags || []);
            setBlocks(prompt.blocks);
        } else {
            setTitle('Untitled Prompt');
            setTags([]);
            setBlocks([]);
        }
    }, [prompt]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Prevent accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Custom collision detection strategy optimized for nesting
    // We prioritize the pointer being *within* a container
    const collisionDetectionStrategy = (args: any) => {
        // First, look for exact pointer collisions
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) {
            return pointerCollisions;
        }
        // Fallback to rect intersection
        return rectIntersection(args);
    };

    const handleSave = async () => {
        const id = prompt?.id || crypto.randomUUID();
        const promptData: Prompt = {
            id,
            title,
            blocks,
            tags,
            createdAt: prompt?.createdAt || Date.now(),
            updatedAt: Date.now(),
        };
        onSave(promptData);
    };

    // State for the visual drop indicator
    const [dropIndicator, setDropIndicator] = useState<{
        targetId: string;
        type: 'before' | 'after' | 'inside';
    } | null>(null);

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
        setDropIndicator(null);
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            setDropIndicator(null);
            return;
        }

        const overId = over.id as string;
        const overBlock = findBlock(blocks, overId);

        if (!overBlock) {
            setDropIndicator(null);
            return;
        }

        const activeRect = active.rect.current.translated;
        const overRect = over.rect;

        if (!activeRect || !overRect) return;

        const activeCenterY = activeRect.top + activeRect.height / 2;
        const overTop = overRect.top;
        const overBottom = overRect.top + overRect.height;
        const overHeight = overRect.height;

        // Default to 'after' if below center, 'before' if above
        // But for containers, we have an 'inside' zone.

        let newIndicator: { targetId: string; type: 'before' | 'after' | 'inside' } | null = null;

        if (overBlock.type === 'container') {
            // Container Logic:
            // If container is empty or very small, make it easier to drop inside.
            const isEmpty = !overBlock.children || overBlock.children.length === 0;
            const isSmall = overHeight < 50;

            if (isEmpty || isSmall) {
                // For empty/small containers, almost the entire area is "inside"
                // We just leave a tiny buffer for before/after if needed, or just make it all inside.
                // Let's make it all inside for empty containers to be safe.
                newIndicator = { targetId: overId, type: 'inside' };
            } else {
                // Standard Logic for larger containers:
                // Top 25%: Before
                // Bottom 25%: After
                // Middle 50%: Inside

                const topZone = overTop + overHeight * 0.25;
                const bottomZone = overBottom - overHeight * 0.25;

                if (activeCenterY < topZone) {
                    newIndicator = { targetId: overId, type: 'before' };
                } else if (activeCenterY > bottomZone) {
                    newIndicator = { targetId: overId, type: 'after' };
                } else {
                    newIndicator = { targetId: overId, type: 'inside' };
                }
            }
        } else {
            // Text/Reference Logic:
            // Top 50%: Before
            // Bottom 50%: After
            const midPoint = overTop + overHeight * 0.5;
            if (activeCenterY < midPoint) {
                newIndicator = { targetId: overId, type: 'before' };
            } else {
                newIndicator = { targetId: overId, type: 'after' };
            }
        }

        // Filter out no-op moves (redundant indicators)
        if (newIndicator && newIndicator.type !== 'inside') {
            const activeContainer = findContainer(blocks, active.id as string);
            const overContainer = findContainer(blocks, overId);

            if (activeContainer && overContainer && activeContainer === overContainer) {
                const activeIndex = activeContainer.findIndex(b => b.id === active.id);
                const overIndex = activeContainer.findIndex(b => b.id === overId);

                if (newIndicator.type === 'before' && overIndex === activeIndex + 1) {
                    newIndicator = null;
                } else if (newIndicator.type === 'after' && overIndex === activeIndex - 1) {
                    newIndicator = null;
                }
            }
        }

        setDropIndicator(newIndicator);
    }

    // New helper to move item INTO a container (append)
    function moveIntoContainer(
        root: BlockType[],
        activeId: string,
        targetContainerId: string
    ): BlockType[] {
        const newRoot = removeBlockFromTree(root, activeId);

        // Find the item we removed (we need to clone it or find it first)
        // Optimization: find it before removing.
        const itemToMove = findBlock(root, activeId);
        if (!itemToMove) return root;

        // Insert into target container
        return insertIntoContainerChildren(newRoot, targetContainerId, itemToMove);
    }

    function insertIntoContainerChildren(blocks: BlockType[], containerId: string, item: BlockType): BlockType[] {
        return blocks.map(b => {
            if (b.id === containerId) {
                return {
                    ...b,
                    children: [...(b.children || []), item]
                };
            }
            if (b.children) {
                return {
                    ...b,
                    children: insertIntoContainerChildren(b.children, containerId, item)
                };
            }
            return b;
        });
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active } = event;
        const activeId = active.id as string;

        if (dropIndicator) {
            const { targetId, type } = dropIndicator;

            setBlocks((prev) => {
                // 1. Remove active block from its current position
                // We need to find it first to clone it, as removeBlockFromTree might return a new array
                const itemToMove = findBlock(prev, activeId);
                if (!itemToMove) return prev;

                const newRootWithoutItem = removeBlockFromTree(prev, activeId);

                // 2. Insert at new position based on indicator
                if (type === 'inside') {
                    // Insert into container children
                    return insertIntoContainerChildren(newRootWithoutItem, targetId, itemToMove);
                } else {
                    // Insert before or after target
                    // We need to find the target in the NEW tree (it hasn't moved)
                    const targetContainer = findContainer(newRootWithoutItem, targetId);

                    if (!targetContainer) {
                        // If target is root or not found (shouldn't happen if targetId is valid)
                        // If targetId is a top-level item, findContainer returns the root array?
                        // My findContainer returns the array *containing* the item.
                        // If item is at root, it returns the root array.
                        // Let's verify findContainer logic.
                        // If not found, return prev (safety)
                        return prev;
                    }

                    const targetIndex = targetContainer.findIndex(b => b.id === targetId);
                    if (targetIndex === -1) return prev;

                    const insertIndex = type === 'after' ? targetIndex + 1 : targetIndex;

                    // We need to insert into this specific container.
                    // If targetContainer IS the root array, we just splice.
                    // If it's a nested array, we need to update the parent.

                    // Helper: findParentId returns null for root.
                    const parentId = findParentId(newRootWithoutItem, targetContainer);

                    return insertBlockIntoTree(newRootWithoutItem, parentId, itemToMove, insertIndex);
                }
            });
        }

        setActiveId(null);
        setDropIndicator(null);
    }

    // Recursive helper to update a specific container in the tree
    function updateContainer(
        items: BlockType[],
        targetContainer: BlockType[],
        updateFn: (container: BlockType[]) => BlockType[]
    ): BlockType[] {
        if (items === targetContainer) {
            return updateFn(items);
        }

        return items.map(item => {
            if (item.children) {
                // Check if the target container is this child's children array
                if (item.children === targetContainer) {
                    return {
                        ...item,
                        children: updateFn(item.children)
                    };
                }
                return {
                    ...item,
                    children: updateContainer(item.children, targetContainer, updateFn)
                };
            }
            return item;
        });
    }

    function moveBetweenContainers(
        root: BlockType[],
        activeContainer: BlockType[],
        activeId: string,
        overContainer: BlockType[],
        overId: string,
        newIndex: number
    ): BlockType[] {
        // 1. Find the item to move
        const itemToMove = activeContainer.find(i => i.id === activeId);
        if (!itemToMove) return root;

        // 2. Remove from old container
        const newRoot = removeBlockFromTree(root, activeId);

        // 3. Insert into new container
        // We need to find where to insert.
        // If overContainer is the root, we insert into newRoot.
        // If overContainer is a child's children, we need to find that child.

        // However, `overContainer` reference is from the OLD state (`prev` in handleDragOver).
        // We need to find the corresponding container in `newRoot`.
        // This is tricky because `newRoot` is a new object.

        // Strategy: Find the parent ID of the `overContainer` in the old `root`.
        // If `overContainer` is `root`, then parent is null.
        // If `overContainer` is `someBlock.children`, parent is `someBlock.id`.

        const parentId = findParentId(root, overContainer);

        // Let's find the parent ID of the target in the NEW tree.
        // We need to find the `overContainer` in the `newRoot` to get its current reference.
        const newTargetContainer = findContainer(newRoot, overId);
        if (!newTargetContainer) return newRoot; // If the target container somehow disappeared, return the current state.

        const newParentId = findParentId(newRoot, newTargetContainer);

        return insertBlockIntoTree(newRoot, newParentId, itemToMove, newIndex);
    }

    function findParentId(root: BlockType[], container: BlockType[]): string | null {
        if (root === container) return null;
        for (const block of root) {
            if (block.children === container) return block.id;
            if (block.children) {
                const found = findParentId(block.children, container);
                if (found) return found;
            }
        }
        return null;
    }

    function removeBlockFromTree(blocks: BlockType[], id: string): BlockType[] {
        return blocks.filter(b => b.id !== id).map(b => {
            if (b.children) {
                return { ...b, children: removeBlockFromTree(b.children, id) };
            }
            return b;
        });
    }

    function insertBlockIntoTree(blocks: BlockType[], parentId: string | null, item: BlockType, index: number): BlockType[] {
        if (parentId === null) {
            const newBlocks = [...blocks];
            newBlocks.splice(index, 0, item);
            return newBlocks;
        }

        return blocks.map(b => {
            if (b.id === parentId) {
                const newChildren = [...(b.children || [])];
                newChildren.splice(index, 0, item);
                return { ...b, children: newChildren };
            }
            if (b.children) {
                return { ...b, children: insertBlockIntoTree(b.children, parentId, item, index) };
            }
            return b;
        });
    }

    const updateBlock = (id: string, updates: Partial<BlockType>) => {
        setBlocks((prev) => {
            const clone = JSON.parse(JSON.stringify(prev));
            function update(list: BlockType[]) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].id === id) {
                        list[i] = { ...list[i], ...updates };
                        return;
                    }
                    if (list[i].children) update(list[i].children!);
                }
            }
            update(clone);
            return clone;
        });
    };

    const deleteBlock = (id: string) => {
        setBlocks((prev) => {
            const clone = JSON.parse(JSON.stringify(prev));
            function del(list: BlockType[]) {
                const idx = list.findIndex(i => i.id === id);
                if (idx !== -1) {
                    list.splice(idx, 1);
                    return;
                }
                for (const node of list) {
                    if (node.children) del(node.children);
                }
            }
            del(clone);
            return clone;
        });
    };

    const addBlock = (type: 'text' | 'container' | 'reference') => {
        const newBlock: BlockType = {
            id: crypto.randomUUID(),
            type,
            content: type === 'text' ? '' : undefined,
            metadata: type === 'container' ? { tag: 'new_tag' } : undefined,
            children: type === 'container' ? [] : undefined,
        };
        setBlocks([...blocks, newBlock]);
    };

    const activeBlock = activeId ? findBlock(blocks, activeId) : null;

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-3xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
                            placeholder="Untitled Prompt"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs flex items-center gap-1">
                                {tag}
                                <button
                                    onClick={() => setTags(tags.filter(t => t !== tag))}
                                    className="hover:text-destructive"
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            placeholder="+ Add tag"
                            className="text-sm bg-transparent border-none focus:outline-none focus:ring-0 min-w-[60px] p-0 text-muted-foreground"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = e.currentTarget.value.trim();
                                    if (val && !tags.includes(val)) {
                                        setTags([...tags, val]);
                                        e.currentTarget.value = '';
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar pt-1">
                    {cloudEnabled && activeLibrary && (
                        <>
                            <button
                                onClick={() => {
                                    if (!prompt && onLibraryChange) {
                                        onLibraryChange(activeLibrary === 'cloud' ? 'local' : 'cloud');
                                    }
                                }}
                                className={`h-7 flex items-center gap-1.5 px-3 rounded-full text-xs font-medium border transition-colors shrink-0 ${!prompt ? 'cursor-pointer hover:opacity-80' : ''
                                    } ${activeLibrary === 'cloud'
                                        ? 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700'
                                    }`}
                                title={!prompt ? "Click to switch storage" : "Storage location"}
                            >
                                {activeLibrary === 'cloud' ? <Cloud size={14} /> : <HardDrive size={14} />}
                                <span>
                                    {activeLibrary === 'cloud' ? 'Cloud' : 'Local'}
                                </span>
                            </button>
                            <div className="w-px h-4 bg-border mx-1 shrink-0" />
                        </>
                    )}

                    {/* Upload Button */}
                    {cloudEnabled && activeLibrary === 'local' && onUpload && prompt && (
                        <>
                            <button
                                onClick={() => onUpload(prompt)}
                                className="h-7 px-3 text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30 rounded-md shrink-0 flex items-center gap-2 transition-colors text-xs font-medium"
                                title="Upload to Cloud"
                            >
                                <UploadCloud size={14} />
                                <span className="hidden sm:inline">Upload</span>
                            </button>
                            <div className="w-px h-4 bg-border mx-1 shrink-0" />
                        </>
                    )}

                    <button
                        onClick={() => setShowPreview(true)}
                        className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md shrink-0 transition-colors"
                        title="Preview"
                    >
                        <Eye size={16} />
                    </button>

                    <div className="w-px h-4 bg-border mx-1 shrink-0" />

                    <button
                        onClick={handleSave}
                        className="h-7 px-3 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 shrink-0 shadow-sm transition-colors"
                    >
                        Save
                    </button>

                    <div className="w-px h-4 bg-border mx-1 shrink-0" />

                    <div className="flex gap-1 shrink-0 bg-secondary/30 p-1 rounded-lg border border-border/50">
                        <button
                            onClick={() => addBlock('text')}
                            className="h-7 px-3 hover:bg-background hover:shadow-sm rounded-md text-xs font-medium flex items-center gap-1.5 transition-all"
                        >
                            <Plus size={14} />
                            <span>Text</span>
                        </button>
                        <button
                            onClick={() => addBlock('container')}
                            className="h-7 px-3 hover:bg-background hover:shadow-sm rounded-md text-xs font-medium flex items-center gap-1.5 transition-all"
                        >
                            <Plus size={14} />
                            <span>Container</span>
                        </button>
                        <button
                            onClick={() => addBlock('reference')}
                            className="h-7 px-3 hover:bg-background hover:shadow-sm rounded-md text-xs font-medium flex items-center gap-1.5 transition-all"
                        >
                            <Plus size={14} />
                            <span>Ref</span>
                        </button>
                    </div>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={collisionDetectionStrategy}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                measuring={{
                    droppable: {
                        strategy: MeasuringStrategy.Always,
                    },
                }}
            >
                <SortableContext
                    items={blocks.map(b => b.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                        {blocks.map((block) => (
                            <Block
                                key={block.id}
                                block={block}
                                currentPromptId={prompt?.id}
                                activeLibrary={activeLibrary}
                                onUpdate={updateBlock}
                                onDelete={deleteBlock}
                                dropIndicator={dropIndicator}
                            />
                        ))}
                    </div>
                </SortableContext>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeBlock ? (
                        <Block
                            block={activeBlock}
                            currentPromptId={prompt?.id}
                            activeLibrary={activeLibrary}
                            onUpdate={() => { }}
                            onDelete={() => { }}
                            isOverlay
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            <PreviewDialog
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                blocks={blocks}
                activeLibrary={activeLibrary}
            />
        </div>
    );
}
