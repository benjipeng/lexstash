'use client';

import React, { useState } from 'react';
import { Canvas } from "@/components/builder/Canvas";
import { Sidebar } from "@/components/builder/Sidebar";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { Prompt } from "@/types/prompt";
import { PlusCircle, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/auth-provider";
import { supabaseStorage } from "@/lib/storage/supabase";
import { db } from "@/lib/db";

type ViewState = 'welcome' | 'new' | 'edit';

export default function Home() {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
  const [view, setView] = useState<ViewState>('welcome');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeLibrary, setActiveLibrary] = useState<'local' | 'cloud'>('local');
  const [cloudRefreshKey, setCloudRefreshKey] = useState(0);

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
    setActiveLibrary(library);
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
      if (activeLibrary === 'cloud') {
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
    if (!user) {
      alert("Please sign in to upload prompts.");
      return;
    }

    try {
      // 1. Check if exists
      const existing = await supabaseStorage.getPrompt(prompt.id);

      if (existing) {
        // Simple confirm for now
        const overwrite = window.confirm(
          `A prompt with this ID already exists in the cloud ("${existing.title}").\n\nDo you want to overwrite it and delete your local copy?`
        );
        if (!overwrite) return;
      }

      // 2. Upload
      await supabaseStorage.savePrompt({
        ...prompt,
        updatedAt: Date.now(),
      });

      // 3. Delete Local (Move)
      await db.prompts.delete(prompt.id);

      // 4. Update UI
      setSelectedPrompt(undefined); // Deselect or switch to cloud view?
      setActiveLibrary('cloud'); // Switch to cloud view to show the uploaded prompt
      setView('welcome'); // Or stay in edit mode but load from cloud?
      // Let's go to welcome for now to refresh the sidebar lists

      // Trigger cloud library refresh
      setCloudRefreshKey(prev => prev + 1);

      alert("Prompt uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      // Display the actual error message (e.g., limit error from supabaseStorage)
      const errorMessage = error instanceof Error ? error.message : "Upload failed. Please try again.";
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
        activeLibrary={activeLibrary}
        onLibraryChange={setActiveLibrary}
        cloudRefreshKey={cloudRefreshKey}
      />

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* ... (Mobile Header) ... */}

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
                activeLibrary={activeLibrary}
                onUpload={handleUpload}
                onLibraryChange={setActiveLibrary}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
