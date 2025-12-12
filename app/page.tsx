'use client';

import React, { useState } from 'react';
import { Canvas } from "@/components/builder/Canvas";
import { Sidebar } from "@/components/builder/Sidebar";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { Prompt } from "@/types/prompt";
import { PlusCircle, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/auth-provider";
import { supabaseStorage } from "@/lib/storage/supabase";
import { db } from "@/lib/db";
import { uploadWithDependencies, executeUpload } from "@/lib/dependency-upload";
import { cloudEnabled } from "@/lib/features";

type ViewState = 'welcome' | 'new' | 'edit';

export default function Home() {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
  const [view, setView] = useState<ViewState>('welcome');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeLibrary, setActiveLibrary] = useState<'local' | 'cloud'>('local');
  const [cloudRefreshKey, setCloudRefreshKey] = useState(0);

  const effectiveLibrary: 'local' | 'cloud' = cloudEnabled ? activeLibrary : 'local';
  const safeSetActiveLibrary = (lib: 'local' | 'cloud') => {
    if (!cloudEnabled) {
      setActiveLibrary('local');
      return;
    }
    setActiveLibrary(lib);
  };

  const handleCreateNew = () => {
    setSelectedPrompt(undefined);
    setView('new');
    setIsMobileMenuOpen(false);
    // Keep the current active library or default to local?
    // Plan says: "Clicking New Prompt -> Creates in the Currently Active Library"
    // So we don't change activeLibrary here.
  };

  const handleSelectPrompt = (prompt: Prompt, library: 'local' | 'cloud') => {
    setSelectedPrompt(prompt);
    safeSetActiveLibrary(library);
    setView('edit');
    setIsMobileMenuOpen(false);
  };

  const handleShowWelcome = () => {
    setSelectedPrompt(undefined);
    setView('welcome');
    setIsMobileMenuOpen(false);
  };


  const handleSave = async (prompt: Prompt) => {
    try {
      if (effectiveLibrary === 'cloud') {
        if (!cloudEnabled) {
          alert("Cloud sync is disabled in this build.");
          return;
        }
        if (!user) {
          alert("Please sign in to save to cloud.");
          return;
        }
        await supabaseStorage.savePrompt({
          ...prompt,
          updatedAt: Date.now(),
        });
      } else {
        await db.prompts.put(prompt);
      }
      // Optional: Show success toast
    } catch (error) {
      console.error("Save failed:", error);
      alert("Save failed. Please try again.");
    }
  };

  const { user } = useAuth();

  const handleUpload = async (prompt: Prompt) => {
    if (!cloudEnabled) {
      alert("Cloud sync is disabled in this build.");
      return;
    }
    if (!user) {
      alert("Please sign in to upload prompts.");
      return;
    }

    try {
      // 1. Analyze dependencies
      const result = await uploadWithDependencies(prompt.id);

      // 2. Confirm if uploading multiple prompts
      if (result.needsConfirmation) {
        const promptList = result.toUpload.map(p => `• ${p.title}`).join('\n');
        const message =
          `This prompt references ${result.toUpload.length - 1} other prompt(s).\n\n` +
          `The following will be uploaded:\n${promptList}` +
          (result.alreadyInCloud > 0
            ? `\n\n(${result.alreadyInCloud} referenced prompt(s) already in cloud)`
            : '') +
          `\n\nContinue?`;

        if (!window.confirm(message)) return;
      }

      // 3. Execute upload (atomic - all or nothing)
      await executeUpload(result.toUpload);

      // 4. Update UI
      setSelectedPrompt(undefined);
      safeSetActiveLibrary('cloud');
      setView('welcome');
      setCloudRefreshKey(prev => prev + 1);

      const count = result.toUpload.length;
      alert(`Successfully uploaded ${count} prompt${count > 1 ? 's' : ''}!`);
    } catch (error) {
      console.error("Upload failed:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Upload failed. Please try again.";
      alert(errorMessage);
    }
  };


  return (
    <main className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar
        className="hidden md:flex"
        onSelectPrompt={handleSelectPrompt}
        onCreateNew={handleCreateNew}
        onShowWelcome={handleShowWelcome}
        activeLibrary={effectiveLibrary}
        onLibraryChange={safeSetActiveLibrary}
        cloudRefreshKey={cloudRefreshKey}
      />

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden md:hidden">
        {/* Shared Sheet for Sidebar */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar
              className="w-full border-none"
              onSelectPrompt={handleSelectPrompt}
              onCreateNew={handleCreateNew}
              onShowWelcome={handleShowWelcome}
              activeLibrary={effectiveLibrary}
              onLibraryChange={safeSetActiveLibrary}
              cloudRefreshKey={cloudRefreshKey}
            />
          </SheetContent>
        </Sheet>

        {view === 'welcome' ? (
          <div className="relative flex-1 flex flex-col">
            <div className="absolute top-4 left-4 z-10">
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={20} />
              </Button>
            </div>
            <WelcomeScreen onCreateNew={handleCreateNew} />
          </div>
        ) : (
          <>
            <div className="h-14 border-b flex items-center px-4 justify-between bg-card/50 backdrop-blur shrink-0">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setIsMobileMenuOpen(true)}>
                  <Menu size={20} />
                </Button>
                <div className="text-sm text-muted-foreground font-medium">
                  {view === 'edit' && selectedPrompt ? 'Editing Prompt' : 'New Prompt'}
                </div>
              </div>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <PlusCircle size={16} />
                <span className="hidden sm:inline">New Prompt</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <Canvas
                key={selectedPrompt?.id || 'new'}
                prompt={selectedPrompt}
                onSave={handleSave}
                activeLibrary={effectiveLibrary}
                onUpload={cloudEnabled ? handleUpload : undefined}
                onLibraryChange={safeSetActiveLibrary}
              />
            </div>
          </>
        )}
      </div>

      {/* Desktop Content (Canvas only, Sidebar is separate) */}
      <div className="hidden md:flex flex-1 flex-col h-screen overflow-hidden">
        {view === 'welcome' ? (
          <WelcomeScreen onCreateNew={handleCreateNew} />
        ) : (
          <>
            <div className="h-14 border-b flex items-center px-6 justify-between bg-card/50 backdrop-blur shrink-0">
              <div className="text-sm text-muted-foreground">
                {view === 'edit' && selectedPrompt ? 'Editing Prompt' : 'New Prompt'}
              </div>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <PlusCircle size={16} />
                New Prompt
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <Canvas
                key={selectedPrompt?.id || 'new'}
                prompt={selectedPrompt}
                onSave={handleSave}
                activeLibrary={effectiveLibrary}
                onUpload={cloudEnabled ? handleUpload : undefined}
                onLibraryChange={safeSetActiveLibrary}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
