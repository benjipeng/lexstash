import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
    className?: string;
    size?: number;
}

export function Logo({ className, size = 32 }: LogoProps) {
    return (
        <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="overflow-visible"
            >
                {/* Base Container Block */}
                <rect
                    x="4"
                    y="4"
                    width="24"
                    height="24"
                    rx="6"
                    className="stroke-primary stroke-2 fill-primary/10"
                />

                {/* Animated Inner Blocks */}
                <g className="animate-pulse">
                    {/* Top Block */}
                    <rect
                        x="9"
                        y="9"
                        width="14"
                        height="4"
                        rx="1"
                        className="fill-primary"
                    />
                    {/* Middle Block - Sliding Animation */}
                    <rect
                        x="9"
                        y="15"
                        width="10"
                        height="4"
                        rx="1"
                        className="fill-primary/70 animate-[slide-right_3s_ease-in-out_infinite]"
                        style={{ transformOrigin: 'center' }}
                    />
                    {/* Bottom Block */}
                    <rect
                        x="9"
                        y="21"
                        width="8"
                        height="2"
                        rx="1"
                        className="fill-primary/40"
                    />
                </g>
            </svg>

            {/* Inline styles for custom animation if not in tailwind config */}
            <style jsx>{`
                @keyframes slide-right {
                    0%, 100% { transform: translateX(0); width: 10px; }
                    50% { transform: translateX(2px); width: 12px; }
                }
            `}</style>
        </div>
    );
}
