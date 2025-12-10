'use client';

import { useEffect, useState } from 'react';

export default function BrickStackingHero() {
    const [animationStarted, setAnimationStarted] = useState(false);

    useEffect(() => {
        // Start animation after component mounts
        const timer = setTimeout(() => {
            setAnimationStarted(true);
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    // Define the bricks with their content and final positions
    const bricks = [
        { id: 1, label: 'Aave V3', color: 'from-purple-500/20 to-purple-600/20', delay: 0 },
        { id: 2, label: 'Compound V3', color: 'from-green-500/20 to-green-600/20', delay: 0.15 },
        { id: 3, label: '5.2% APY', color: 'from-blue-500/20 to-blue-600/20', delay: 0.3 },
        { id: 4, label: 'Auto-Optimized', color: 'from-cyan-500/20 to-cyan-600/20', delay: 0.45 },
        { id: 5, label: 'Secure', color: 'from-indigo-500/20 to-indigo-600/20', delay: 0.6 },
        { id: 6, label: '🧱', color: 'from-accent/20 to-accent/30', delay: 0.75 },
    ];

    return (
        <div className="mb-12 sm:mb-16 lg:mb-20 min-h-[400px] flex items-center justify-center">
            <div className="w-full max-w-5xl">

                {/* Hero Title and Brick Stack Container */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">

                    {/* Left Side: Hero Text */}
                    <div className="flex-1 text-center lg:text-left">
                        <h1
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground font-light mb-4 sm:mb-6 transition-colors duration-300 leading-tight"
                            style={{
                                fontFamily: 'var(--font-jetbrains-mono)',
                                fontWeight: 100,
                                animation: animationStarted ? 'fadeInUp 0.8s ease-out' : 'none',
                                opacity: animationStarted ? 1 : 0,
                            }}
                        >
                            AI-Powered Yield Optimization
                        </h1>
                        <p
                            className="text-foreground/70 text-lg sm:text-xl max-w-xl mx-auto lg:mx-0"
                            style={{
                                animation: animationStarted ? 'fadeInUp 0.8s ease-out 0.2s both' : 'none',
                                opacity: animationStarted ? 1 : 0,
                            }}
                        >
                            Build wealth brick by brick with intelligent DeFi strategies
                        </p>
                    </div>

                    {/* Right Side: Stacking Bricks */}
                    <div className="flex-1 flex items-center justify-center lg:justify-end">
                        <div className="relative w-full max-w-sm h-[350px]">

                            {/* Brick Stack */}
                            <div className="absolute inset-0 flex flex-col-reverse items-center justify-start gap-2 pt-8">
                                {bricks.map((brick, index) => {
                                    // Calculate position in the stack (bottom to top)
                                    const stackPosition = index;
                                    const isBottomRow = stackPosition < 3;
                                    const isMiddleRow = stackPosition >= 3 && stackPosition < 5;
                                    const isTopRow = stackPosition >= 5;

                                    // Positioning logic for pyramid shape
                                    let leftOffset = 0;
                                    if (isBottomRow) {
                                        leftOffset = (stackPosition - 1) * 90; // Bottom row: 3 bricks
                                    } else if (isMiddleRow) {
                                        leftOffset = (stackPosition - 3) * 90 + 45; // Middle row: 2 bricks, offset
                                    } else {
                                        leftOffset = 90; // Top row: 1 brick, centered
                                    }

                                    return (
                                        <div
                                            key={brick.id}
                                            className="brick-container absolute"
                                            style={{
                                                left: `${leftOffset}px`,
                                                bottom: `${stackPosition * 55}px`,
                                                animation: animationStarted
                                                    ? `brickDrop 0.6s ease-out ${brick.delay}s both, brickFloat 3s ease-in-out ${brick.delay + 1}s infinite`
                                                    : 'none',
                                                opacity: animationStarted ? 1 : 0,
                                            }}
                                        >
                                            <div
                                                className={`
                          glass-card px-6 py-4 
                          bg-gradient-to-br ${brick.color}
                          border-2 border-white/20
                          hover:scale-105 hover:border-accent/40
                          transition-all duration-300
                          cursor-pointer
                          min-w-[80px]
                          text-center
                        `}
                                            >
                                                <span className="text-foreground font-medium text-sm whitespace-nowrap">
                                                    {brick.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Glow effect behind the stack */}
                            <div
                                className="absolute inset-0 -z-10"
                                style={{
                                    background: 'radial-gradient(circle at center, var(--accent) 0%, transparent 70%)',
                                    opacity: animationStarted ? 0.1 : 0,
                                    transition: 'opacity 1s ease-out 1s',
                                }}
                            />
                        </div>
                    </div>

                </div>
            </div>

            <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes brickDrop {
          0% {
            opacity: 0;
            transform: translateY(-100px) rotate(-5deg) scale(0.8);
          }
          60% {
            transform: translateY(5px) rotate(2deg) scale(1.05);
          }
          80% {
            transform: translateY(-2px) rotate(-1deg) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
        }

        @keyframes brickFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
        </div>
    );
}
