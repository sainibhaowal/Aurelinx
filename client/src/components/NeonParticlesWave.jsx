"use client";

import React, { useEffect, useRef } from "react";

const NeonParticlesWave = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId = null;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    // Density-scaled particle count — more atoms on bigger hero surfaces
    const particleCount = Math.min(
      3400,
      Math.max(1400, Math.round((width * height) / 520)),
    );
    const particles = [];

    // Mouse tracking — subtle, not a torch: tight radius, faint halo
    const mouse = {
      x: null,
      y: null,
      radius: 110, // Interaction radius
    };
    // Click ripple burst { x, y, start }
    let burst = null;

    const colors = [
      { base: "163, 230, 53", glow: "190, 242, 100" },   // Lime
      { base: "52, 211, 153", glow: "110, 231, 183" },   // Emerald
      { base: "129, 140, 248", glow: "165, 180, 252" },  // Violet
      { base: "217, 70, 239", glow: "240, 171, 252" },   // Fuchsia
    ];

    for (let i = 0; i < particleCount; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const palette = colors[Math.floor(Math.random() * colors.length)];
      // Every 22nd particle is a brighter "atom core" for depth
      const isCore = i % 22 === 0;

      particles.push({
        x: px,
        y: py,
        baseX: px,
        baseY: py,
        size: isCore ? 1.5 + Math.random() * 1.1 : 0.5 + Math.random() * 0.9,
        rgb: palette.base,
        glow: palette.glow,
        opacity: 0.25 + Math.random() * 0.5,
        isCore,
        angle: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.4,
        phase: Math.random() * 100,
        waveAmpX: 10 + Math.random() * 25,
        waveAmpY: 15 + Math.random() * 35,
        waveSpeed: 0.004 + Math.random() * 0.012,
      });
    }

    // Cache the bounding rectangle to prevent layout thrashing (reflows) on mousemove
    let rect = canvas.getBoundingClientRect();

    // Only interact when the cursor is actually over the hero canvas —
    // scrolled-away page areas must never trigger particle effects
    const inBounds = (x, y) => x >= -20 && y >= -20 && x <= width + 20 && y <= height + 20;

    const handleMouseMove = (e) => {
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (!inBounds(px, py)) {
        mouse.x = null;
        mouse.y = null;
        return;
      }
      mouse.x = px;
      mouse.y = py;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const handleMouseDown = (e) => {
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (!inBounds(px, py)) return;
      burst = {
        x: px,
        y: py,
        start: performance.now(),
      };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });

    const handleResize = () => {
      if (!canvas) return;
      rect = canvas.getBoundingClientRect();
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;

      particles.forEach((p) => {
        p.baseX = Math.random() * width;
        p.baseY = Math.random() * height;
      });
    };
    window.addEventListener("resize", handleResize, { passive: true });

    const handleScroll = () => {
      if (!canvas) return;
      rect = canvas.getBoundingClientRect();
      // Cursor may now be outside the canvas → disable interaction immediately
      if (mouse.x !== null && !inBounds(mouse.x, mouse.y)) {
        mouse.x = null;
        mouse.y = null;
      }
    };
    // The page scrolls inside #landing-scroll-root, NOT the window —
    // listening on window alone leaves rect stale and the effect floating
    const scrollRoot = document.getElementById("landing-scroll-root");
    if (scrollRoot) {
      scrollRoot.addEventListener("scroll", handleScroll, { passive: true });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Animation Loop with delta time mapping for smooth 120Hz-200Hz+ refresh rates
    let lastTimestamp = performance.now();
    let time = 0;
    let isVisible = true;

    const animate = (timestamp) => {
      if (!isVisible) {
        animationFrameId = null;
        return;
      }

      const elapsed = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      // Target 60fps as base factor (16.67ms per frame)
      const delta = Math.min(elapsed / 16.667, 3);
      time += 0.5 * delta;

      // Clear the canvas on each frame to prevent trace artifacts
      ctx.clearRect(0, 0, width, height);

      // Soft halo light that follows the cursor through the atom field
      if (mouse.x !== null && mouse.y !== null) {
        const halo = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, 48,
        );
        halo.addColorStop(0, "rgba(110, 231, 183, 0.06)");
        halo.addColorStop(1, "rgba(110, 231, 183, 0)");
        ctx.fillStyle = halo;
        ctx.fillRect(mouse.x - 48, mouse.y - 48, 96, 96);
      }

      // Click ripple burst decay (500ms)
      let burstForce = 0;
      if (burst) {
        const age = timestamp - burst.start;
        if (age > 500) {
          burst = null;
        } else {
          burstForce = 45 * (1 - age / 500);
        }
      }

      // Render/update particles
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        // Wave movement
        const waveX = Math.sin(p.phase + time * p.waveSpeed) * p.waveAmpX;
        const waveY =
          Math.cos(p.phase + time * p.waveSpeed * 0.8) * p.waveAmpY +
          Math.sin(p.phase * 0.5 + time * 0.02) * 12;

        let targetX = p.baseX + waveX;
        let targetY = p.baseY + waveY;

        // Mouse push interaction + constellation lines
        let nearMouse = false;
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - targetX;
          const dy = mouse.y - targetY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < mouse.radius) {
            nearMouse = true;
            const force = (mouse.radius - distance) / mouse.radius;
            const angle = Math.atan2(dy, dx);
            // Soft-close exponential push keeps the field alive without chaos
            const push = force * force * 32;
            targetX -= Math.cos(angle) * push;
            targetY -= Math.sin(angle) * push;

            // Faint connection threads from nearby atoms to the cursor
            ctx.strokeStyle = `rgba(${p.glow}, ${0.1 * force * (p.isCore ? 1.4 : 1)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        // Click ripple: radial impulse pushing atoms outward
        if (burstForce > 0 && burst) {
          const bdx = p.x - burst.x;
          const bdy = p.y - burst.y;
          const bd = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
          if (bd < 220) {
            const bForce = burstForce * (1 - bd / 220);
            targetX += (bdx / bd) * bForce;
            targetY += (bdy / bd) * bForce;
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

        // Twinkle + brighten when the cursor reaches out
        const twinkle = 0.72 + 0.28 * Math.sin(time * 0.045 + p.phase * 3);
        const alpha = Math.min(1, p.opacity * twinkle * (nearMouse ? 1.5 : 1));

        // Draw particle using fast GPU-friendly fillRect
        ctx.fillStyle = `rgba(${p.rgb}, ${alpha})`;
        const s = p.size * (nearMouse ? 1.5 : 1);
        ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    // Use Intersection Observer to pause drawing loop when canvas is off-screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          lastTimestamp = performance.now();
          if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(animate);
          }
        } else {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        }
      },
      { threshold: 0.01 }
    );

    observer.observe(canvas);

    return () => {
      observer.disconnect();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      const root = document.getElementById("landing-scroll-root");
      if (root) root.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-90"
      style={{ mixBlendMode: "screen", willChange: "transform" }}
    />
  );
};

export default NeonParticlesWave;
