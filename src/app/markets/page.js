import Layout from '../components/Layout';
import MarketTable from '../components/MarketTable';

export default function Markets() {
  return (
    <Layout>
      <div className="flex justify-center py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Markets Section */}
          <div className="mb-20">
            <h2 
              className="text-3xl text-zen-900 dark:text-cream-100 mb-8 transition-colors duration-300 text-center"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Markets
            </h2>
            <MarketTable />
          </div>

        </div>
      </div>
    </Layout>
  );
}
