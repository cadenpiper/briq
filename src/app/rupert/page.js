import Layout from '../components/Layout';

export default function Rupert() {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-zen-900 dark:text-cream-100">Rupert AI</h1>
          <p className="text-lg text-zen-700 dark:text-cream-300">AI-powered yield optimization coming soon</p>
        </div>
      </div>
    </Layout>
  );
}
