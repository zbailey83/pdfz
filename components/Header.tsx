import React from 'react';

const Header = () => {
  return (
    <header className="bg-slate-900/70 backdrop-blur-lg sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <span className="text-2xl font-bold text-white">
              PDF Guide <span className="text-brand-secondary">Showcase</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
