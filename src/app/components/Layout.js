import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-cream-100 dark:bg-zen-900 flex flex-col transition-colors duration-300">
      {/* Header with navigation */}
      <Header />
      
      {/* Main content area - full width */}
      <main className="w-full flex-1">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
