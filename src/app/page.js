import Layout from './components/Layout';
import Image from 'next/image';
import Link from 'next/link';
import TokenCard from './components/TokenCard';
import ProtocolCard from './components/ProtocolCard';
import ChainCard from './components/ChainCard';

export default function Home() {
  return (
    <Layout>
      <div className="flex justify-center py-12">
        <div className="text-center max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Hero Section */}
          <div className="mb-50">
            <h1 className="text-5xl md:text-6xl text-zen-900 dark:text-cream-100 font-light mb-6 transition-colors duration-300"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}>
              AI-Powered Yield Optimization
            </h1>
            <p className="text-xl text-zen-700 dark:text-cream-300 max-w-3xl mx-auto font-light font-lato">
              Maximize your returns across DeFi protocols effortlessly
            </p>
          </div>

          {/* Call to Action */}
          <div className="mb-50">
            <p className="text-lg text-zen-700 dark:text-cream-300 mb-6 font-light font-lato text-center">
              Optimize your returns with Rupert or manually
            </p>
            <div className="flex gap-4 justify-center items-center flex-wrap">
              <Link 
                href="/rupert" 
                className="border border-briq-orange text-briq-orange hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-8 py-3 rounded-lg transition-all duration-200 font-medium"
              >
                Rupert
              </Link>
              <Link 
                href="/markets" 
                className="border border-briq-orange text-briq-orange hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-8 py-3 rounded-lg transition-all duration-200 font-medium"
              >
                DIY
              </Link>
            </div>
          </div>

          {/* Available Networks Module */}
          <div className="mb-20">
            <h2 
              className="text-3xl text-zen-900 dark:text-cream-100 mb-8 transition-colors duration-300 text-center"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Available Networks
            </h2>
            <div className="flex justify-center items-center gap-6 flex-wrap">
              <ChainCard chain="Ethereum" status="Coming Soon" />
              <ChainCard chain="Base" status="Coming Soon" />
              <ChainCard chain="Arbitrum One" status="Coming Soon" />
            </div>
          </div>

          {/* Supported Tokens Module */}
          <div className="mb-20">
            <h2 
              className="text-3xl text-zen-900 dark:text-cream-100 mb-8 transition-colors duration-300 text-center"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Supported Assets
            </h2>
            <div className="flex justify-center items-center gap-6 flex-wrap">
              <TokenCard token="USDC" />
              <TokenCard token="USDT" status="Coming Soon" />
            </div>
          </div>

          {/* Supported Protocols Module */}
          <div className="mb-20">
            <h2 
              className="text-3xl text-zen-900 dark:text-cream-100 mb-8 transition-colors duration-300 text-center"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Integrated Protocols
            </h2>
            <div className="flex justify-center items-center gap-4">
              <ProtocolCard name="AAVE v3" />
              <ProtocolCard name="Compound v3 (Comet)" />
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
