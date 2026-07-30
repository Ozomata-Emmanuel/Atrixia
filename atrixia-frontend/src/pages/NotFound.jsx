// pages/NotFound.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHome, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import AnimatedGridBackground from '../components/AnimatedGridBackground';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex items-center justify-center md:py-20 bg-[#f8f8f8] overflow-hidden">
      {/* Grid Background */}
      <AnimatedGridBackground />
      
      {/* Logo - Positioned at top left */}
      <div className="absolute top-6 left-6 z-20 flex items-center text-2xl font-semibold">
        <img 
          onClick={() => navigate(-1)} 
          src="/logo.png" 
          alt="Logo" 
          className="w-15 h-15 cursor-pointer mb-2" 
        />
        trixia
      </div>

      {/* Main content - Full width on mobile, card-like on larger screens */}
      <div className="relative z-10 w-full h-screen md:h-fit max-w-md md:px-4 px-0">
        <div className="md:bg-white/30 h-full backdrop-blur-xs md:p-6 p-8 md:rounded-2xl shadow-xl border border-gray-100/50 flex items-center">
          <div className="w-full text-center">
            {/* 404 Icon */}
            <div className="relative inline-block mb-8">
              <div className="w-28 h-28 bg-[#009FB8]/10 rounded-full flex items-center justify-center mx-auto">
                <FiAlertCircle className="text-6xl text-[#009FB8]" />
              </div>
              {/* Decorative rings */}
              <div className="absolute inset-0 -m-4 border-2 border-[#009FB8]/10 rounded-full animate-pulse"></div>
            </div>

            {/* Error Code */}
            <h1 className="text-8xl font-bold text-[#1a1a1a] font-serif-brand leading-none">
              404
            </h1>
            
            {/* Message */}
            <h2 className="text-2xl font-bold text-[#1a1a1a] mt-4 mb-2">
              Page Not Found
            </h2>
            <p className="text-[#666666] text-sm max-w-sm mx-auto">
              Oops! The page you're looking for doesn't exist or has been moved.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
              <Link
                to="/"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#1a1a1a] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#333333] transition-all hover:shadow-lg"
              >
                <FiHome className="text-lg" />
                Go to Homepage
              </Link>
              
              <button
                onClick={() => navigate(-1)}
                className="w-full inline-flex items-center justify-center gap-2 bg-white/50 text-[#1a1a1a] px-6 py-3 rounded-xl font-semibold hover:bg-white/80 transition-all border border-gray-200"
              >
                <FiArrowLeft className="text-lg" />
                Go Back
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-[#999999] mt-6">
              If you think this is a mistake, please{' '}
              <Link to="/contact" className="text-[#009FB8] hover:underline">
                contact support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;