"use client";

import React from "react";

interface AirtelLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "business";
}

export default function AirtelLogo({
  className = "",
  size = "md",
  variant = "business"
}: AirtelLogoProps) {
  const sizeMap = {
    sm: { icon: 24, font: "text-lg", badge: "text-[9px] px-1.5 py-0.5" },
    md: { icon: 32, font: "text-2xl", badge: "text-[10px] px-2 py-0.5" },
    lg: { icon: 42, font: "text-3xl", badge: "text-xs px-2.5 py-1" },
    xl: { icon: 54, font: "text-4xl", badge: "text-sm px-3 py-1" }
  };

  const { icon, font, badge } = sizeMap[size];

  // Iconic Bharti Airtel swirl / circular continuous ribbon emblem
  const iconSvg = (
    <svg
      width={icon}
      height={icon}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 drop-shadow-sm transition-transform duration-300 hover:scale-105"
    >
      <circle cx="32" cy="32" r="30" fill="#E40000" />
      {/* Official styled Airtel 'a' swirl */}
      <path
        d="M32 14C23.163 14 16 21.163 16 30C16 38.837 23.163 46 32 46C37.5 46 42.4 43.2 45.3 39L40.2 35.8C38.3 38.4 35.3 40 32 40C26.477 40 22 35.523 22 30C22 24.477 26.477 20 32 20C36.8 20 40.8 23.4 41.8 28H32V34H48C48 22.954 40.837 14 32 14Z"
        fill="white"
      />
      <circle cx="43" cy="24" r="3.5" fill="#FFE500" />
    </svg>
  );

  if (variant === "icon") {
    return <div className={`inline-flex items-center ${className}`}>{iconSvg}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {iconSvg}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-tight text-neutral-900 dark:text-white ${font} leading-none font-sans`}>
            airtel
          </span>
          {variant === "business" && (
            <span
              className={`font-bold uppercase tracking-wider bg-[#E40000] text-white rounded-md shadow-xs ${badge}`}
            >
              Business
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold tracking-widest text-[#E40000] uppercase mt-0.5">
          SYNC • Enterprise MSME
        </span>
      </div>
    </div>
  );
}
