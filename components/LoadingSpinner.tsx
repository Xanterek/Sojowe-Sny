import React from 'react';

const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <div className="relative w-16 h-16">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-amber-500/30 rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
    </div>
    {message && <p className="text-amber-100 animate-pulse text-sm font-medium">{message}</p>}
  </div>
);

export default LoadingSpinner;