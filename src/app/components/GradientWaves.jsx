'use client';

export default function GradientWaves() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
      </div>
      
      <style jsx>{`
        .wave {
          position: absolute;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, 
            rgba(255, 122, 47, 0.1) 0%, 
            rgba(219, 201, 166, 0.2) 25%, 
            rgba(255, 122, 47, 0.15) 50%, 
            rgba(219, 201, 166, 0.1) 75%, 
            rgba(255, 122, 47, 0.05) 100%
          );
          animation: wave-animation 20s ease-in-out infinite;
        }
        
        .wave1 {
          top: -50%;
          left: -50%;
          animation-delay: 0s;
        }
        
        .wave2 {
          top: -60%;
          left: -60%;
          animation-delay: -7s;
          animation-duration: 25s;
        }
        
        .wave3 {
          top: -40%;
          left: -40%;
          animation-delay: -14s;
          animation-duration: 30s;
        }
        
        @keyframes wave-animation {
          0%, 100% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(90deg) scale(1.1);
          }
          50% {
            transform: rotate(180deg) scale(0.9);
          }
          75% {
            transform: rotate(270deg) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
