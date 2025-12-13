'use client';

import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { db } from '@/lib/db';
import { Prompt } from '@/types/prompt';
import { Download, Upload, Trash2, AlertTriangle, FileJson } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface DataManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DataManagementModal({ isOpen, onClose }: DataManagementModalProps) {
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get stats for the UI
    const promptCount = useLiveQuery(() => db.prompts.count(), []) || 0;

    const handleExportAll = async () => {
        try {
            const allPrompts = await db.prompts.toArray();
            const dataStr = JSON.stringify(allPrompts, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `lexstash-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export data.');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate data structure (basic check)
            const promptsToImport = Array.isArray(data) ? data : [data];
            const validPrompts = promptsToImport.filter((p: any) => p.id && p.title && p.blocks);

            if (validPrompts.length === 0) {
                throw new Error('No valid prompts found in file.');
            }

            let importedCount = 0;
            let skippedCount = 0;

            for (const prompt of validPrompts) {
                const exists = await db.prompts.get(prompt.id);

                if (exists) {
                    // Simple conflict resolution: Ask user or just skip/overwrite?
                    // For MVP, let's auto-generate a new ID to avoid overwrites unless identical
                    // Actually, safer to just import as copy with new ID
                    const newId = crypto.randomUUID();
                    const newPrompt = {
                        ...prompt,
                        id: newId,
                        title: `${prompt.title} (Imported)`,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    };
                    await db.prompts.add(newPrompt);
                    importedCount++;
                } else {
                    await db.prompts.add(prompt);
                    importedCount++;
                }
            }

            alert(`Successfully imported ${importedCount} prompts.`);
            onClose();
        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import file. Invalid format?');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleClearAll = async () => {
        if (confirm('Are you sure? This will delete ALL local prompts. This action cannot be undone.')) {
            if (confirm('Really sure? This is your last chance.')) {
                await db.prompts.clear();
                onClose();
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Data Management</DialogTitle>
                    <DialogDescription>
                        Manage your local prompt library. Your data is stored in your browser.
                        <span className="block mt-1 text-xs">
                            DevTools: IndexedDB → LexstashDB → prompts
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-background rounded-md border">
                                <FileJson className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-medium">Local Library</h4>
                                <p className="text-xs text-muted-foreground">{promptCount} prompts stored</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={handleExportAll}>
                            <Download className="w-5 h-5" />
                            <span>Export Backup</span>
                        </Button>

                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={handleImportClick} disabled={importing}>
                            <Upload className="w-5 h-5" />
                            <span>{importing ? 'Importing...' : 'Import Backup'}</span>
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".json"
                            onChange={handleFileChange}
                        />
                    </div>

                    <div className="pt-4 border-t mt-2">
                        <Button variant="destructive" className="w-full gap-2" onClick={handleClearAll}>
                            <Trash2 className="w-4 h-4" />
                            Clear All Data
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Warning: This action is irreversible.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
