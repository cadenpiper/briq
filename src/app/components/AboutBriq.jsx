export default function AboutBriq() {
  return (
    <div className="mb-16 sm:mb-20 lg:mb-24">
      {/* What is Briq */}
      <div className="glass-card p-8 mb-16 max-w-4xl mx-auto">
        <h2 
          className="text-2xl sm:text-3xl text-foreground mb-6 text-center"
          style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
        >
          What is Briq?
        </h2>
        <p className="text-foreground/80 text-lg text-center max-w-3xl mx-auto">
          Briq is a yield optimization protocol powered by Rupert, our advanced AI agent. 
          Rupert intelligently manages your funds across lending pools, dynamically allocating 
          assets to secure the highest Annual Percentage Yield (APY) in select markets. 
          With seamless automation and cutting-edge AI, Briq delivers secure, optimized 
          growth with minimal effort.
        </p>
      </div>

      {/* Why Briq */}
      <div className="glass-card p-8 max-w-4xl mx-auto text-center">
        <h3 
          className="text-xl text-foreground mb-4"
          style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
        >
          Why Briq?
        </h3>
        <p className="text-foreground/80 mb-6">
          We believe financial tools should empower everyone. Briq  
          democratizes access to sophisticated DeFi strategies through an intuitive 
          blockchain interface, making wealth-building accessible and effortless.
        </p>
        <p className="text-foreground/80 mb-6">
          Just as buildings rise brick by brick, sustainable financial strategies develop through 
          consistent, informed decisions. Briq provides the infrastructure needed to 
          navigate the decentralized finance landscape with confidence and precision.
        </p>
        <div 
          className="text-accent text-lg italic"
          style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
        >
          "Build with precision, one briq at a time."
        </div>
      </div>
    </div>
  );
}
