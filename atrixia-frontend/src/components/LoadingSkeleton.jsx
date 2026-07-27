// components/LoadingSkeleton.jsx
import React from 'react';

export const ProductCardSkeleton = () => (
  <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100/50 overflow-hidden animate-pulse">
    <div className="h-52 bg-linear-to-r from-gray-200/60 to-gray-100/60" />
    <div className="p-5 space-y-4">
      <div className="h-5 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-lg w-3/4" />
      <div className="h-6 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-lg w-1/2" />
      <div className="flex gap-2">
        <div className="h-4 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-lg flex-1" />
        <div className="h-4 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-lg flex-1" />
      </div>
      <div className="h-10 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-xl" />
    </div>
  </div>
);

export const ProductViewSkeleton = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Image skeleton */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100/50 h-96">
        <div className="w-full h-full bg-linear-to-r from-gray-200/60 to-gray-100/60" />
      </div>

      {/* Details skeleton */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100/50 p-8 space-y-6">
        <div className="space-y-4">
          <div className="h-8 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-lg w-2/3" />
          <div className="h-5 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-lg w-1/4" />
        </div>

        <div className="h-8 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-lg w-1/3" />

        <div className="h-20 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-xl" />

        <div className="grid grid-cols-2 gap-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-16 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-xl" />
          ))}
        </div>

        <div className="h-12 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-xl" />
      </div>
    </div>
  </div>
);

export const ChatMessageSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex justify-end">
      <div className="max-w-xs h-12 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-2xl rounded-tr-none" />
    </div>
    <div className="flex justify-start">
      <div className="max-w-sm space-y-2">
        <div className="h-12 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-2xl rounded-tl-none w-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-linear-to-r from-gray-200/60 to-gray-100/60 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  </div>
);
