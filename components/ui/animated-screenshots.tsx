"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function AnimatedScreenshots() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={cn(
        "relative w-full h-full transform-gpu transition-opacity duration-1000",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Main container with perspective */}
      <div className="absolute inset-0 perspective-distant">
        {/* The container that applies the rotation */}
        <div className="relative h-full w-full" style={{ transformStyle: "preserve-3d", transform: "rotateX(20deg)" }}>
          
          {/* Dashboard screenshot - main UI */}
          <div 
            className="absolute inset-0 rounded-lg overflow-hidden border border-white/20 shadow-2xl"
            style={{ 
              transform: "translateZ(0) skewX(10deg) rotateY(-8deg)",
              transformOrigin: "left bottom",
            }}
          >
            <Image 
              src="/Screenshot 2025-05-04 at 18.06.39.png" 
              alt="Dashboard" 
              className="w-full h-full object-cover rounded-lg"
              width={1200}
              height={800}
              priority
            />
            
            {/* Browser Chrome Overlay */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-black/80 border-b border-white/20 rounded-t-lg flex items-center px-3">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 opacity-80"></div>
              </div>
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-8 flex items-center">
                <div className="px-3 py-1 text-xs text-white/60 rounded bg-black/40">
                  app.prcat.dev
                </div>
              </div>
            </div>
          </div>
          
          {/* Secondary screenshot - floating to the right */}
          <div 
            className="absolute top-[10%] -right-[5%] w-[40%] h-[40%] rounded-lg overflow-hidden border border-white/20 shadow-2xl"
            style={{ 
              transform: "translateZ(40px) translateX(-20px) rotateY(-8deg)",
              transformOrigin: "right center",
              animation: "float 6s ease-in-out infinite"
            }}
          >
            <Image 
              src="/Screenshot 2025-05-04 at 18.07.02.png" 
              alt="Analytics Panel" 
              className="w-full h-full object-cover rounded-lg"
              width={600}
              height={400}
            />
          </div>
          
          {/* Third screenshot - floating at bottom left */}
          <div 
            className="absolute bottom-[5%] left-[5%] w-[35%] h-[30%] rounded-lg overflow-hidden border border-white/20 shadow-2xl"
            style={{ 
              transform: "translateZ(80px) translateY(-20px) rotateY(5deg)",
              transformOrigin: "left center",
              animation: "float 6s ease-in-out infinite 2s"
            }}
          >
            <Image 
              src="/Screenshot 2025-05-04 at 18.07.33.png" 
              alt="Code Panel" 
              className="w-full h-full object-cover rounded-lg"
              width={500}
              height={300}
            />
          </div>
          
          {/* Fourth screenshot - floating small on the right */}
          <div 
            className="absolute top-[50%] -right-[5%] w-[30%] h-[25%] rounded-lg overflow-hidden border border-white/20 shadow-2xl"
            style={{ 
              transform: "translateZ(60px) translateY(10px) rotateY(-10deg)",
              transformOrigin: "right center",
              animation: "float 6s ease-in-out infinite 1s"
            }}
          >
            <Image 
              src="/Screenshot 2025-05-04 at 18.09.15.png" 
              alt="Settings Panel" 
              className="w-full h-full object-cover rounded-lg"
              width={400}
              height={250}
            />
          </div>
          
          {/* Glowing dot decoration */}
          <div 
            className="absolute top-[20%] right-[15%] w-24 h-24 rounded-full"
            style={{ 
              background: "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0.1) 50%, transparent 80%)",
              animation: "pulse 4s ease-in-out infinite"
            }}
          />
          
          {/* Glowing dot decoration */}
          <div 
            className="absolute bottom-[30%] left-[25%] w-16 h-16 rounded-full"
            style={{ 
              background: "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.1) 50%, transparent 80%)",
              animation: "pulse 4s ease-in-out infinite 1s"
            }}
          />
        </div>
      </div>

      {/* Global animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateZ(40px); }
          50% { transform: translateY(-10px) translateZ(40px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
} 