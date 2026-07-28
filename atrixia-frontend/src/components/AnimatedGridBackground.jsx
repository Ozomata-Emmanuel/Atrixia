// components/AnimatedGridBackground.jsx
import React, { useMemo } from 'react';

// Generate grid cells once (module-level, outside component)
const generateGridCells = () => {
  return Array.from({ length: 1200 }, () => ({
    isColored: Math.random() > 0.5,
    hue: Math.random() * 360,
  }));
};

// Create the grid cells once when the module loads
const gridCells = generateGridCells();

const AnimatedGridBackground = ({ 
  opacity = 0.08,
  className = '',
  zIndex = 0 
}) => {
  return (
    <div 
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex }}
    >
      <div
        className="absolute -left-15 -top-15"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(40, 100px)",
          gridAutoRows: "100px",
          animation: "moveGrid 25s linear infinite",
        }}
      >
        {gridCells.map((cell, i) => (
          <div
            key={i}
            style={{
              backgroundColor: cell.isColored
                ? `hsla(${cell.hue}, 80%, 60%, ${opacity})`
                : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AnimatedGridBackground;