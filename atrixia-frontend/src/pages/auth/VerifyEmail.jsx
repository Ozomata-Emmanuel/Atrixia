// pages/auth/VerifyEmail.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiMail, FiCheckCircle, FiArrowRight, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import AnimatedGridBackground from '../../components/AnimatedGridBackground';
import { authService } from '../../services/authService';

const VerifyEmail = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendCount, setResendCount] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [timer, setTimer] = useState(30);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const emailFromUrl = searchParams.get('email');
    const emailFromStorage = sessionStorage.getItem('verificationEmail');
    const email = emailFromUrl || emailFromStorage || '';
    
    if (email) {
      setUserEmail(email);
      if (!emailFromStorage) {
        sessionStorage.setItem('verificationEmail', email);
      }
    }
  }, [searchParams]);

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

  useEffect(() => {
    if (code.every(digit => digit !== '') && !isSuccess && !isVerifying) {
      const timeout = setTimeout(() => {
        handleVerify();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [code]);

  const handleResend = async () => {
    if (!canResend || isResending) return;
    
    setIsResending(true);
    setError('');
    
    try {
      const result = await authService.resendCode(userEmail);
      
      if (result.success) {
        setResendCount(prev => prev + 1);
        setCanResend(false);
        setTimer(30);
        setCode(['', '', '', '', '', '']);
        setError('');
        inputRefs.current[0]?.focus();
      } else {
        setError(result.message || 'Failed to resend code. Please try again.');
      }
    } catch (err) {
      console.error('[VerifyEmail] Resend error:', err);
      setError('Unable to resend code. Please check your connection.');
    } finally {
      setIsResending(false);
    }
  };

  const handleInputChange = (index, value) => {
    if (value.length > 1) {
      const pastedCode = value.replace(/\D/g, '').slice(0, 6);
      const newCode = [...code];
      
      for (let i = 0; i < 6; i++) {
        newCode[i] = pastedCode[i] || '';
      }
      
      setCode(newCode);
      setError('');
      
      const nextEmptyIndex = newCode.findIndex(digit => digit === '');
      if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    if (digit.length <= 1) {
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);
      setError('');

      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
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
      const result = await authService.verifyEmail({ 
        email: userEmail, 
        code: fullCode 
      });
      
      if (result.success) {
        setIsSuccess(true);
        sessionStorage.removeItem('verificationEmail');
      } else {
        if (result.message?.toLowerCase().includes('expired')) {
          setError('Verification code has expired. Please request a new one.');
        } else if (result.message?.toLowerCase().includes('invalid')) {
          setError('Invalid verification code. Please check and try again.');
        } else if (result.message?.toLowerCase().includes('already verified')) {
          setIsSuccess(true);
        } else {
          setError(result.message || 'Verification failed. Please try again.');
        }
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error('[VerifyEmail] Verification error:', err);
      setError('Unable to verify. Please check your connection and try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualVerify = () => {
    if (!isVerifying && !isSuccess && code.some(digit => digit !== '')) {
      handleVerify();
    }
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
          <div className="w-full text-center mb-20 md:mb-0">
            {isSuccess ? (
              <>
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiCheckCircle className="text-4xl text-emerald-500" />
                </div>
                <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif-brand mb-2">
                  Email Verified!
                </h2>
                <p className="text-[#666666] mb-6 text-sm">
                  Your email has been successfully verified. You can now sign in to your account.
                </p>
                <Link
                  to={`/signin?verified=true`}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#1a1a1a] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#333333] transition-all hover:shadow-lg"
                >
                  Continue to Sign In <FiArrowRight />
                </Link>
              </>
            ) : (
              <>

                <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif-brand mb-2">
                  Verify Your Email
                </h2>
                <p className="text-[#666666] mb-2 text-sm">
                  We've sent a 6-digit verification code to
                </p>
                {userEmail && (
                  <p className="text-[#333333] font-medium mb-6">
                    {userEmail}
                  </p>
                )}

                <div className="flex gap-2 justify-center mb-6">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => inputRefs.current[index] = el}
                      type="text"
                      placeholder='-'
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      disabled={isVerifying}
                      className={`w-10 h-12 md:w-12 md:h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white/50 ${
                        error
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : digit
                          ? 'border-[#009FB8] focus:border-[#009FB8] focus:ring-[#009FB8]/20'
                          : 'border-gray-200 focus:border-[#009FB8] focus:ring-[#009FB8]/20'
                      } ${isVerifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        boxShadow: digit && !error ? '0 0 0 1px rgba(0, 159, 184, 0.1)' : 'none'
                      }}
                    />
                  ))}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-sm flex items-start gap-2">
                    <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleManualVerify}
                  disabled={isVerifying || code.every(digit => digit === '')}
                  className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all mb-4 ${
                    isVerifying || code.every(digit => digit === '')
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#1a1a1a] text-white hover:bg-[#333333] hover:shadow-lg'
                  }`}
                >
                  {isVerifying ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
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
                      disabled={!canResend || isResending}
                      className={`font-medium transition inline-flex items-center gap-1 ${
                        canResend && !isResending
                          ? 'text-[#009FB8] hover:underline' 
                          : 'text-[#999999] cursor-not-allowed'
                      }`}
                    >
                      {isResending ? (
                        <>
                          <FiRefreshCw className="animate-spin" />
                          Sending...
                        </>
                      ) : canResend ? (
                        'Resend Code'
                      ) : (
                        `Resend in ${timer}s`
                      )}
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
                  className="inline-flex items-center gap-2 text-[#1a1a1a] font-medium hover:text-[#009FB8] transition mt-6 text-sm"
                >
                  <FiArrowRight className="rotate-180" /> Back to Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;