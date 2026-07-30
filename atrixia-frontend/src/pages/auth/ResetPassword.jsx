// pages/auth/ResetPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiArrowLeft } from 'react-icons/fi';
import AnimatedGridBackground from '../../components/AnimatedGridBackground';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    navigate('/signin');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center md:py-20 bg-[#f8f8f8] overflow-hidden">
      <AnimatedGridBackground/>
      
      <div className="absolute top-4 left-4 z-20 flex items-center text-2xl font-semibold">
        <img 
          onClick={() => navigate(-1)} 
          src="/logo.png" 
          alt="Logo" 
          className="w-12 h-12 cursor-pointer mb-2" 
        />
        trixia
      </div>

      <div className="relative z-10 w-full h-screen md:h-fit max-w-md md:px-4 px-0">
        <div className="md:bg-white/30 h-full backdrop-blur-xs md:p-6 p-8 md:rounded-2xl shadow-xl border border-gray-100/50 flex items-center">
          <div className="w-full mb-25 md:mb-0">
            <Link to="/signin" className="text-[#666666] hover:text-[#009FB8] transition inline-flex items-center gap-1 mb-6 text-sm">
              <FiArrowLeft /> Back to Sign In
            </Link>

            <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif-brand mb-2">
              Set New Password
            </h2>
            <p className="text-[#666666] mb-6 text-sm">
              Create a new strong password for your account
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#333333] mb-1.5">New Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-3.5 text-[#999999]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition"
                    placeholder="Min 8 characters"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333333] mb-1.5">Confirm Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-3.5 text-[#999999]" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] transition"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#1a1a1a] text-white py-3 rounded-xl font-semibold hover:bg-[#333333] transition"
              >
                Reset Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;