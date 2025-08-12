'use client';

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";
import { useState } from "react";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="w-full bg-cream-200 dark:bg-zen-800 transition-colors duration-300">
      <div className="px-0">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center pl-1 sm:pl-2">
            {/* Clickable Briq Logo and Name */}
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity duration-200" onClick={closeMobileMenu}>
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
            
            {/* Desktop Navigation - Left side after logo */}
            <nav className="hidden md:flex items-center ml-8 space-x-8">
              <Link href="/portfolio" className="hover-highlight-effect text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-3 py-2 rounded-md transition-all duration-200 font-light font-lato relative hover:shadow-highlight">
                Portfolio
              </Link>
              <Link href="/markets" className="hover-highlight-effect text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-3 py-2 rounded-md transition-all duration-200 font-light font-lato relative hover:shadow-highlight">
                Markets
              </Link>
              <Link href="/analytics" className="hover-highlight-effect text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-3 py-2 rounded-md transition-all duration-200 font-light font-lato relative hover:shadow-highlight">
                Analytics
              </Link>
              <Link href="/briq" className="hover-highlight-effect text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 px-3 py-2 rounded-md transition-all duration-200 font-light font-lato relative hover:shadow-highlight">
                Briq?
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4 pr-2 sm:pr-4">
            {/* Mobile hamburger menu button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-md text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 transition-all duration-200"
              aria-label="Toggle mobile menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            
            {/* Desktop Theme Toggle */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            
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

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-cream-100 dark:bg-zen-700 border-t border-cream-300 dark:border-zen-600 animate-slide-down">
            <nav className="px-4 py-4 space-y-2">
              <Link 
                href="/portfolio" 
                className="block px-3 py-2 rounded-md text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 transition-all duration-200 font-light font-lato"
                onClick={closeMobileMenu}
              >
                Portfolio
              </Link>
              <Link 
                href="/markets" 
                className="block px-3 py-2 rounded-md text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 transition-all duration-200 font-light font-lato"
                onClick={closeMobileMenu}
              >
                Markets
              </Link>
              <Link 
                href="/analytics" 
                className="block px-3 py-2 rounded-md text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 transition-all duration-200 font-light font-lato"
                onClick={closeMobileMenu}
              >
                Analytics
              </Link>
              <Link 
                href="/briq" 
                className="block px-3 py-2 rounded-md text-zen-800 dark:text-cream-200 hover:text-briq-orange dark:hover:text-briq-orange hover:bg-briq-orange/20 dark:hover:bg-briq-orange/30 transition-all duration-200 font-light font-lato"
                onClick={closeMobileMenu}
              >
                Briq?
              </Link>
              
              {/* Mobile Theme Toggle at bottom */}
              <div className="pt-4 border-t border-cream-300 dark:border-zen-600 flex justify-center">
                <ThemeToggle />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
