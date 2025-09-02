import { useEffect, useRef } from "react";
import { useBackground } from "./context";

const Background = ({}) => {
  const canvasRef = useRef(null);
  const { showDots, showGradient, selectedPreset } = useBackground();

  useEffect(() => {
    if (!showDots) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let particles = [];
    let mouse = { x: null, y: null };
    let animationFrameId;
    let time = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize particles with additional properties for animations
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        originalX: Math.random() * canvas.width,
        originalY: Math.random() * canvas.height,
        radius: Math.random() * 10 + 2,
        baseRadius: Math.random() * 5 + 2,
        speed: Math.random() * 0.5 + 0.5,
        angle: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.8,
        baseOpacity: 0.8,
      });
      particles[i].originalX = particles[i].x;
      particles[i].originalY = particles[i].y;
    }

    const updateParticles = (animationType) => {
      particles.forEach((p, index) => {
        switch (animationType) {
          case 'wave':
            // Wave animation - sine wave motion
            p.x = p.originalX + Math.sin(time * 0.02 + p.phase) * 30;
            p.y += p.speed;
            if (p.y > canvas.height) {
              p.y = 0;
              p.originalX = Math.random() * canvas.width;
            }
            break;

          case 'glow':
            // Glow animation - pulsing opacity and size
            p.y += p.speed;
            p.opacity = p.baseOpacity + Math.sin(time * 0.05 + p.phase) * 0.3;
            p.radius = p.baseRadius + Math.sin(time * 0.03 + p.phase) * 1.5;
            if (p.y > canvas.height) {
              p.y = 0;
              p.x = Math.random() * canvas.width;
            }
            break;

          case 'float':
            // Float animation - gentle up and down motion
            p.x += Math.sin(time * 0.01 + p.phase) * 0.5;
            p.y += p.speed + Math.sin(time * 0.02 + p.phase) * 0.8;
            if (p.y > canvas.height) {
              p.y = 0;
              p.x = Math.random() * canvas.width;
            }
            break;

          case 'drift':
            // Drift animation - horizontal drifting motion
            p.x += Math.sin(time * 0.008 + p.phase) * 2;
            p.y += p.speed;
            if (p.y > canvas.height) {
              p.y = 0;
              p.x = Math.random() * canvas.width;
            }
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            break;

          case 'pulse':
            // Pulse animation - rhythmic size changes
            p.y += p.speed;
            p.radius = p.baseRadius + Math.sin(time * 0.1 + index * 0.5) * 2;
            p.opacity = p.baseOpacity + Math.sin(time * 0.08 + index * 0.3) * 0.4;
            if (p.y > canvas.height) {
              p.y = 0;
              p.x = Math.random() * canvas.width;
            }
            break;

          case 'shimmer':
            // Shimmer animation - sparkling effect with rapid opacity changes
            p.y += p.speed;
            p.opacity = Math.random() > 0.7 ? 1 : p.baseOpacity * 0.3;
            p.radius = p.opacity > 0.8 ? p.baseRadius * 1.5 : p.baseRadius;
            if (p.y > canvas.height) {
              p.y = 0;
              p.x = Math.random() * canvas.width;
            }
            break;

          default:
            // Default fallback - original behavior
            p.y += p.speed;
            if (p.y > canvas.height) {
              p.y = 0;
              p.x = Math.random() * canvas.width;
            }
        }

        // Mouse interaction (applies to all animations)
        if (mouse.x !== null && mouse.y !== null) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            p.x += dx / 10;
            p.y += dy / 10;
          }
        }
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const animationType = selectedPreset?.animation || 'default';
      updateParticles(animationType);
      
      ctx.beginPath();
      particles.forEach((p) => {
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      time++;
      animationFrameId = requestAnimationFrame(draw);
    };

    // Mouse tracking for interaction
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Reinitialize particles for new canvas size
      particles.forEach(p => {
        p.originalX = Math.random() * canvas.width;
        p.originalY = Math.random() * canvas.height;
        if (p.x > canvas.width) p.x = Math.random() * canvas.width;
        if (p.y > canvas.height) p.y = Math.random() * canvas.height;
      });
    };
    
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [showDots, selectedPreset?.animation]); // Added selectedPreset?.animation to dependencies

  return (
    <>
      {showGradient && (
        <div
          className={`min-h-screen fixed inset-0 -z-20 animate-gradient bg-gradient-to-r ${
            selectedPreset?.gradient || "from-pink-500 via-red-500 to-yellow-500"
          }`}
        />
      )}
      {showDots && <canvas ref={canvasRef} className="fixed inset-0 -z-10" />}
    </>
  );
};

export default Background;