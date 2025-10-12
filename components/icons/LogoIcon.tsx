import React from 'react';

export const LogoIcon = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#6366F1" />
      </linearGradient>
    </defs>
    {/* Abstract 'C' for Character/Creativity */}
    <path
      d="M16.5 18.25C19.125 16.5 21 13.5 21 10C21 5.025 16.975 1 12 1C7.025 1 3 5.025 3 10C3 14.975 7.025 19 12 19"
      stroke="url(#logoGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner 'Spark' or 'AI core' */}
    <path
      d="M12 7V13M9 10H15"
      stroke="url(#logoGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Smaller element suggesting generation/output */}
    <path
      d="M17 22L17.5 21M20.5 17.5L21 17"
      stroke="url(#logoGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
