import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4 text-gray-100">Home</h2>
          <p className="text-lg text-gray-400">Build here</p>
        </div>
      </div>
    </Layout>
  );
}
