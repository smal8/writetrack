import { useEffect, useRef } from 'react';

interface ThreeDBackgroundProps {
  children: React.ReactNode;
}

export function ThreeDBackground({ children }: ThreeDBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!particlesRef.current) return;
    
    // Create particles
    const particleContainer = particlesRef.current;
    const particleCount = 30;
    
    // Clear any existing particles
    particleContainer.innerHTML = '';
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Random positioning and sizes
      const size = Math.random() * 20 + 5;
      const xPos = Math.random() * 100;
      const yPos = Math.random() * 100;
      const zPos = Math.random() * 50 - 25;
      const opacity = Math.random() * 0.4 + 0.1;
      const animationDelay = Math.random() * 20;
      const animationDuration = Math.random() * 20 + 15;
      
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${xPos}%`;
      particle.style.top = `${yPos}%`;
      particle.style.opacity = opacity.toString();
      particle.style.transform = `translateZ(${zPos}px)`;
      particle.style.animationDelay = `${animationDelay}s`;
      particle.style.animationDuration = `${animationDuration}s`;
      
      particleContainer.appendChild(particle);
    }
    
    // Handle mouse movement for parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
      
      particleContainer.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  return (
    <div className="three-d-container" ref={containerRef}>
      <div className="particles-container" ref={particlesRef}></div>
      <div className="content-container">
        {children}
      </div>
    </div>
  );
} 