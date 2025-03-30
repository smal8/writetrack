import { useEffect, useRef, useState } from 'react';

export function WaveAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState<Array<{x: number, y: number, size: number, opacity: number, maxSize: number}>>([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match window size
    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);
    
    // Animation variables
    let animationFrameId: number;
    let offset = 0;
    
    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePosition({ x, y });
    };
    
    // Handle mouse enter/leave
    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);
    
    // Handle click to create ripples
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setClickPosition({ x, y });
      setIsClicked(true);
      
      // Add a new ripple
      setRipples(prev => [
        ...prev, 
        { 
          x, 
          y, 
          size: 0, 
          opacity: 0.4,
          maxSize: Math.min(canvas.width, canvas.height) * 0.3
        }
      ]);
      
      // Set timeout to reset click state
      setTimeout(() => setIsClicked(false), 300);
    };
    
    // Add event listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);
    
    // Draw function
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate wave properties based on mouse position
      const mouseXInfluence = isHovering 
        ? (mousePosition.x / canvas.width) * 0.7 + 0.3 
        : 1;
      const mouseYInfluence = isHovering 
        ? (mousePosition.y / canvas.height) * 0.7 + 0.3 
        : 1;
      
      // Increase frequency near mouse position
      const baseFrequency1 = 0.01;
      const baseFrequency2 = 0.015;
      const baseFrequency3 = 0.008;
      
      let frequency1 = baseFrequency1;
      let frequency2 = baseFrequency2;
      let frequency3 = baseFrequency3;
      
      if (isHovering) {
        // Calculate distance from mouse to center of each wave
        const center1 = canvas.height / 2;
        const center2 = canvas.height / 2;
        const center3 = canvas.height / 2;
        
        const distance1 = Math.abs(mousePosition.y - center1) / canvas.height;
        const distance2 = Math.abs(mousePosition.y - center2) / canvas.height;
        const distance3 = Math.abs(mousePosition.y - center3) / canvas.height;
        
        // Adjust frequency based on mouse proximity
        frequency1 = baseFrequency1 * (1 + (1 - distance1) * 0.5);
        frequency2 = baseFrequency2 * (1 + (1 - distance2) * 0.7);
        frequency3 = baseFrequency3 * (1 + (1 - distance3) * 0.3);
      }
      
      // Add click effect to the amplitude
      const clickEffect = isClicked ? 1.5 : 1;
      
      // Draw multiple sinusoidal waves with light gray tones
      drawWave(
        ctx, 
        canvas.width, 
        canvas.height, 
        offset, 
        frequency1 * mouseXInfluence, 
        50 * mouseYInfluence * clickEffect, 
        'rgba(220, 220, 220, 0.25)'
      );
      
      drawWave(
        ctx, 
        canvas.width, 
        canvas.height, 
        offset * 0.8, 
        frequency2 * mouseXInfluence, 
        70 * mouseYInfluence * clickEffect, 
        'rgba(240, 240, 240, 0.2)'
      );
      
      drawWave(
        ctx, 
        canvas.width, 
        canvas.height, 
        offset * 1.2, 
        frequency3 * mouseXInfluence, 
        30 * mouseYInfluence * clickEffect, 
        'rgba(200, 200, 200, 0.3)'
      );
      
      // Draw ripple effects
      if (ripples.length > 0) {
        setRipples(prev => 
          prev.map(ripple => {
            // Draw ripple
            ctx.beginPath();
            ctx.arc(ripple.x, ripple.y, ripple.size, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(180, 180, 180, ${ripple.opacity})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Update ripple
            const newSize = ripple.size + 5;
            const newOpacity = ripple.opacity - 0.01;
            
            // Remove ripple if it's too big or transparent
            if (newSize > ripple.maxSize || newOpacity <= 0) {
              return null;
            }
            
            return {
              ...ripple,
              size: newSize,
              opacity: newOpacity
            };
          }).filter(Boolean) as Array<{x: number, y: number, size: number, opacity: number, maxSize: number}>
        );
      }
      
      // Update offset for animation - speed varies with mouse position
      const speedFactor = isHovering ? (mouseXInfluence * 2) : 1;
      offset += 0.5 * speedFactor;
      
      // Request next frame
      animationFrameId = requestAnimationFrame(draw);
    };
    
    // Start animation
    draw();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePosition, isHovering, isClicked, clickPosition, ripples]);
  
  // Function to draw a single wave
  const drawWave = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    offset: number, 
    frequency: number, 
    amplitude: number, 
    color: string
  ) => {
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    
    for (let x = 0; x < width; x++) {
      const y = Math.sin((x + offset) * frequency) * amplitude + height / 2;
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    ctx.fillStyle = color;
    ctx.fill();
  };
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-0 cursor-pointer"
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
} 