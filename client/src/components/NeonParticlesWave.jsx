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

    // Particle settings optimized for 120Hz+ buttery performance
    const particleCount = 800; 
    const particles = [];

    // Mouse tracking
    const mouse = {
      x: null,
      y: null,
      radius: 140, // Interaction radius
    };

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      
      const colors = [
        "rgba(34, 211, 238, ",  // Cyan
        "rgba(52, 211, 153, ",  // Emerald
        "rgba(129, 140, 248, ", // Indigo
      ];
      const colorBase = colors[Math.floor(Math.random() * colors.length)];
      const opacity = 0.25 + Math.random() * 0.55;

      particles.push({
        x: px,
        y: py,
        baseX: px,
        baseY: py,
        size: 0.5 + Math.random() * 0.8, // Very tiny performance-friendly size
        color: `${colorBase}${opacity})`,
        angle: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.4,
        phase: Math.random() * 100,
        waveAmpX: 10 + Math.random() * 25,
        waveAmpY: 15 + Math.random() * 35,
        waveSpeed: 0.004 + Math.random() * 0.012,
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
      
      particles.forEach((p) => {
        p.baseX = Math.random() * width;
        p.baseY = Math.random() * height;
      });
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop with delta time mapping for smooth 120Hz-200Hz refresh rates
    let lastTimestamp = performance.now();
    let time = 0;
    
    const animate = (timestamp) => {
      const elapsed = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      
      // Target 60fps as base factor (16.67ms per frame)
      const delta = Math.min(elapsed / 16.667, 3);
      time += 0.5 * delta;
      
      // Slight tail trails
      ctx.fillStyle = "rgba(7, 17, 31, 0.08)";
      ctx.fillRect(0, 0, width, height);

      // Render/update particles
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        // Wave movement
        const waveX = Math.sin(p.phase + time * p.waveSpeed) * p.waveAmpX;
        const waveY = Math.cos(p.phase + time * p.waveSpeed * 0.8) * p.waveAmpY + 
                      Math.sin(p.phase * 0.5 + time * 0.02) * 12;

        let targetX = p.baseX + waveX;
        let targetY = p.baseY + waveY;

        // Mouse push interaction
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - targetX;
          const dy = mouse.y - targetY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            const angle = Math.atan2(dy, dx);
            const pushX = Math.cos(angle) * force * 35;
            const pushY = Math.sin(angle) * force * 35;
            
            targetX -= pushX;
            targetY -= pushY;
          }
        }

        // Interpolate using normalized delta time to make movement liquid-smooth
        p.x += (targetX - p.x) * 0.12 * delta;
        p.y += (targetY - p.y) * 0.12 * delta;

        // Boundary checks
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

        // Draw particle using fast GPU-friendly fillRect
        ctx.fillStyle = p.color;
        const size2 = p.size * 2;
        ctx.fillRect(p.x - p.size, p.y - p.size, size2, size2);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

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
