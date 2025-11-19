'use client';

import React, { useState } from 'react';
import { Canvas } from "@/components/builder/Canvas";
import { Sidebar } from "@/components/builder/Sidebar";
import { Prompt } from "@/types/prompt";
import { PlusCircle } from "lucide-react";

export default function Home() {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
  // Force re-render of Canvas when creating new prompt if needed, or just pass undefined

  const handleCreateNew = () => {
    setSelectedPrompt(undefined);
  };

  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
  };

  const handleSave = () => {
    // Refresh logic if needed, but Sidebar uses liveQuery so it should update automatically
    // We might want to keep the selected prompt updated if we just saved it for the first time
    // For now, simple callback
  };

  return (
    <main className="flex min-h-screen bg-background text-foreground">
      <Sidebar onSelectPrompt={handleSelectPrompt} />

      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b flex items-center px-6 justify-between bg-card/50 backdrop-blur">
          <div className="text-sm text-muted-foreground">
            {selectedPrompt ? 'Editing Prompt' : 'New Prompt'}
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            <PlusCircle size={16} />
            New Prompt
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Key ensures Canvas resets state when switching prompts */}
          <Canvas
            key={selectedPrompt?.id || 'new'}
            prompt={selectedPrompt}
            onSave={handleSave}
          />
        </div>
      </div>
    </main>
  );
}
