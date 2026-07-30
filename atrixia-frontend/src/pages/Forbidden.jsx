// pages/Forbidden.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiArrowLeft, FiHome } from 'react-icons/fi';
import AnimatedGridBackground from '../components/AnimatedGridBackground';

const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#f8f8f8] overflow-hidden">
      <AnimatedGridBackground />
      
      <div className="relative z-10 text-center px-4">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <FiLock className="text-4xl text-red-500" />
        </div>
        
        <h1 className="text-6xl font-bold text-[#1a1a1a] font-serif-brand mb-4">403</h1>
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Access Forbidden</h2>
        <p className="text-[#666666] max-w-md mx-auto mb-8">
          You don't have permission to access this page. Please sign in to continue.
        </p>
        
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-[#666666] font-medium hover:bg-gray-50 transition-all shadow-sm"
          >
            <FiArrowLeft className="text-sm" />
            Go Back
          </button>
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-medium hover:bg-[#333333] transition-all shadow-sm"
          >
            <FiHome className="text-sm" />
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;