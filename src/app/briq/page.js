import Layout from '../components/Layout';

export default function BriqInfo() {
  return (
    <Layout>
      <div className="flex justify-center py-12">
        <div className="max-w-3xl px-4 sm:px-6">
          <h1 
            className="text-4xl text-zen-900 dark:text-cream-100 text-center mb-12"
            style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
          >
            What is Briq?
          </h1>
          
          <div className="prose prose-lg dark:prose-invert mx-auto">
            <p className="text-zen-800 dark:text-cream-200 mb-10 text-lg">
              Briq is a yield optimization protocol powered by Rupert, our advanced AI agent. 
              Rupert intelligently manages your funds across lending pools, dynamically allocating 
              assets to secure the highest Annual Percentage Yield (APY) in select markets. 
              With seamless automation and cutting-edge AI, Briq delivers secure, optimized 
              growth with minimal effort.
            </p>
            
            <h2 
              className="text-2xl text-zen-900 dark:text-cream-100 mb-6"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Our Vision
            </h2>
            <p className="text-zen-800 dark:text-cream-200 mb-10 text-lg">
              We believe financial tools should empower everyone. Briq  
              democratizes access to sophisticated DeFi strategies through an intuitive 
              blockchain interface, making wealth-building accessible and effortless.
            </p>
            
            <h2 
              className="text-2xl text-zen-900 dark:text-cream-100 mb-6"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Key Features
            </h2>
            <ul className="list-disc pl-6 mb-10 text-zen-800 dark:text-cream-200 text-lg">
              <li className="mb-3"><span className="font-medium">Market Analysis:</span> Real-time data and analytics for informed investment decisions.</li>
              <li className="mb-3"><span className="font-medium">Rupert's AI Insights:</span> Personalized recommendations and market insights from our AI agent.</li>
              <li className="mb-3"><span className="font-medium">Autopilot Investing:</span> Rupert optimizes your investments across lending pools for stable, high-yield returns.</li>
              <li className="mb-3"><span className="font-medium">Seamless Experience:</span> Manage your portfolio with minimal friction.</li>
            </ul>
            
            <h2 
              className="text-2xl text-zen-900 dark:text-cream-100 mb-6"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Why Briq?
            </h2>
            <p className="text-zen-800 dark:text-cream-200 mb-10 text-lg">
              Just as buildings rise brick by brick, financial freedom grows one decision at a time. 
              With Rupert at the helm, Briq provides the foundation for your financial future in the 
              decentralized economy.
            </p>
            
            <div 
              className="text-center italic text-xl text-briq-orange mt-16 mb-8"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              "Build your financial future, one briq at a time."
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
