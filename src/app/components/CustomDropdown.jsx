"use client";

import { useState, useRef, useEffect } from 'react';

export default function CustomDropdown({ 
  label, 
  options, 
  onSelect, 
  placeholder = "Select", 
  selectedItems = [],
  className = "" 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter out already selected items
  const availableOptions = options.filter(option => !selectedItems.includes(option));

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <div className={`flex-shrink-0 w-full sm:w-auto ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="glass text-foreground/60 px-4 py-3 pr-10 rounded-lg focus:outline-none hover:bg-accent/5 transition-all duration-200 cursor-pointer w-full sm:w-[140px] text-left text-base sm:text-sm font-normal"
        >
          {placeholder}
        </button>
        
        {/* Dropdown Arrow */}
        <div className="absolute top-1/2 right-3 transform -translate-y-1/2 pointer-events-none">
          <svg 
            className={`w-4 h-4 text-foreground/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dropdown Menu */}
        {isOpen && availableOptions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
            {availableOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-accent/10 hover:text-accent transition-colors duration-150 border-b border-foreground/10 last:border-b-0"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
