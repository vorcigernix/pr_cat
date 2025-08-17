'use client';

import { useState } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface DemoModeBannerProps {
  missingServices?: string[]; // Keep prop for backward compatibility but don't use it
  className?: string;
}

export function DemoModeBanner({ className }: DemoModeBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className={`flex justify-center ${className}`}>
      <div className="hover:bg-[#0f0f10] hover:border-t-[#262626] bg-[#111111] group mx-auto flex w-fit items-center gap-4 rounded-full border border-[#262626]/60 p-1 pl-4 shadow-md shadow-black/30 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[#f5f5f5] text-sm">Demo Mode • Sample Analytics Data</span>
        </div>
        <span className="border-[#0b0b0b] block h-4 w-0.5 border-l bg-[#3f3f46]"></span>
        
        <Link 
          href="https://github.com/vorcigernix/pr_cat#environment-setup"
          target="_blank"
          className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
        >
          <span>Connect GitHub</span>
        </Link>
        
        <div className="bg-[#0b0b0b] group-hover:bg-[#111111] size-6 overflow-hidden rounded-full duration-500">
          <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
            <span className="flex size-6">
              <ArrowRight className="m-auto size-3 text-white" />
            </span>
            <span className="flex size-6">
              <ArrowRight className="m-auto size-3 text-white" />
            </span>
          </div>
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="ml-1 mr-2 p-1 rounded-full hover:bg-[#1f1f1f] transition-colors duration-200"
        >
          <X className="w-3 h-3 text-gray-400 hover:text-gray-300" />
        </button>
      </div>
    </div>
  );
}
