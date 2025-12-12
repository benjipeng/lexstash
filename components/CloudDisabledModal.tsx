'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

interface CloudDisabledModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CloudDisabledModal({ isOpen, onClose }: CloudDisabledModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Cloud Sync Disabled</DialogTitle>
                    <DialogDescription>
                        This build is running in local‑only mode. Your prompts are stored in your browser and never leave your device.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 text-sm">
                    <p>To enable cloud sync and Google sign‑in:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>
                            Set <code className="px-1">NEXT_PUBLIC_ENABLE_CLOUD=true</code> in your build environment (for GitHub Pages, edit your workflow).
                        </li>
                        <li>
                            Provide <code className="px-1">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
                        </li>
                        <li>
                            Rebuild and redeploy — static exports read env flags at build time.
                        </li>
                    </ol>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

