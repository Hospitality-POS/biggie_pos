import React from 'react';
import { Typography, Space, Tag, Tooltip } from 'antd';
import { useCurrency } from '@context/CurrencyContext';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface CurrencyDisplayProps {
    amount: number;
    currency: string;
    showBaseCurrency?: boolean;
    showConversion?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
    color?: string;
    strong?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
    amount,
    currency,
    showBaseCurrency = false,
    fontSize = 'medium',
    color,
    strong = false,
}) => {
    const { formatAmount, functionalCurrency, displayAmountWithBase } = useCurrency();

    const fontSizeMap = {
        small: '12px',
        medium: '14px',
        large: '16px',
    };

    const displayContent = () => {
        if (showBaseCurrency && functionalCurrency && currency !== functionalCurrency.code) {
            return displayAmountWithBase(amount, currency);
        }

        return (
            <Text
                style={{
                    fontSize: fontSizeMap[fontSize],
                    color,
                    fontWeight: strong ? 'bold' : 'normal',
                }}
            >
                {formatAmount(amount, currency)}
            </Text>
        );
    };

    return displayContent();
};

// Display amount with currency code and symbol
export const AmountWithCurrency: React.FC<{
    amount: number;
    currency: string;
    showCode?: boolean;
    showSymbol?: boolean;
    size?: 'small' | 'middle' | 'large';
}> = ({
    amount,
    currency,
    showCode = true,
    showSymbol = true,
    size = 'middle',
}) => {
    const { formatAmount, getCurrencyByCode } = useCurrency();
    const currencyInfo = getCurrencyByCode(currency);

    const formattedAmount = formatAmount(amount, currency);

    return (
        <Space size="small">
            <span>{formattedAmount}</span>
            {showCode && (
                <Text type="secondary" style={{ fontSize: size === 'small' ? '11px' : '12px' }}>
                    {currency}
                </Text>
            )}
            {showSymbol && currencyInfo && (
                <Text type="secondary" style={{ fontSize: size === 'small' ? '11px' : '12px' }}>
                    {currencyInfo.symbol}
                </Text>
            )}
        </Space>
    );
};

// Currency converter display component
export const CurrencyConversionDisplay: React.FC<{
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    rate?: number;
    loading?: boolean;
}> = ({
    amount,
    fromCurrency,
    toCurrency,
    rate,
    loading = false,
}) => {
    const { formatAmount } = useCurrency();

    const convertedAmount = rate ? amount * rate : amount;

    if (loading) {
        return (
            <Space direction="vertical" size="small">
                <Text>Converting...</Text>
            </Space>
        );
    }

    return (
        <Space direction="vertical" size="small">
            <Space>
                <Text strong>{formatAmount(amount, fromCurrency)}</Text>
                <Text type="secondary">({fromCurrency})</Text>
            </Space>
            <Space>
                <ArrowRightOutlined style={{ color: '#8c8c8c' }} />
                <Text strong style={{ color: '#1890ff' }}>
                    {formatAmount(convertedAmount, toCurrency)}
                </Text>
                <Text type="secondary">({toCurrency})</Text>
            </Space>
            {rate && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                    Rate: 1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
                </Text>
            )}
        </Space>
    );
};

// Currency badge for showing currency in tables/lists
export const CurrencyBadge: React.FC<{
    currency: string;
    showBase?: boolean;
    size?: 'small' | 'default';
}> = ({ currency, showBase = false, size = 'small' }) => {
    const { functionalCurrency, getCurrencyByCode } = useCurrency();
    const currencyInfo = getCurrencyByCode(currency);

    const isBase = functionalCurrency?.code === currency;

    return (
        <Tooltip title={`${currencyInfo?.name || currency} ${isBase ? '(Base Currency)' : ''}`}>
            <Tag
                color={isBase ? 'gold' : 'default'}
                style={{
                    fontSize: size === 'small' ? '10px' : '12px',
                    fontFamily: 'monospace',
                }}
            >
                {currency} {currencyInfo?.symbol}
                {isBase && showBase && ' ★'}
            </Tag>
        </Tooltip>
    );
};

// Multi-currency amount display for reports
export const MultiCurrencyAmount: React.FC<{
    amounts: Array<{ amount: number; currency: string; label?: string }>;
    showTotal?: boolean;
    totalCurrency?: string;
}> = ({ amounts, showTotal = false, totalCurrency }) => {
    const { formatAmount, functionalCurrency } = useCurrency();

    const baseCurrency = totalCurrency || functionalCurrency?.code;

    return (
        <Space direction="vertical" size="small">
            {amounts.map(({ amount, currency, label }, index) => (
                <Space key={index}>
                    {label && <Text type="secondary">{label}:</Text>}
                    <Text>{formatAmount(amount, currency)}</Text>
                    <CurrencyBadge currency={currency} size="small" />
                </Space>
            ))}
            
            {showTotal && baseCurrency && (
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '8px', marginTop: '4px' }}>
                    <Space>
                        <Text strong>Total ({baseCurrency}):</Text>
                        <Text strong style={{ color: '#1890ff' }}>
                            {formatAmount(
                                amounts.reduce((acc, { amount }) => {
                                    // For now, just sum amounts - conversion would need async handling
                                    return acc + amount;
                                }, 0),
                                baseCurrency
                            )}
                        </Text>
                    </Space>
                </div>
            )}
        </Space>
    );
};

// Exchange rate indicator
export const ExchangeRateIndicator: React.FC<{
    fromCurrency: string;
    toCurrency: string;
    rate?: number;
    date?: string;
    size?: 'small' | 'default';
}> = ({ fromCurrency, toCurrency, rate, date, size = 'small' }) => {
    const { getCurrencyByCode } = useCurrency();

    const fromInfo = getCurrencyByCode(fromCurrency);
    const toInfo = getCurrencyByCode(toCurrency);

    if (!rate) return null;

    return (
        <Space size="small" style={{ fontSize: size === 'small' ? '11px' : '12px' }}>
            <Text type="secondary">
                1 {fromInfo?.symbol || fromCurrency} = {rate.toFixed(4)} {toInfo?.symbol || toCurrency}
            </Text>
            {date && (
                <Text type="secondary" style={{ fontSize: '10px' }}>
                    ({date})
                </Text>
            )}
        </Space>
    );
};
