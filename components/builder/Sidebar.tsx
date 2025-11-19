'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { Prompt } from '@/types/prompt';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText, Search } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Logo } from '@/components/Logo';

interface SidebarProps {
    onSelectPrompt: (prompt: Prompt) => void;
}

export function Sidebar({ onSelectPrompt }: SidebarProps) {
    const [search, setSearch] = useState('');

    // Live query to automatically update when DB changes
    const prompts = useLiveQuery(
        () => db.prompts
            .orderBy('updatedAt')
            .reverse()
            .filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
            .toArray(),
        [search]
    );

    return (
        <div className="w-64 border-r bg-muted/10 flex flex-col h-screen sticky top-0">
            <div className="p-4 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Logo size={28} />
                    <h1 className="font-bold text-xl tracking-tight">Lexstash</h1>
                </div>
                <ModeToggle />
            </div>
            <div className="p-4 border-b">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search prompts..."
                        className="w-full pl-8 pr-2 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {prompts?.map((prompt) => (
                    <button
                        key={prompt.id}
                        onClick={() => onSelectPrompt(prompt)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground flex items-center gap-2 group transition-colors"
                    >
                        <FileText size={16} className="text-muted-foreground group-hover:text-foreground" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{prompt.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                                {new Date(prompt.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    </button>
                ))}

                {prompts?.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        No prompts found.
                    </div>
                )}
            </div>

            <div className="p-4 border-t">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Theme</span>
                    <ModeToggle />
                </div>
            </div>
        </div>
    );
}
