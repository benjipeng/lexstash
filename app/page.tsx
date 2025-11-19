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

type ViewState = 'welcome' | 'new' | 'edit';

export default function Home() {
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
  const [view, setView] = useState<ViewState>('welcome');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCreateNew = () => {
    setSelectedPrompt(undefined);
    setView('new');
    setIsMobileMenuOpen(false);
  };

  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setView('edit');
    setIsMobileMenuOpen(false);
  };

  const handleSave = () => {
    // Refresh logic if needed
  };

  return (
    <main className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar
        className="hidden md:flex"
        onSelectPrompt={handleSelectPrompt}
        onCreateNew={handleCreateNew}
      />

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden h-14 border-b flex items-center px-4 justify-between bg-background shrink-0">
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <Sidebar
                  className="w-full h-full border-none"
                  onSelectPrompt={handleSelectPrompt}
                  onCreateNew={handleCreateNew}
                />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Logo size={24} />
              <span className="font-bold text-lg tracking-tight">Lexstash</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCreateNew}>
            <PlusCircle size={20} />
          </Button>
        </div>

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
