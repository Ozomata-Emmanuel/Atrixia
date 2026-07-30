// components/ai/StreamingProgress.jsx
import React, { memo, useState, useEffect, useRef } from 'react';

/**
 * Array of fun, engaging fallback messages that rotate when the
 * actual progress message hasn't changed for a while.
 */
const STUCK_MESSAGES = [
  "Searching trusted marketplaces...",
  "Gathering product listings...",
  "Matching products to your request...",
  "Removing duplicate listings...",
  "Filtering unrelated products...",
  "Comparing prices across stores...",
  "Checking seller credibility...",
  "Analyzing product specifications...",
  "Reading customer reviews...",
  "Comparing ratings and feedback...",
  "Calculating value for money...",
  "Estimating overall quality...",
  "Scoring each product...",
  "Ranking the best matches...",
  "Looking for better alternatives...",
  "Checking shipping options...",
  "Comparing delivery estimates...",
  "Identifying the best overall choice...",
  "Finding the best budget option...",
  "Finding the best performance option...",
  "Balancing price and quality...",
  "Evaluating trade-offs...",
  "Double-checking recommendations...",
  "Generating shopping insights...",
  "Preparing your personalized report...",
  "Analyzing pricing trends...",
  "Checking product availability...",
  "Reviewing seller policies...",
  "Comparing warranty information...",
  "Verifying product details...",
  "Checking for better deals...",
  "Evaluating feature differences...",
  "Analyzing customer satisfaction...",
  "Comparing long-term value...",
  "Reviewing marketplace offers...",
  "Finding the strongest contenders...",
  "Organizing comparison results...",
  "Building recommendation scores...",
  "Cross-checking product information...",
  "Evaluating purchase confidence..."
];

/**
 * StreamingProgress Component
 * Displays real-time search progress with:
 * - Animated gradient progress bar with pulse effect
 * - Pulsing dot loader for active states
 * - Smart message rotation when the backend seems stuck
 * - Smooth transitions between states
 * 
 * @param {Object} props
 * @param {Object} props.progress - Progress data object
 * @param {number} props.progress.progress - Progress percentage (0-100)
 * @param {string} props.progress.message - Current status message
 */
const StreamingProgress = memo(({ progress }) => {
  // Guard against missing progress data
  if (!progress || typeof progress.progress !== 'number') return null;

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress.progress));
  const isComplete = clampedProgress >= 100;
  const isStarting = clampedProgress < 10;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl rounded-tl-sm px-5 py-4 shadow-lg border border-gray-200/50 max-w-[85%] transition-all duration-300">
      <div className="space-y-4">
        {/* Header with animated dots */}
        <div className="flex items-center gap-3">
          {!isComplete ? (
            <PulsingDots />
          ) : (
            <div className="shrink-0 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <span className={`text-xs font-semibold uppercase tracking-wider ${
            isComplete 
              ? 'text-emerald-500' 
              : isStarting 
                ? 'text-amber-500' 
                : 'text-[#009FB8]'
          }`}>
            {isComplete ? 'Complete' : isStarting ? 'Initializing' : 'Processing'}
          </span>
        </div>

        {/* Progress Bar with glow effect */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              {/* Background shimmer */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div 
                  className="h-full w-full bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                  style={{ animationDuration: '2s' }}
                />
              </div>
              {/* Actual progress */}
              <div 
                className={`relative h-full rounded-full transition-all duration-700 ease-out ${
                  isComplete
                    ? 'bg-linear-to-r from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-200'
                    : isStarting
                      ? 'bg-linear-to-r from-amber-400 to-orange-400'
                      : 'bg-linear-to-r from-[#009FB8] to-[#006b7d]'
                }`}
                style={{ width: `${clampedProgress}%` }}
              >
                {/* Moving gradient overlay for active state */}
                {!isComplete && (
                  <div 
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                    style={{ animationDuration: '1.5s' }}
                  />
                )}
              </div>
            </div>
            <span className={`text-xs font-bold tabular-nums min-w-10 text-right ${
              isComplete ? 'text-emerald-500' : 'text-[#009FB8]'
            }`}>
              {Math.round(clampedProgress)}%
            </span>
          </div>
        </div>
        
        {/* Status Message with rotation logic */}
        {progress.message && (
          <StatusMessage 
            actualMessage={progress.message} 
            isComplete={isComplete} 
          />
        )}

        {/* Fun completion message */}
        {isComplete && (
          <div className="animate-fadeIn">
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
              <span>Report ready! Displaying results...</span>
            </p>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        .animate-shimmer {
          animation: shimmer linear infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
});

/**
 * PulsingDots Component
 * Three animated dots indicating active processing.
 */
const PulsingDots = memo(() => (
  <div className="flex items-center gap-1 shrink-0" aria-label="Processing">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-[#009FB8]"
        style={{
          animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
        }}
      />
    ))}
  </div>
));

PulsingDots.displayName = 'PulsingDots';

/**
 * StatusMessage Component
 * Shows the current status message with smart rotation.
 * If the actual message hasn't changed for 3 seconds, it rotates through
 * fun fallback messages every 3 seconds until the actual message changes.
 */
const StatusMessage = memo(({ actualMessage, isComplete }) => {
  const [displayMessage, setDisplayMessage] = useState(actualMessage);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const lastActualMessageRef = useRef(actualMessage);
  const stuckTimerRef = useRef(null);
  const rotationTimerRef = useRef(null);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
      if (rotationTimerRef.current) clearInterval(rotationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // Clear any existing timers
    if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    if (rotationTimerRef.current) clearInterval(rotationTimerRef.current);

    // Update the last known message
    lastActualMessageRef.current = actualMessage;
    
    // Show the actual message
    setDisplayMessage(actualMessage);
    setIsUsingFallback(false);

    // If complete, don't start stuck detection
    if (isComplete) return;

    // Start the 3-second stuck detection timer
    stuckTimerRef.current = setTimeout(() => {
      // Only switch to fallback if message is still the same
      if (lastActualMessageRef.current === actualMessage) {
        setIsUsingFallback(true);
        setDisplayMessage(getRandomStuckMessage());
        
        // Start rotating fallback messages every 3 seconds
        rotationTimerRef.current = setInterval(() => {
          setDisplayMessage(getRandomStuckMessage());
        }, 3000);
      }
    }, 3000);

  }, [actualMessage, isComplete]);

  // Pick a random message different from the current one
  function getRandomStuckMessage() {
    const available = STUCK_MESSAGES.filter(m => m !== displayMessage);
    if (available.length === 0) return STUCK_MESSAGES[0];
    return available[Math.floor(Math.random() * available.length)];
  }

  return (
    <div className="relative">
      <p 
        className={`text-sm transition-all duration-300 ${
          isUsingFallback 
            ? 'text-[#009FB8] italic' 
            : isComplete 
              ? 'text-emerald-600 font-medium' 
              : 'text-[#666666]'
        }`}
        key={displayMessage}
        style={{
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {displayMessage}
      </p>
      
      {/* Subtle indicator when using fallback messages */}
      {isUsingFallback && (
        <span className="text-[10px] text-gray-400 mt-0.5 block">
          Still working on it...
        </span>
      )}
    </div>
  );
});

StatusMessage.displayName = 'StatusMessage';

StreamingProgress.displayName = 'StreamingProgress';

export default StreamingProgress;