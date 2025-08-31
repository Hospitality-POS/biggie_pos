import React, { useEffect, useState } from 'react';
import { usePrimaryColor } from "@context/PrimaryColorContext";

const EnhancedTawkWidget: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [tawkLoaded, setTawkLoaded] = useState(false);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [isOpening, setIsOpening] = useState(false);

    const primaryColor = usePrimaryColor();

    // Helper function to darken color for gradient effect
    const darkenColor = (color: string, percent: number = 20) => {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        const darkenedR = Math.round(r * (1 - percent / 100));
        const darkenedG = Math.round(g * (1 - percent / 100));
        const darkenedB = Math.round(b * (1 - percent / 100));

        return `#${darkenedR.toString(16).padStart(2, '0')}${darkenedG.toString(16).padStart(2, '0')}${darkenedB.toString(16).padStart(2, '0')}`;
    };

    // Helper function to convert hex to rgba
    const hexToRgba = (hex: string, alpha: number = 1) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    useEffect(() => {
        const hideStyle = document.createElement('style');
        hideStyle.id = 'hide-tawk-default';
        hideStyle.textContent = `
      #tawk-bubble-container,
      .tawk-chatbox,
      .tawk-min-chat-box,
      div[id*="tawk_"],
      iframe[id*="tawk"],
      [class*="tawk"]:not(.custom-tawk) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        position: absolute !important;
        left: -9999px !important;
      }
    `;
        document.head.appendChild(hideStyle);

        if (!window.Tawk_API) {
            console.log('Loading Tawk.to script...');

            window.Tawk_API = {};
            window.Tawk_LoadStart = new Date();

            window.Tawk_API.onLoad = function () {
                console.log('Tawk.to loaded successfully');
                setTawkLoaded(true);

                setTimeout(() => {
                    if (window.Tawk_API?.hideWidget) {
                        window.Tawk_API.hideWidget();
                        console.log('Default Tawk widget hidden');
                    }
                }, 100);
            };

            // Simulate new message notification for demo
            setTimeout(() => {
                setHasNewMessage(true);
            }, 5000);

            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://embed.tawk.to/68601213056789190faddc0c/1iurkd7gs';
            script.charset = 'UTF-8';
            script.setAttribute('crossorigin', '*');

            script.onload = () => console.log('Tawk script loaded');
            script.onerror = () => console.error('Tawk script failed to load');

            document.head.appendChild(script);
        } else {
            console.log('Tawk.to already loaded');
            setTawkLoaded(true);
        }

        return () => {
            const hideStyle = document.getElementById('hide-tawk-default');
            if (hideStyle) hideStyle.remove();
        };
    }, []);
    

    const handleChatClick = () => {
        // Show opening animation
        setIsOpening(true);
        setHasNewMessage(false);

        setTimeout(() => {
            if (tawkLoaded && window.Tawk_API) {
                try {
                    const hideStyle = document.getElementById('hide-tawk-default');
                    if (hideStyle) hideStyle.remove();

                    if (window.Tawk_API.maximize) {
                        window.Tawk_API.maximize();
                    }
                } catch (error) {
                    console.error('Error opening Tawk:', error);
                }
            } else {
                console.log('Tawk not ready yet');
            }

            // Reset opening state
            setTimeout(() => {
                setIsOpening(false);
            }, 500);
        }, 300);
    };

    if (!isVisible) return null;

    const darkenedColor = darkenColor(primaryColor);

    return (
        <>
            {/* Main chat widget */}
            <div
                className="custom-tawk"
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                    zIndex: 10000,
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    userSelect: 'none',
                    background: isOpening
                        ? `linear-gradient(135deg, ${darkenedColor} 0%, ${primaryColor} 100%)`
                        : primaryColor,
                    ...(hasNewMessage && {
                        animation: 'pulse 2s infinite',
                        boxShadow: `0 0 20px ${hexToRgba(primaryColor, 0.6)}, 0 8px 32px rgba(0, 0, 0, 0.12)`
                    }),
                    ...(isOpening && {
                        transform: 'scale(1.05)',
                        boxShadow: `0 16px 48px ${hexToRgba(primaryColor, 0.3)}, 0 8px 24px rgba(0, 0, 0, 0.15)`
                    })
                }}
                onClick={handleChatClick}
                onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                        '0 12px 40px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.12)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow =
                        '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}
                title="Click to start chat"
            >
                <div style={{ fontSize: '24px', color: 'white' }}>💬</div>
                {hasNewMessage && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#ef4444',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: 'white',
                            fontWeight: 'bold',
                            animation: 'bounce 1s infinite'
                        }}
                    >
                        !
                    </div>
                )}
            </div>

            {/* CSS Animations */}
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
        </>
    );
};

export default EnhancedTawkWidget;