import React, { useState, useMemo, useCallback } from 'react';
import { Paper } from '@mui/material';
import { Typography } from 'antd';
import {
    ClockCircleOutlined,
    CheckCircleOutlined,
    GiftOutlined,
} from '@ant-design/icons';
import { Package } from '@services/subscription';
import { usePrimaryColor } from '@context/PrimaryColorContext';

interface PackageCardProps {
    package: Package;
    onPurchase: (pkg: Package) => void;
    style?: React.CSSProperties;
}

const PackageCard: React.FC<PackageCardProps> = ({ package: pkg, onPurchase, style }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const primaryColor = usePrimaryColor();

    const lightenColor = (color: string, percent: number = 20) => {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        const lightenedR = Math.min(255, Math.round(r + (255 - r) * percent / 100));
        const lightenedG = Math.min(255, Math.round(g + (255 - g) * percent / 100));
        const lightenedB = Math.min(255, Math.round(b + (255 - b) * percent / 100));

        return `#${lightenedR.toString(16).padStart(2, '0')}${lightenedG.toString(16).padStart(2, '0')}${lightenedB.toString(16).padStart(2, '0')}`;
    };

    const pricePerVisit = useMemo(() => {
        return (pkg.price / pkg.total_visits).toFixed(0);
    }, [pkg.price, pkg.total_visits]);

    const formattedPrice = useMemo(() => {
        return pkg.price.toLocaleString();
    }, [pkg.price]);

    const handleClick = useCallback(() => {
        if (!isProcessing) {
            setIsProcessing(true);
            onPurchase(pkg);
            setTimeout(() => setIsProcessing(false), 1000);
        }
    }, [isProcessing, onPurchase, pkg]);

    const hoverColor = lightenColor(primaryColor, 15);

    return (
        <Paper
            elevation={isHovered ? 6 : 3}
            onClick={handleClick}
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "0",
                width: "180px",
                height: "250px",
                overflow: "hidden",
                cursor: isProcessing ? "wait" : "pointer",
                backgroundColor: isHovered ? hoverColor : primaryColor,
                transition: "all 0.3s ease",
                borderRadius: "8px",
                position: "relative",
                opacity: isProcessing ? 0.7 : 1,
                ...style
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    backgroundColor: '#9C27B0',
                    color: 'white',
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "10px",
                    fontWeight: "bold",
                    zIndex: 1,
                    display: "flex",
                    alignItems: "center",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
            >
                <GiftOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
                PACKAGE
            </div>

            {isProcessing && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        zIndex: 10,
                    }}
                >
                    Opening...
                </div>
            )}

            <div
                style={{
                    width: "100%",
                    height: "120px",
                    overflow: "hidden",
                    position: "relative",
                    borderTopLeftRadius: "8px",
                    borderTopRightRadius: "8px",
                    background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.3) 0%, rgba(103, 58, 183, 0.3) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <GiftOutlined
                    style={{
                        fontSize: '60px',
                        color: 'rgba(255, 255, 255, 0.4)',
                        transition: "transform 0.3s ease",
                        transform: isHovered ? "scale(1.1) rotate(5deg)" : "scale(1)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "white",
                        padding: "4px 12px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        letterSpacing: "0.5px",
                    }}
                >
                    {pkg.code}
                </div>
            </div>

            <div
                style={{
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    flexGrow: 1,
                }}
            >
                <Typography.Title
                    level={4}
                    ellipsis={{ rows: 2 }}
                    style={{
                        fontSize: "16px",
                        margin: "0 0 8px 0",
                        color: "white",
                        textAlign: "center",
                        fontWeight: "600",
                    }}
                >
                    {pkg.name}
                </Typography.Title>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "4px",
                        color: "rgba(255, 255, 255, 0.95)",
                        fontSize: "11px",
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        padding: "4px 8px",
                        borderRadius: "8px",
                    }}
                >
                    <CheckCircleOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
                    {pkg.total_visits} visits
                </div>

                {pkg.validity_days && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "4px",
                            color: "rgba(255, 255, 255, 0.95)",
                            fontSize: "11px",
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            padding: "4px 8px",
                            borderRadius: "8px",
                        }}
                    >
                        <ClockCircleOutlined style={{ fontSize: '12px', marginRight: '4px' }} />
                        {pkg.validity_days} days
                    </div>
                )}

                <div style={{ marginTop: "auto", textAlign: "center" }}>
                    <Typography.Text
                        strong
                        style={{
                            fontSize: "18px",
                            color: "white",
                            display: "block",
                            fontWeight: "bold",
                        }}
                    >
                        Ksh. {formattedPrice}
                    </Typography.Text>

                    <Typography.Text
                        style={{
                            fontSize: "11px",
                            color: "rgba(255, 255, 255, 0.8)",
                            display: "block",
                            marginTop: "2px",
                        }}
                    >
                        Ksh. {parseFloat(pricePerVisit).toLocaleString()} per visit
                    </Typography.Text>

                    <div
                        style={{
                            marginTop: "8px",
                            backgroundColor: isHovered ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.15)",
                            padding: "4px 12px",
                            borderRadius: "4px",
                            display: "inline-block",
                            transition: "background-color 0.3s ease",
                        }}
                    >
                        <Typography.Text
                            style={{
                                color: "white",
                                fontSize: "12px",
                            }}
                        >
                            {isProcessing ? 'Opening...' : 'Purchase Package'}
                        </Typography.Text>
                    </div>
                </div>
            </div>
        </Paper>
    );
};

export default PackageCard;