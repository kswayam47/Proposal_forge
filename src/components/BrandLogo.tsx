import React from 'react';

interface BrandLogoProps {
    className?: string;
    color?: string;
    opacity?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
    className = "",
    color = "currentColor",
    opacity = 1
}) => {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ opacity }}
        >
            {/* Main Stylized A/Chevron */}
            <path
                d="M15 88L50 28L85 88"
                stroke={color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
