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
                    <DialogTitle>Local‑Only Mode</DialogTitle>
                    <DialogDescription>
                        Cloud sync and Google sign‑in are turned off in this build. Your prompts stay in your browser and never leave your device.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-sm">
                    <div>
                        <p className="font-medium mb-2">Enable cloud sync</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>
                                Set <code className="px-1">NEXT_PUBLIC_ENABLE_CLOUD=true</code> in your build environment.
                                <div className="text-xs text-muted-foreground mt-1">
                                    Local dev: add it to <code className="px-1">.env.local</code> and restart <code className="px-1">npm run dev</code>.
                                    GitHub Pages: set an Actions variable and redeploy.
                                </div>
                            </li>
                            <li>
                                Provide your Supabase keys:
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li><code className="px-1">NEXT_PUBLIC_SUPABASE_URL</code></li>
                                    <li><code className="px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                                </ul>
                            </li>
                            <li>
                                Rebuild and redeploy. Static exports read env flags at build time.
                            </li>
                        </ol>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
