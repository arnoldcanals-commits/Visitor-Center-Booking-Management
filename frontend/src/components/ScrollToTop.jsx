import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

const ScrollToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Show button when page is scrolled down
    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    return (
        <div className="fixed bottom-8 right-8 z-[100]">
            {isVisible && (
                <button
                    onClick={scrollToTop}
                    className="p-3 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 transition-all transform hover:scale-110 active:scale-95 border-2 border-white"
                    aria-label="Scroll to top"
                >
                    <ChevronUp size={24} strokeWidth={3} />
                </button>
            )}
        </div>
    );
};

export default ScrollToTop;