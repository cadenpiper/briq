import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full bg-gray-900 border-t border-gray-800 mt-auto">
      <div className="px-4 sm:px-8 lg:px-[100px]">
        <div className="flex items-center justify-between h-20">
          {/* Left side - App name with logo */}
          <div className="flex items-center">
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
            <span className="-ml-1 text-sm text-gray-400 font-[100] font-jetbrains-mono">Briq</span>
          </div>
          
          {/* Center - Links */}
          <div className="flex items-center space-x-12">
            <Link 
              href="#" 
              className="text-gray-400 hover:text-gray-100 transition-colors duration-200 text-sm font-medium"
            >
              Docs
            </Link>
            <Link 
              href="#" 
              className="text-gray-400 hover:text-gray-100 transition-colors duration-200 text-sm font-medium flex items-center space-x-1"
            >
              <svg 
                className="w-4 h-4" 
                fill="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>X</span>
            </Link>
            <Link 
              href="#" 
              className="text-gray-400 hover:text-gray-100 transition-colors duration-200 text-sm font-medium"
            >
              Feedback
            </Link>
          </div>
          
          {/* Right side - Empty space for balance */}
          <div></div>
        </div>
      </div>
    </footer>
  );
}
