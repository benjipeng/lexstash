'use client';

import React, { useState } from 'react';
import { Canvas } from "@/components/builder/Canvas";
import { Sidebar } from "@/components/builder/Sidebar";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { Prompt } from "@/types/prompt";
import { PlusCircle } from "lucide-react";

type ViewState = 'welcome' | 'new' | 'edit';

export default function Home() {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
  const [view, setView] = useState<ViewState>('welcome');

  const handleCreateNew = () => {
    setSelectedPrompt(undefined);
    setView('new');
  };

  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setView('edit');
  };

  const handleSave = () => {
    // Refresh logic if needed
  };

  return (
    <main className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        onSelectPrompt={handleSelectPrompt}
        onCreateNew={handleCreateNew}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
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
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
