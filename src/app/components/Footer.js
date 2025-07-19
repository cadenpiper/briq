import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full bg-cream-200 mt-auto dark:bg-zen-800 transition-colors duration-300">
      <div className="px-0">
        <div className="flex items-center justify-between h-20 relative">
          {/* Left side - App name with logo */}
          <div className="flex items-center pl-1 sm:pl-2">
            <div className="flex items-center justify-center mr-0">
              <Image 
                src="/images/Briq.png" 
                alt="Briq Logo" 
                width={32} 
                height={32}
                style={{ width: 'auto', height: 'auto' }}
                className="rounded"
              />
            </div>
            <span className="-ml-1 text-sm text-zen-800 dark:text-cream-300 font-[100] font-jetbrains-mono transition-colors duration-300">Briq</span>
          </div>
          
          {/* Center - Links */}
          <div className="flex items-center absolute left-1/2 transform -translate-x-1/2 space-x-12">
            <Link 
              href="https://github.com/cadenpiper/briq" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover-highlight-effect text-zen-800 dark:text-cream-300 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium flex items-center space-x-1 hover:shadow-highlight"
            >
              <svg 
                className="w-5 h-5" 
                fill="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>GitHub</span>
            </Link>
            <Link 
              href="#" 
              className="hover-highlight-effect text-zen-800 dark:text-cream-300 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-3 py-2 rounded-md transition-all duration-200 text-sm font-medium hover:shadow-highlight"
            >
              Feedback
            </Link>
          </div>
          
          {/* Right side - Empty space for balance */}
          <div className="pr-2 sm:pr-4"></div>
        </div>
      </div>
    </footer>
  );
}
