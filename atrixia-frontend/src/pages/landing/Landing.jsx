// pages/landing/Landing.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiBarChart, FiZap, FiShield } from "react-icons/fi";

const Landing = () => {
  const features = [
    {
      icon: <FiZap className="text-4xl text-[#009FB8]" />,
      title: "Instant AI Analysis",
      description: "Get personalized product recommendations powered by advanced AI analysis in seconds.",
    },
    {
      icon: <FiBarChart className="text-4xl text-[#009FB8]" />,
      title: "Smart Comparisons",
      description: "Compare products based on what matters to you with detailed specification breakdowns.",
    },
    {
      icon: <FiCheckCircle className="text-4xl text-[#009FB8]" />,
      title: "Confidence Scores",
      description: "Know how confident our AI is in each recommendation with transparent scoring.",
    },
    {
      icon: <FiShield className="text-4xl text-[#009FB8]" />,
      title: "Save Your Finds",
      description: "Build a personalized wishlist and organize products by your preferences.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-gray-50 via-white to-gray-50">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -left-15 -top-15 animate-[moveGrid_25s_linear_infinite]"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(40, 100px)",
            gridAutoRows: "100px",
          }}
        >
          {Array.from({ length: 1200 }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor:
                  Math.random() > 0.5
                    ? `hsla(${Math.random() * 360}, 80%, 60%, 0.08)`
                    : "transparent",
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-42 pb-20">
          <div className="text-center mb-16">
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif-brand font-bold text-[#1a1a1a] mb-6 leading-tight">
              Shop Smarter with
              <span className="bg-linear-to-r from-[#009FB8] to-[#006b7d] bg-clip-text text-transparent"> AI</span>
            </h1>
            
            <p className="text-lg md:text-xl text-[#666666] max-w-3xl mx-auto mb-10 leading-relaxed">
              Let Attrixia analyze thousands of products and give you personalized recommendations with detailed explanations. Make better purchasing decisions in minutes, not hours.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 bg-linear-to-r from-[#009FB8] to-[#006b7d] text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-lg hover:shadow-[#009FB8]/30 transition border border-[#009FB8]/50"
              >
                Start Shopping Smarter
                <FiArrowRight className="text-lg" />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center justify-center gap-2 bg-white/80 backdrop-blur-md text-[#1a1a1a] px-8 py-4 rounded-2xl font-semibold border border-gray-200/50 hover:border-[#009FB8]/30 hover:shadow-md transition"
              >
                See How It Works
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white/40 backdrop-blur-md border-y border-gray-200/50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-serif-brand font-bold text-[#1a1a1a] mb-4">
                Why Attrixia?
              </h2>
              <p className="text-[#666666] text-lg max-w-2xl mx-auto">
                Discover features designed to simplify your shopping and maximize satisfaction
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-200/50 hover:shadow-lg hover:border-[#009FB8]/30 hover:-translate-y-1 transition duration-300 group"
                >
                  <div className="mb-5 inline-block p-3 bg-[#009FB8]/10 rounded-xl group-hover:bg-[#009FB8]/20 transition">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[#666666] text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-gray-200/50 p-12 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-serif-brand font-bold text-[#1a1a1a] mb-4">
              Ready to shop smarter?
            </h2>
            <p className="text-[#666666] text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of users who are making better purchasing decisions with Attrixia's AI-powered recommendations.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-linear-to-r from-[#009FB8] to-[#006b7d] text-white px-10 py-4 rounded-2xl font-semibold hover:shadow-lg hover:shadow-[#009FB8]/30 transition border border-[#009FB8]/50"
            >
              Get Started Now
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
