import Layout from './components/Layout';
import Image from 'next/image';
import Link from 'next/link';
import TokenCard from './components/TokenCard';
import ProtocolCard from './components/ProtocolCard';
import ChainCard from './components/ChainCard';

export default function Home() {
  return (
    <Layout>
      <div className="flex justify-center py-6 sm:py-12">
        <div className="text-center max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Hero Section */}
          <div className="mb-12 sm:mb-16 lg:mb-20">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-zen-900 dark:text-cream-100 font-light mb-4 sm:mb-6 transition-colors duration-300 leading-tight"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}>
              AI-Powered Yield Optimization
            </h1>
            <p className="text-lg sm:text-xl text-zen-700 dark:text-cream-300 max-w-3xl mx-auto font-light font-lato px-2">
              Maximize your returns across DeFi protocols effortlessly
            </p>
          </div>

          {/* Call to Action */}
          <div className="mb-12 sm:mb-16 lg:mb-20">
            <p className="text-base sm:text-lg text-zen-700 dark:text-cream-300 mb-4 sm:mb-6 font-light font-lato text-center px-2">
              Optimize your returns with Rupert or manually
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center max-w-sm sm:max-w-none mx-auto">
              <Link 
                href="/rupert" 
                className="w-full sm:w-auto border border-briq-orange text-briq-orange hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-6 sm:px-8 py-3 rounded-lg transition-all duration-200 font-medium text-center"
              >
                Rupert
              </Link>
              <Link 
                href="/markets" 
                className="w-full sm:w-auto border border-briq-orange text-briq-orange hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-6 sm:px-8 py-3 rounded-lg transition-all duration-200 font-medium text-center"
              >
                DIY
              </Link>
            </div>
          </div>

          {/* Available Networks Module */}
          <div className="mb-12 sm:mb-16 lg:mb-20">
            <h2 
              className="text-2xl sm:text-3xl text-zen-900 dark:text-cream-100 mb-6 sm:mb-8 transition-colors duration-300 text-center px-2"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Available Networks
            </h2>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
              <ChainCard chain="Ethereum" status="Coming Soon" />
              <ChainCard chain="Arbitrum One" status="Coming Soon" />
            </div>
          </div>

          {/* Supported Tokens Module */}
          <div className="mb-12 sm:mb-16 lg:mb-20">
            <h2 
              className="text-2xl sm:text-3xl text-zen-900 dark:text-cream-100 mb-6 sm:mb-8 transition-colors duration-300 text-center px-2"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Supported Assets
            </h2>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
              <TokenCard token="USDC" />
              <TokenCard token="WETH" />
            </div>
          </div>

          {/* Supported Protocols Module */}
          <div className="mb-12 sm:mb-16 lg:mb-20">
            <h2 
              className="text-2xl sm:text-3xl text-zen-900 dark:text-cream-100 mb-6 sm:mb-8 transition-colors duration-300 text-center px-2"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Integrated Protocols
            </h2>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <ProtocolCard name="AAVE v3" />
              <ProtocolCard name="Compound v3 (Comet)" />
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
