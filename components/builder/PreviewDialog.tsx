import React, { useEffect, useState } from 'react';
import { Block } from '@/types/prompt';
import { compileBlocks, extractVariables } from '@/lib/compiler';
import { X, Copy, Terminal, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PreviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    blocks: Block[];
    activeLibrary?: 'local' | 'cloud';
}

export function PreviewDialog({ isOpen, onClose, blocks, activeLibrary = 'local' }: PreviewDialogProps) {
    const [compiledText, setCompiledText] = useState('');
    const [loading, setLoading] = useState(false);
    const [variables, setVariables] = useState<string[]>([]);
    const [values, setValues] = useState<Record<string, string>>({});

    // Initial load: extract variables and compile initial (raw) text
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            const vars = extractVariables(blocks);
            setVariables(vars);

            // Initialize values with empty strings if not present
            setValues(prev => {
                const newValues = { ...prev };
                vars.forEach(v => {
                    if (newValues[v] === undefined) newValues[v] = '';
                });
                return newValues;
            });

            compileBlocks(blocks, values, activeLibrary).then((text) => {
                setCompiledText(text);
                setLoading(false);
            });
        }
    }, [isOpen, blocks, activeLibrary]);

    // Re-compile when values change
    useEffect(() => {
        if (isOpen) {
            compileBlocks(blocks, values, activeLibrary).then((text) => {
                setCompiledText(text);
            });
        }
    }, [values, isOpen, blocks, activeLibrary]);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(compiledText);
    };

    const handleCopyCurl = () => {
        // Simple escaping for JSON content in curl
        const escapedContent = JSON.stringify({ content: compiledText });
        const curlCommand = `curl -X POST https://api.openai.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": ${JSON.stringify(compiledText)}}
    ]
  }'`;
        navigator.clipboard.writeText(curlCommand);
    };

    const handleValueChange = (variable: string, value: string) => {
        setValues(prev => ({ ...prev, [variable]: value }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Preview Compiled Prompt</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X size={20} />
                    </Button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Variables Sidebar */}
                    {variables.length > 0 && (
                        <div className="w-1/3 border-r p-4 flex flex-col gap-4 bg-muted/10 overflow-y-auto">
                            <div className="flex items-center gap-2 mb-2">
                                <RefreshCw size={16} className="text-muted-foreground" />
                                <h3 className="font-medium">Variables</h3>
                            </div>
                            {variables.map(variable => (
                                <div key={variable} className="space-y-1">
                                    <Label htmlFor={`var-${variable}`} className="text-xs font-mono text-muted-foreground">
                                        {`{{${variable}}}`}
                                    </Label>
                                    <Input
                                        id={`var-${variable}`}
                                        value={values[variable] || ''}
                                        onChange={(e) => handleValueChange(variable, e.target.value)}
                                        placeholder={`Value for ${variable}`}
                                        className="h-8"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Preview Area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <ScrollArea className="flex-1 p-4">
                            <pre className="font-mono text-sm whitespace-pre-wrap break-words">
                                {loading ? 'Compiling...' : compiledText}
                            </pre>
                        </ScrollArea>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2 bg-muted/10">
                    <Button variant="outline" onClick={handleCopy}>
                        <Copy size={16} className="mr-2" />
                        Copy {variables.length > 0 ? 'Filled Prompt' : 'Text'}
                    </Button>
                    <Button onClick={handleCopyCurl}>
                        <Terminal size={16} className="mr-2" />
                        Copy as cURL
                    </Button>
                </div>
            </div>
        </div>
    );
}
