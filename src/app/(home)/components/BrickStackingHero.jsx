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

    // Define bricks in a proper brick-laying pattern (offset rows)
    const bricks = [
        // Row 1 (bottom) - 3 bricks
        { id: 1, row: 0, position: 0, delay: 0 },
        { id: 2, row: 0, position: 1, delay: 0.08 },
        { id: 3, row: 0, position: 2, delay: 0.16 },

        // Row 2 - 2 bricks (offset)
        { id: 4, row: 1, position: 0.5, delay: 0.24 },
        { id: 5, row: 1, position: 1.5, delay: 0.32 },

        // Row 3 - 3 bricks
        { id: 6, row: 2, position: 0, delay: 0.4 },
        { id: 7, row: 2, position: 1, delay: 0.48 },
        { id: 8, row: 2, position: 2, delay: 0.56 },

        // Row 4 - 2 bricks (offset)
        { id: 9, row: 3, position: 0.5, delay: 0.64 },
        { id: 10, row: 3, position: 1.5, delay: 0.72 },

        // Row 5 (top) - 3 bricks
        { id: 11, row: 4, position: 0, delay: 0.8 },
        { id: 12, row: 4, position: 1, delay: 0.88 },
        { id: 13, row: 4, position: 2, delay: 0.96 },
    ];

    const brickWidth = 120; // Increased from 100
    const brickHeight = 48; // Increased from 40
    const brickGap = 4; // Increased gap

    return (
        <div className="min-h-screen flex items-start justify-center pt-28 sm:pt-36 lg:pt-44 xl:pt-52 2xl:pt-60 -mt-6 sm:-mt-12">
            <div className="w-full max-w-6xl px-4">

                {/* Hero Title and Brick Stack Container */}
                <div className="flex flex-col items-center justify-center gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">

                    {/* Left Side: Hero Text */}
                    <div className="flex-1 text-center lg:text-left">
                        <h1
                            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground font-light mb-6 sm:mb-8 transition-colors duration-300 leading-tight"
                            style={{
                                fontFamily: 'var(--font-jetbrains-mono)',
                                fontWeight: 100,
                                animation: animationStarted ? 'fadeInUp 0.8s ease-out' : 'none',
                                opacity: animationStarted ? 1 : 0,
                            }}
                        >
                            Yield Optimization Protocol
                        </h1>
                        <p
                            className="text-foreground/70 text-xl sm:text-2xl max-w-2xl mx-auto lg:mx-0"
                            style={{
                                animation: animationStarted ? 'fadeInUp 0.8s ease-out 0.2s both' : 'none',
                                opacity: animationStarted ? 1 : 0,
                            }}
                        >
                            Automated DeFi strategies that maximize your returns across lending protocols
                        </p>
                    </div>

                    {/* Right Side: Stacking Bricks */}
                    <div className="w-full flex justify-center lg:flex-1 lg:justify-end -mt-12 lg:-mt-16">
                        <div className="relative h-[320px] sm:h-[360px] lg:h-[420px] flex items-center justify-center">

                            {/* Brick Wall */}
                            <div className="relative pt-6 sm:pt-8">
                                <div className="relative mx-auto" style={{ width: `${brickWidth * 3 + brickGap * 2}px`, height: '300px' }}>
                                    {bricks.map((brick) => {
                                        const left = brick.position * (brickWidth + brickGap);
                                        const bottom = brick.row * (brickHeight + brickGap);

                                        // Vary the blue shades slightly for depth
                                        const blueVariants = [
                                            'from-blue-500/30 to-blue-600/40',
                                            'from-blue-400/30 to-blue-500/40',
                                            'from-cyan-500/30 to-blue-500/40',
                                            'from-blue-600/30 to-cyan-600/40',
                                        ];
                                        const colorClass = blueVariants[brick.id % blueVariants.length];

                                        return (
                                            <div
                                                key={brick.id}
                                                className="brick-container absolute"
                                                style={{
                                                    left: `${left}px`,
                                                    bottom: `${bottom}px`,
                                                    width: `${brickWidth}px`,
                                                    height: `${brickHeight}px`,
                                                    animation: animationStarted
                                                        ? `brickDrop 0.5s ease-out ${brick.delay}s both, brickFloat 4s ease-in-out ${brick.delay + 1}s infinite`
                                                        : 'none',
                                                    opacity: animationStarted ? 1 : 0,
                                                }}
                                            >
                                                <div
                                                    className={`
                            w-full h-full
                            rounded-lg
                            bg-gradient-to-br ${colorClass}
                            border-2 border-accent/30
                            hover:border-accent/60
                            hover:scale-105
                            hover:shadow-lg hover:shadow-accent/20
                            transition-all duration-300
                            relative
                            overflow-hidden
                            backdrop-blur-sm
                          `}
                                                >
                                                    {/* Subtle inner highlight for depth */}
                                                    <div
                                                        className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg"
                                                    />

                                                    {/* Subtle shine effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-lg" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Glow effect behind the stack */}
                            <div
                                className="absolute inset-0 -z-10"
                                style={{
                                    background: 'radial-gradient(circle at center, var(--accent) 0%, transparent 70%)',
                                    opacity: animationStarted ? 0.15 : 0,
                                    transition: 'opacity 1.5s ease-out 1.5s',
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
            transform: translateY(-120px) rotate(-8deg) scale(0.8);
          }
          60% {
            transform: translateY(8px) rotate(2deg) scale(1.05);
          }
          80% {
            transform: translateY(-3px) rotate(-1deg) scale(0.98);
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
            transform: translateY(-6px);
          }
        }
      `}</style>
        </div>
    );
}
