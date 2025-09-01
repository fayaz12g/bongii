import { useEffect, useRef } from "react";
import { useBackground } from "./context";

const Background = ({ }) => {
  const canvasRef = useRef(null);
  const { showDots, showGradient, selectedPreset } = useBackground();

  useEffect(() => {
    if (!showDots) return; // Skip dots if disabled

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let particles = [];
    let mouse = { x: null, y: null };
    let animationFrameId;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 3 + 2,
        speed: Math.random() * 1 + 0.5,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      particles.forEach((p) => {
        p.y += p.speed;
        if (p.y > canvas.height) {
          p.y = 0;
          p.x = Math.random() * canvas.width;
        }

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          p.x += dx / 10;
          p.y += dy / 10;
        }

        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      });
      ctx.fill();
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [showDots]);

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
