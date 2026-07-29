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
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    navigate('/signin');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-20 bg-linear-to-br from-gray-50 to-gray-100">
      <AnimatedGridBackground/>
      <div className="absolute top-10 left-10 flex items-center text-3xl">
        <img onClick={() => navigate(-1)} src="/logo.png" alt="" className='w-20 h-20 cursor-pointer mb-5'/>trixia
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <Link to="/signin" className="text-gray-600 hover:text-[#009FB8] transition inline-flex items-center gap-1 mb-6">
            <FiArrowLeft /> Back to Sign In
          </Link>

          <h2 className="text-3xl font-bold text-[#2D2D2D] mb-2">
            Set New Password
          </h2>
          <p className="text-gray-600 mb-6">
            Create a new strong password for your account
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-transparent"
                  placeholder="Min 6 characters"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-transparent"
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#009FB8] text-white py-2 rounded-lg font-semibold hover:bg-[#008A9F] transition"
            >
              Reset Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;