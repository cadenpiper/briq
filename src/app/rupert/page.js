import Layout from '../components/Layout';

export default function PageTemplate({ title, subtitle }) {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-100">{title}</h1>
          {subtitle && <p className="text-lg text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </Layout>
  );
}
