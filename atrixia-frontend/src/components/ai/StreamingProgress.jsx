// components/ai/StreamingProgress.jsx
import React, { memo } from 'react';

/**
 * StreamingProgress Component
 * Displays real-time search progress including:
 * - Animated progress bar
 * - Status message
 * - Marketplaces being searched
 * - Product count
 * 
 * @param {Object} props
 * @param {Object} props.progress - Progress data object
 * @param {number} props.progress.progress - Progress percentage (0-100)
 * @param {string} props.progress.message - Current status message
 * @param {string[]} props.progress.marketplacesSearched - List of marketplaces
 * @param {number} props.progress.totalProductsFound - Number of products found
 */
const StreamingProgress = memo(({ progress }) => {
  // Guard against missing progress data
  if (!progress || typeof progress.progress !== 'number') return null;

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress.progress));
  
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-gray-200/50 max-w-[85%]">
      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-linear-to-r from-[#009FB8] to-[#006b7d] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-[#009FB8]">{Math.round(clampedProgress)}%</span>
        </div>
        
        {/* Status Message */}
        {progress.message && (
          <p className="text-sm text-[#666666]">{progress.message}</p>
        )}
        
        {/* Marketplace Labels */}
        {progress.marketplacesSearched?.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Searching:</span>
            <div className="flex gap-1">
              {progress.marketplacesSearched.map((marketplace) => (
                <span 
                  key={marketplace} 
                  className="text-xs bg-gray-100 px-2 py-0.5 rounded-full font-medium text-gray-600"
                >
                  {marketplace}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Products Found */}
        {progress.totalProductsFound > 0 && (
          <p className="text-xs text-gray-400">
            Found {progress.totalProductsFound} products so far
          </p>
        )}
      </div>
    </div>
  );
});

StreamingProgress.displayName = 'StreamingProgress';

export default StreamingProgress;