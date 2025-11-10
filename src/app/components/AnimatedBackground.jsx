'use client';

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Floating blurred orbs */}
      <div className="orb-1 absolute w-96 h-96 rounded-full blur-3xl"></div>
      <div className="orb-2 absolute w-80 h-80 rounded-full blur-3xl"></div>
      <div className="orb-3 absolute w-72 h-72 rounded-full blur-3xl"></div>
      <div className="orb-4 absolute w-64 h-64 rounded-full blur-3xl"></div>
      <div className="orb-5 absolute w-88 h-88 rounded-full blur-3xl"></div>
      
      <style jsx>{`
        .orb-1 {
          background: rgba(255, 122, 47, 0.8);
          top: 5%;
          left: 5%;
          animation: float-1 20s ease-in-out infinite;
        }
        
        .orb-2 {
          background: rgba(120, 113, 108, 0.7);
          top: 15%;
          right: 8%;
          animation: float-2 25s ease-in-out infinite reverse;
        }
        
        .orb-3 {
          background: rgba(168, 162, 158, 0.6);
          bottom: 10%;
          left: 3%;
          animation: float-3 30s ease-in-out infinite;
        }
        
        .orb-4 {
          background: rgba(255, 122, 47, 0.5);
          bottom: 20%;
          right: 5%;
          animation: float-4 22s ease-in-out infinite;
        }
        
        .orb-5 {
          background: rgba(120, 113, 108, 0.6);
          top: 70%;
          right: 2%;
          animation: float-5 28s ease-in-out infinite reverse;
        }
        
        @keyframes float-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(150px, -120px) scale(1.3); }
          66% { transform: translate(-120px, 160px) scale(0.7); }
        }
        
        @keyframes float-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-140px, 100px) scale(1.4); }
        }
        
        @keyframes float-3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          25% { transform: translate(120px, 180px) scale(0.6); }
          75% { transform: translate(-100px, -140px) scale(1.2); }
        }
        
        @keyframes float-4 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          40% { transform: translate(-110px, -90px) scale(1.2); }
          80% { transform: translate(80px, 130px) scale(0.8); }
        }
        
        @keyframes float-5 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          30% { transform: translate(-90px, 70px) scale(0.7); }
          70% { transform: translate(50px, -110px) scale(1.3); }
        }
      `}</style>
    </div>
  );
}
