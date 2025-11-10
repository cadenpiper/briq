import { NetworkIcon, TokenIcon, ProtocolIcon } from './icons';

export default function SupportedEcosystem() {
  return (
    <div className="mb-16 sm:mb-20 lg:mb-24">
      <h2 
        className="text-2xl sm:text-3xl text-foreground mb-8 transition-colors duration-300 text-center px-2"
        style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
      >
        Supported Ecosystem
      </h2>
      
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Networks */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Networks</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 glass px-3 py-2 rounded-lg">
                <span className="text-sm text-foreground/70">Ethereum</span>
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              </div>
              <div className="flex items-center justify-center gap-2 glass px-3 py-2 rounded-lg">
                <span className="text-sm text-foreground/70">Arbitrum</span>
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Assets */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Assets</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 glass px-3 py-2 rounded-lg">
                <span className="text-sm text-foreground/70">USDC</span>
              </div>
              <div className="flex items-center justify-center gap-2 glass px-3 py-2 rounded-lg">
                <span className="text-sm text-foreground/70">WETH</span>
              </div>
            </div>
          </div>

          {/* Protocols */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Protocols</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 glass px-3 py-2 rounded-lg">
                <span className="text-sm text-foreground/70">Aave V3</span>
              </div>
              <div className="flex items-center justify-center gap-2 glass px-3 py-2 rounded-lg">
                <span className="text-sm text-foreground/70">Compound V3</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2 text-xs text-foreground/60">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
