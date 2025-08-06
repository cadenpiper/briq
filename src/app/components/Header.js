import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="w-full bg-cream-200 dark:bg-zen-800 transition-colors duration-300">
      <div className="px-0">
        <div className="flex items-center justify-between h-20 relative">
          <div className="flex items-center pl-1 sm:pl-2">
            {/* Clickable Briq Logo and Name */}
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity duration-200">
              <div className="w-16 h-16 flex items-center justify-center mr-0">
                <Image 
                  src="/images/Briq.png" 
                  alt="Briq Logo" 
                  width={64} 
                  height={64}
                  style={{ width: 'auto', height: 'auto' }}
                  className="rounded"
                  priority
                />
              </div>
              {/* App name */}
              <h1 
                className="-ml-1 text-3xl text-zen-900 dark:text-cream-100 transition-colors duration-300"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
              >
                Briq
              </h1>
            </Link>
          </div>
          
          {/* Navigation - Centered */}
          <nav className="hidden md:flex items-center absolute left-1/2 transform -translate-x-1/2 space-x-12">
            <Link href="/portfolio" className="hover-highlight-effect text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-3 py-2 rounded-md transition-all duration-200 font-light font-lato relative hover:shadow-highlight">
              Portfolio
            </Link>
            <Link href="/markets" className="hover-highlight-effect text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-3 py-2 rounded-md transition-all duration-200 font-light font-lato relative hover:shadow-highlight">
              Markets
            </Link>
            <Link href="/rupert" className="hover-highlight-effect text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-3 py-2 rounded-md transition-all duration-200 font-light font-lato relative hover:shadow-highlight">
              Rupert
            </Link>
            <Link href="/briq" className="hover-highlight-effect text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-3 py-2 rounded-md transition-all duration-200 font-light font-lato relative hover:shadow-highlight">
              Briq?
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4 pr-2 sm:pr-4">
            <ThemeToggle />
            <ConnectButton
              label="Connect"
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
              showBalance={{
                smallScreen: "false",
                largeScreen: "true",
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
