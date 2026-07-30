// pages/landing/HowItWorks.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiFilter, FiCheckCircle, FiArrowRight, FiBarChart, FiShoppingBag } from 'react-icons/fi';

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      icon: <FiSearch className="text-5xl text-[#009FB8]" />,
      title: "Tell Atrixia Your Needs",
      description: "Share what you're looking for. Add filters like budget, brand, specifications, or any criteria that matter to you.",
      details: [
        "Set your budget range",
        "Choose brand preferences",
        "Specify key features",
        "Add any constraints"
      ]
    },
    {
      number: "02",
      icon: <FiFilter className="text-5xl text-[#009FB8]" />,
      title: "AI Analyzes Products",
      description: "Our advanced AI engine analyzes thousands of products in your category and finds the best matches for your requirements.",
      details: [
        "Cross-reference specifications",
        "Compare price-to-value",
        "Calculate compatibility scores",
        "Generate insights"
      ]
    },
    {
      number: "03",
      icon: <FiBarChart className="text-5xl text-[#009FB8]" />,
      title: "Get Smart Recommendations",
      description: "Receive a detailed analysis with top recommendations, trade-offs analysis, confidence scores, and why each product matches your needs.",
      details: [
        "Personalized recommendations",
        "Detailed comparisons",
        "Confidence scores",
        "Expert insights"
      ]
    },
    {
      number: "04",
      icon: <FiShoppingBag className="text-5xl text-[#009FB8]" />,
      title: "Make Your Decision",
      description: "Save products to your wishlist, compare side-by-side, and visit the store links when you're ready to purchase.",
      details: [
        "Save to wishlist",
        "Compare products",
        "View store links",
        "Track prices"
      ]
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-gray-50 via-white to-gray-50">
      {/* Grid Background */}
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

      <div className="relative z-10">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          <div className="text-center mb-20">
            <div className="inline-block mb-4 px-4 py-2 bg-[#009FB8]/10 backdrop-blur-sm rounded-full border border-[#009FB8]/20">
              <p className="text-[#009FB8] font-semibold text-sm">4 Simple Steps</p>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif-brand font-bold text-[#1a1a1a] mb-4">
              How Atrixia <span className="text-[#009FB8]">Works</span>
            </h1>
            <p className="text-lg text-[#666666] max-w-2xl mx-auto">
              Smart shopping starts with understanding your needs and finding the perfect product match
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-12 mb-20">
            {steps.map((step, index) => (
              <div key={index}>
                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-md border border-gray-200/50 overflow-hidden hover:shadow-lg hover:border-[#009FB8]/30 transition">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* Content */}
                    <div className="p-8 md:p-12 flex flex-col justify-center">
                      <div className="mb-4">
                        <span className="text-5xl font-serif-brand font-bold text-[#009FB8]/30">{step.number}</span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-semibold text-[#1a1a1a] mb-3">
                        {step.title}
                      </h3>
                      <p className="text-[#666666] text-base md:text-lg leading-relaxed mb-6">
                        {step.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {step.details.map((detail, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <FiCheckCircle className="text-[#009FB8] text-lg shrink-0" />
                            <span className="text-sm text-[#666666]">{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="hidden lg:flex items-center justify-center p-12 bg-linear-to-br from-[#009FB8]/5 to-[#006b7d]/5">
                      <div className="p-8 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200/50">
                        {step.icon}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-8">
                    <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-gray-200/50">
                      <FiArrowRight className="text-[#009FB8] text-xl rotate-90" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Why Section */}
          <div className="bg-white/40 backdrop-blur-md rounded-3xl border border-gray-200/50 p-12 md:p-16 mb-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-4xl font-bold text-[#009FB8] mb-2">Fast</p>
                <p className="text-[#666666]">Get recommendations in minutes instead of hours of research</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-[#009FB8] mb-2">Accurate</p>
                <p className="text-[#666666]">AI-powered analysis with 99% accuracy in recommendations</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-[#009FB8] mb-2">Confident</p>
                <p className="text-[#666666]">Know why each product is recommended with detailed explanations</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-serif-brand font-bold text-[#1a1a1a] mb-6">
              Ready to get started?
            </h2>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-linear-to-r from-[#009FB8] to-[#006b7d] text-white px-10 py-4 rounded-2xl font-semibold hover:shadow-lg hover:shadow-[#009FB8]/30 transition border border-[#009FB8]/50"
            >
              Try Atrixia Now
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;