import React from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { PlusCircle, Layers, Variable, Zap } from 'lucide-react';

interface WelcomeScreenProps {
    onCreateNew: () => void;
}

export function WelcomeScreen({ onCreateNew }: WelcomeScreenProps) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5 animate-in fade-in duration-500">
            <div className="max-w-md space-y-8">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-6 bg-background rounded-2xl shadow-sm border ring-1 ring-border/50">
                        <Logo size={64} />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">
                        Lexstash
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        The modular, visual prompt builder for the agentic age.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 text-left">
                    <FeatureItem
                        icon={<Layers className="text-blue-500" />}
                        title="Drag & Drop Blocks"
                        description="Structure prompts visually with nested containers and reusable blocks."
                    />
                    <FeatureItem
                        icon={<Variable className="text-purple-500" />}
                        title="Dynamic Variables"
                        description="Use {{variables}} to create powerful, reusable templates."
                    />
                    <FeatureItem
                        icon={<Zap className="text-amber-500" />}
                        title="Local First"
                        description="Everything stays in your browser. Fast, private, and secure."
                    />
                </div>

                <div className="pt-4">
                    <Button size="lg" onClick={onCreateNew} className="gap-2 text-md h-12 px-8">
                        <PlusCircle size={20} />
                        Create New Prompt
                    </Button>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
            <div className="mt-1 p-2 bg-background rounded-md border shadow-sm">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
    );
}
