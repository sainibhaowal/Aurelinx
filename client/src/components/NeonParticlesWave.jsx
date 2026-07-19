"use client";

import React, { useEffect, useRef } from "react";

const NeonParticlesWave = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    // Particle settings
    // 2500 particles is a sweet spot for high density & buttery performance
    const particleCount = 3000; 
    const particles = [];

    // Mouse tracking
    const mouse = {
      x: null,
      y: null,
      radius: 120, // Interaction radius
    };

    // Initialize particles
    // Let's create an organic grid/wave shape of particles
    for (let i = 0; i < particleCount; i++) {
      // Distribute particles across the canvas space
      const px = Math.random() * width;
      const py = Math.random() * height;
      
      // Select varying neon cyan/blue/emerald colors with alpha for depth
      const colors = [
        "rgba(34, 211, 238, ",  // Cyan
        "rgba(52, 211, 153, ",  // Emerald
        "rgba(129, 140, 248, ", // Indigo
      ];
      const colorBase = colors[Math.floor(Math.random() * colors.length)];
      const opacity = 0.2 + Math.random() * 0.6;

      particles.push({
        x: px,
        y: py,
        baseX: px,
        baseY: py,
        size: 0.4 + Math.random() * 0.9, // Very tiny particles (under 1.5px)
        color: `${colorBase}${opacity})`,
        angle: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.5,
        phase: Math.random() * 100, // Offset for wave functions
        waveAmpX: 10 + Math.random() * 30,
        waveAmpY: 15 + Math.random() * 45,
        waveSpeed: 0.005 + Math.random() * 0.015,
      });
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      
      // Re-distribute base positions on resize
      particles.forEach((p) => {
        p.baseX = Math.random() * width;
        p.baseY = Math.random() * height;
      });
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let time = 0;
    const animate = () => {
      time += 0.5;
      
      // Very slight tail effect to keep particles sharp but allow wave blending
      ctx.fillStyle = "rgba(7, 17, 31, 0.08)";
      ctx.fillRect(0, 0, width, height);

      // Draw dot grid in background inside canvas to make it feel coherent and single layer
      ctx.fillStyle = "rgba(103, 232, 249, 0.02)";
      const dotSpacing = 30;
      for (let x = 0; x < width; x += dotSpacing) {
        for (let y = 0; y < height; y += dotSpacing) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Render/update particles
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        // Wave movement (Sine wave nature flow)
        // Combine multiple sine waves for rich, non-repeating organic motion
        const waveX = Math.sin(p.phase + time * p.waveSpeed) * p.waveAmpX;
        const waveY = Math.cos(p.phase + time * p.waveSpeed * 0.8) * p.waveAmpY + 
                      Math.sin(p.phase * 0.5 + time * 0.02) * 15;

        let targetX = p.baseX + waveX;
        let targetY = p.baseY + waveY;

        // Mouse interaction (Fluid push effect)
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - targetX;
          const dy = mouse.y - targetY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            // Push direction
            const angle = Math.atan2(dy, dx);
            const pushX = Math.cos(angle) * force * 45;
            const pushY = Math.sin(angle) * force * 45;
            
            targetX -= pushX;
            targetY -= pushY;
          }
        }

        // Smoothly interpolate to target position
        p.x += (targetX - p.x) * 0.15;
        p.y += (targetY - p.y) * 0.15;

        // Boundary checks to wrap particles around screen edges
        if (p.x < 0) {
          p.x = width;
          p.baseX = width;
        } else if (p.x > width) {
          p.x = 0;
          p.baseX = 0;
        }

        if (p.y < 0) {
          p.y = height;
          p.baseY = height;
        } else if (p.y > height) {
          p.y = 0;
          p.baseY = 0;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80"
      style={{ mixBlendMode: "screen" }}
    />
  );
};

export default NeonParticlesWave;
