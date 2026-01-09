'use client';
import React, { useState, useEffect } from "react";
import { ButtonProps, ButtonType } from "@/types/button";

const Button = ({
  title,
  icon,
  className,
  action,
  buttonType = "default",
  disabled = false, 
  isActive = false, 
}: ButtonProps & { 
  action?: () => void; 
  buttonType?: ButtonType; 
  disabled?: boolean;
  isActive?: boolean;
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getButtonStyle = (buttonType: ButtonType, isActive: boolean) => {
    let baseStyle = '';
    let hoverStyle = '';

    switch (buttonType) {
      case "pocetna":
        baseStyle = isActive ? "bg-sky-800 text-white border-sky-800" : "bg-white text-sky-800 border-sky-800"; 
        hoverStyle = "hover:bg-sky-700 hover:text-white hover:border-sky-700";
        break;
      case "izvodi":
        baseStyle = isActive ? "bg-yellow-500 text-white border-yellow-500" : "bg-white text-yellow-500 border-yellow-500"; 
        hoverStyle = "hover:bg-yellow-400 hover:text-white hover:border-yellow-400";
        break;
      case "podesavanja":
        baseStyle = isActive ? "bg-sky-500 text-white border-sky-500" : "bg-white text-sky-500 border-sky-500"; 
        hoverStyle = "hover:bg-sky-400 hover:text-white hover:border-sky-400";
        break;
      case "salon":
        baseStyle = isActive ? "bg-purple-300 text-white border-purple-300" : "bg-white text-purple-300 border-purple-300"; 
        hoverStyle = "hover:bg-purple-200 hover:text-white hover:border-purple-400";
        break;
      case "nalog": 
        baseStyle = isActive ? "bg-red-500 text-white border-red-500" : "bg-white text-red-500 border-red-500"; 
        hoverStyle = "hover:bg-red-400 hover:text-white hover:border-red-400"; 
        break;
      default:
        baseStyle = "bg-white text-black border-gray-300"; 
        hoverStyle = "hover:bg-gray-200 hover:text-black hover:border-gray-400";
        break;
    }

    return `${baseStyle} ${hoverStyle}`;
  };

  if (!isMounted) return null;

  // Provera ukoliko postoji titl na dugmetu nece se staviti jos jedan zbog dupliranja teksta
  const hasTitle = title && title !== "";

  return (
    <button
      onClick={action} 
      disabled={disabled} 
      className={`
        w-full border py-2.5 text-md rounded-xl cursor-pointer flex items-center transition-all duration-200
        ${hasTitle ? "justify-start px-4 space-x-3" : "justify-center px-0"} 
        ${getButtonStyle(buttonType, isActive)} 
        ${disabled ? "opacity-50 cursor-not-allowed" : ""} 
        ${className}
      `}
      title={!hasTitle ? title : undefined}
    >
      {/* Ikonica */}
      {icon && (
        <span className={`flex items-center justify-center text-inherit shrink-0 transition-transform ${!hasTitle ? "scale-110" : ""}`}>
          {icon}
        </span>
      )}

      {/* Tekst dugmeta */}
      {hasTitle && (
        <span className="text-inherit font-semibold whitespace-nowrap overflow-hidden animate-in fade-in duration-500">
          {title}
        </span>
      )}
    </button>
  );
};

export default Button;