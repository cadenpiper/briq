'use client';

export default function HowItWorks() {
  return (
    <div className="mb-16 sm:mb-20 lg:mb-24">
      <h2 
        className="text-2xl sm:text-3xl text-foreground mb-8 sm:mb-12 transition-colors duration-300 text-center px-2"
        style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
      >
        How It Works
      </h2>
      
      {/* Flow Diagram */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
          
          {/* Step 1 */}
          <div className="glass-card p-6 w-full max-w-xs flex flex-col">
            <div className="w-16 h-16 mx-auto mb-4 bg-accent/20 rounded-full flex items-center justify-center">
              <img src="/images/dollar-symbol.gif" alt="Dollar" className="w-14 h-14" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2 text-center">
              Deposit Funds
            </h3>
            <p className="text-sm text-foreground/70 text-center flex-grow">
              Deposit USDC or WETH and receive Briq shares representing your portion of the pool
            </p>
          </div>

          {/* Arrow 1 */}
          <div className="hidden md:block text-accent text-2xl">→</div>

          {/* Step 2 */}
          <div className="glass-card p-6 w-full max-w-xs flex flex-col">
            <div className="w-16 h-16 mx-auto mb-4 bg-accent/20 rounded-full flex items-center justify-center">
              <img src="/images/multi-cluster-new.gif" alt="AI Optimization" className="w-14 h-14" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2 text-center">
              AI Optimization
            </h3>
            <p className="text-sm text-foreground/70 text-center flex-grow">
              Rupert AI analyzes real-time market data and allocates funds to the highest-yielding protocols
            </p>
          </div>

          {/* Arrow 2 */}
          <div className="hidden md:block text-accent text-2xl">→</div>

          {/* Step 3 */}
          <div className="glass-card p-6 w-full max-w-xs flex flex-col">
            <div className="w-16 h-16 mx-auto mb-4 bg-accent/20 rounded-full flex items-center justify-center">
              <img src="/images/down-payment.gif" alt="Earn Yield" className="w-14 h-14" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2 text-center">
              Earn Yield
            </h3>
            <p className="text-sm text-foreground/70 text-center flex-grow">
              Your funds earn optimized returns across Aave V3 and Compound V3 protocols automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
