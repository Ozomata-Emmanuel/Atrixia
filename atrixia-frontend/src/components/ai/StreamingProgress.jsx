// components/ai/StreamingProgress.jsx
import React, { memo, useState, useEffect, useRef } from 'react';

/**
 * Array of professional, engaging fallback messages that rotate when the
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
 * Status stage labels - changes based on progress
 */
const STAGE_LABELS = [
  { range: [0, 20], label: "Initializing" },
  { range: [20, 40], label: "Gathering Data" },
  { range: [40, 60], label: "Analyzing Options" },
  { range: [60, 80], label: "Evaluating Results" },
  { range: [80, 100], label: "Finalizing" }
];

/**
 * StreamingProgress Component
 * Displays real-time search progress with professional styling
 */
const StreamingProgress = memo(({ progress }) => {
  // Guard against missing progress data
  if (!progress || typeof progress.progress !== 'number') return null;

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress.progress));
  const isComplete = clampedProgress >= 100;
  const isStarting = clampedProgress < 10;
  
  // Get current stage label
  const getCurrentStage = () => {
    for (const stage of STAGE_LABELS) {
      if (clampedProgress >= stage.range[0] && clampedProgress < stage.range[1]) {
        return stage.label;
      }
    }
    return STAGE_LABELS[STAGE_LABELS.length - 1].label;
  };
  
  const currentStage = getCurrentStage();

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl rounded-tl-sm px-6 py-5 shadow-lg border border-gray-200/50 max-w-[90%] transition-all duration-300">
      <div className="space-y-4">
        {/* Header with status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {!isComplete ? (
                <PulsingDots size="sm" />
              ) : (
                <div className="shrink-0 w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
                {isComplete ? 'Complete' : currentStage}
              </span>
            </div>
          </div>
          <span className={`text-xs font-bold tabular-nums min-w-10 text-right ${
            isComplete ? 'text-emerald-500' : 'text-[#009FB8]'
          }`}>
            {Math.round(clampedProgress)}%
          </span>
        </div>

        {/* Progress Bar with enhanced shimmer */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner relative">
              {/* Enhanced shimmer effect - always visible on the background */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div 
                  className="h-full w-[200%] bg-linear-to-r from-transparent via-white/60 to-transparent animate-shimmer"
                  style={{ 
                    animationDuration: '1.2s',
                    animationTimingFunction: 'ease-in-out'
                  }}
                />
              </div>
              {/* Actual progress with gradient */}
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
                {/* Enhanced shimmer overlay on the progress bar itself */}
                {!isComplete && (
                  <div 
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                    style={{ 
                      animationDuration: '0.8s',
                      animationTimingFunction: 'ease-in-out'
                    }}
                  />
                )}
                {/* Glow effect on the progress bar edge */}
                {!isComplete && clampedProgress > 5 && (
                  <div 
                    className="absolute right-0 top-0 h-full w-6 bg-linear-to-r from-transparent to-white/20 rounded-r-full"
                    style={{
                      boxShadow: '0 0 20px rgba(0, 159, 184, 0.3)'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Message with rotation */}
        {progress.message && (
          <StatusMessage 
            actualMessage={progress.message} 
            isComplete={isComplete}
            progress={clampedProgress}
          />
        )}

        {/* Completion message */}
        {isComplete && (
          <div className="animate-fadeIn bg-emerald-50/80 rounded-xl px-4 py-2.5 border border-emerald-200/50">
            <p className="text-xs text-emerald-700 font-medium">
              Recommendations ready — displaying your personalized results.
            </p>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(50%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.4); opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shimmer {
          animation: shimmer linear infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.5s ease-out;
        }
      `}</style>
    </div>
  );
});

/**
 * PulsingDots Component with size options
 */
const PulsingDots = memo(({ size = 'sm' }) => {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  
  return (
    <div className="flex items-center gap-1 shrink-0" aria-label="Processing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`${dotSize} rounded-full bg-[#009FB8]`}
          style={{
            animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
});

PulsingDots.displayName = 'PulsingDots';

/**
 * StatusMessage Component
 * Shows the current status message with smart rotation
 */
const StatusMessage = memo(({ actualMessage, isComplete, progress }) => {
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

    // If complete or near complete, don't start stuck detection
    if (isComplete || progress > 90) return;

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

  }, [actualMessage, isComplete, progress]);

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
          Processing...
        </span>
      )}
    </div>
  );
});

StatusMessage.displayName = 'StatusMessage';

StreamingProgress.displayName = 'StreamingProgress';

export default StreamingProgress;