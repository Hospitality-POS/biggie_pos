import React, { useEffect, useState, useRef } from 'react';

const EnhancedTawkWidget: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [tawkLoaded, setTawkLoaded] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [isOpening, setIsOpening] = useState(false);
    const dragRef = useRef<HTMLDivElement>(null);
    const dragOffset = useRef({ x: 0, y: 0 });

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

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        const rect = dragRef.current?.getBoundingClientRect();
        if (rect) {
            dragOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && dragRef.current) {
            const newX = e.clientX - dragOffset.current.x;
            const newY = e.clientY - dragOffset.current.y;

            // Keep widget within viewport bounds
            const maxX = window.innerWidth - 60;
            const maxY = window.innerHeight - 60;

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging]);

    const handleChatClick = (e: React.MouseEvent) => {
        if (isDragging) return;

        // Show opening animation
        setIsOpening(true);
        setHasNewMessage(false);

        // Animate the widget opening
        setTimeout(() => {
            console.log('Opening chat...');

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

    return (
        <>
            {/* Main chat widget */}
            <div
                ref={dragRef}
                className="custom-tawk"
                style={{
                    position: 'fixed',
                    bottom: `${position.y}px`,
                    right: `${position.x}px`,
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                    zIndex: 10000,
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    userSelect: 'none',
                    background: isOpening
                        ? 'linear-gradient(135deg, #8b2332 0%, #6C1C2C 100%)'
                        : '#6C1C2C',
                    ...(hasNewMessage && {
                        animation: 'pulse 2s infinite',
                        boxShadow: '0 0 20px rgba(108, 28, 44, 0.6), 0 8px 32px rgba(0, 0, 0, 0.12)'
                    }),
                    ...(isOpening && {
                        transform: 'scale(1.05)',
                        boxShadow: '0 16px 48px rgba(108, 28, 44, 0.3), 0 8px 24px rgba(0, 0, 0, 0.15)'
                    })
                }}
                onMouseDown={handleMouseDown}
                onClick={handleChatClick}
                onMouseEnter={(e) => {
                    if (!isDragging) {
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.12)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isDragging) {
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }
                }}
                title="Click to start chat"
            >
                <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%'
                }}>
                    <div style={{
                        fontSize: '24px',
                        color: 'white',
                        lineHeight: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        💬
                    </div>
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