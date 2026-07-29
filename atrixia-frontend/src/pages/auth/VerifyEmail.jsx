// pages/auth/VerifyEmail.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiCheckCircle, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import AnimatedGridBackground from '../../components/AnimatedGridBackground';

const VerifyEmail = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendCount, setResendCount] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [timer, setTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!canResend && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [canResend, timer]);

  // Auto-submit when all digits are filled
  useEffect(() => {
    if (code.every(digit => digit !== '') && !isSuccess) {
      handleVerify();
    }
  }, [code]);

  const handleResend = () => {
    if (canResend) {
      setResendCount(prev => prev + 1);
      setCanResend(false);
      setTimer(30);
      setCode(['', '', '', '', '', '']);
      setError('');
      // Focus first input
      inputRefs.current[0]?.focus();
    }
  };

  const handleInputChange = (index, value) => {
    // Handle pasted content
    if (value.length > 1) {
      const pastedCode = value.replace(/\D/g, '').slice(0, 6);
      const newCode = [...code];
      
      for (let i = 0; i < 6; i++) {
        newCode[i] = pastedCode[i] || '';
      }
      
      setCode(newCode);
      setError('');
      
      // Focus the next empty input or the last one
      const nextEmptyIndex = newCode.findIndex(digit => digit === '');
      if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
      return;
    }

    // Handle single digit input
    const digit = value.replace(/\D/g, '');
    if (digit.length <= 1) {
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);
      setError('');

      // Auto-advance to next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
    
    // Move to previous input on left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Move to next input on right arrow
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const pastedCode = pastedData.replace(/\D/g, '').slice(0, 6);
    
    if (pastedCode) {
      const newCode = [...code];
      for (let i = 0; i < 6; i++) {
        newCode[i] = pastedCode[i] || '';
      }
      setCode(newCode);
      setError('');
      
      // Focus the last filled input
      const lastFilledIndex = Math.min(pastedCode.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Simulate API call - replace with your actual verification logic
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // For demo: accept any code except "000000"
          if (fullCode === '000000') {
            reject(new Error('Invalid verification code'));
          } else {
            resolve();
          }
        }, 1500);
      });

      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualVerify = () => {
    if (!isVerifying && !isSuccess) {
      handleVerify();
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-20 bg-[#f8f8f8] overflow-hidden">
      {/* Grid Background */}
      <AnimatedGridBackground />
      <div className="absolute top-10 left-10 flex items-center text-3xl">
        <img onClick={() => navigate(-1)} src="/logo.png" alt="" className='w-20 h-20 cursor-pointer mb-5'/>trixia
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-gray-100/50 text-center">
          {isSuccess ? (
            <>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiCheckCircle className="text-4xl text-emerald-500" />
              </div>
              <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif-brand mb-2">
                Email Verified!
              </h2>
              <p className="text-[#666666] mb-6">
                Your email has been successfully verified. You can now sign in to your account.
              </p>
              <Link
                to="/signin"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#009FB8] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#008ba3] transition-all hover:shadow-lg"
              >
                Continue to Sign In <FiArrowRight />
              </Link>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-[#009FB8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiMail className="text-4xl text-[#009FB8]" />
              </div>

              <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif-brand mb-2">
                Verify Your Email
              </h2>
              <p className="text-[#666666] mb-8">
                We've sent a 6-digit verification code to your email. Enter the code below to verify your account.
              </p>

              {/* 6-Digit Code Input */}
              <div className="flex gap-3 justify-center mb-6">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : digit
                        ? 'border-[#009FB8] focus:border-[#009FB8] focus:ring-[#009FB8]/20'
                        : 'border-gray-200 focus:border-[#009FB8] focus:ring-[#009FB8]/20'
                    }`}
                    style={{
                      boxShadow: digit ? '0 0 0 1px rgba(0, 159, 184, 0.1)' : 'none'
                    }}
                  />
                ))}
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4 animate-fadeIn">{error}</p>
              )}

              <button
                onClick={handleManualVerify}
                disabled={isVerifying || code.some(digit => digit === '')}
                className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all mb-4 ${
                  isVerifying || code.some(digit => digit === '')
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#009FB8] text-white hover:bg-[#008ba3] hover:shadow-lg'
                }`}
              >
                {isVerifying ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>

              <div className="bg-[#f5f5f5] rounded-xl p-4">
                <p className="text-sm text-[#666666]">
                  Didn't receive the code?{' '}
                  <button
                    onClick={handleResend}
                    disabled={!canResend}
                    className={`font-medium transition ${
                      canResend 
                        ? 'text-[#009FB8] hover:underline' 
                        : 'text-[#999999] cursor-not-allowed'
                    }`}
                  >
                    {canResend ? 'Resend Code' : `Resend in ${timer}s`}
                  </button>
                </p>
                {resendCount > 0 && (
                  <p className="text-xs text-[#666666] mt-2">
                    Code resent {resendCount} time{resendCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <Link
                to="/signin"
                className="inline-flex items-center gap-2 text-[#1a1a1a] font-medium hover:text-[#009FB8] transition mt-6"
              >
                <FiArrowRight className="rotate-180" /> Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;