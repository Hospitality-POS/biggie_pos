import React from 'react';
import { Select, Space, Typography } from 'antd';
import { useCurrency } from '@context/CurrencyContext';
import { Currency } from '@services/currency';

const { Text } = Typography;
const { Option } = Select;

interface CurrencySelectorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    allowClear?: boolean;
    showSymbol?: boolean;
    disabled?: boolean;
    size?: 'small' | 'middle' | 'large';
    style?: React.CSSProperties;
    filter?: (currency: Currency) => boolean;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
    value,
    onChange,
    placeholder = 'Select currency',
    allowClear = false,
    showSymbol = true,
    disabled = false,
    size = 'middle',
    style,
    filter,
}) => {
    const { currencies, functionalCurrency } = useCurrency();

    // Filter currencies if filter function is provided
    const filteredCurrencies = filter ? currencies.filter(filter) : currencies;

    const renderOption = (currency: Currency) => (
        <Option key={currency.code} value={currency.code}>
            <Space>
                <Text strong style={{ fontFamily: 'monospace' }}>
                    {currency.code}
                </Text>
                {showSymbol && (
                    <Text type="secondary">
                        ({currency.symbol})
                    </Text>
                )}
                {functionalCurrency?.code === currency.code && (
                    <Text type="warning" style={{ fontSize: '11px' }}>
                        BASE
                    </Text>
                )}
            </Space>
        </Option>
    );

    return (
        <Select
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            allowClear={allowClear}
            disabled={disabled}
            size={size}
            style={style}
            showSearch
            filterOption={(input, option) => {
                const currency = filteredCurrencies.find(c => c.code === option?.value);
                if (!currency) return false;
                
                const searchStr = `${currency.code} ${currency.name} ${currency.symbol}`.toLowerCase();
                return searchStr.includes(input.toLowerCase());
            }}
        >
            {filteredCurrencies.map(renderOption)}
        </Select>
    );
};

// Currency selector with amount input
export const CurrencyAmountInput: React.FC<{
    amount: number;
    currency: string;
    onAmountChange: (amount: number) => void;
    onCurrencyChange: (currency: string) => void;
    disabled?: boolean;
    size?: 'small' | 'middle' | 'large';
    precision?: number;
}> = ({
    amount,
    currency,
    onAmountChange,
    onCurrencyChange,
    disabled = false,
    size = 'middle',
    precision = 2,
}) => {
    const { getCurrencyByCode } = useCurrency();
    const selectedCurrency = getCurrencyByCode(currency);

    const parser = (value: string | number) => {
        if (typeof value === 'number') return value;
        return parseFloat(value.replace(/,/g, ''));
    };

    return (
        <Space.Compact style={{ width: '100%' }}>
            <Select
                value={currency}
                onChange={onCurrencyChange}
                disabled={disabled}
                size={size}
                style={{ width: '100px' }}
                showSearch={false}
            >
                {selectedCurrency && (
                    <Option value={currency}>
                        {selectedCurrency.code}
                    </Option>
                )}
            </Select>
            <input
                type="text"
                value={amount}
                onChange={(e) => onAmountChange(parser(e.target.value) || 0)}
                disabled={disabled}
                style={{
                    flex: 1,
                    padding: size === 'small' ? '4px 8px' : '8px 11px',
                    border: '1px solid #d9d9d9',
                    borderRadius: size === 'small' ? '4px' : '6px',
                    fontSize: size === 'small' ? '14px' : '14px',
                    textAlign: 'right',
                }}
                placeholder="0.00"
            />
        </Space.Compact>
    );
};

// Quick currency switcher for navigation bars
export const CurrencySwitcher: React.FC<{
    value?: string;
    onChange?: (currency: string) => void;
    size?: 'small' | 'middle' | 'large';
}> = ({
    value,
    onChange,
    size = 'small',
}) => {
    const { currencies, functionalCurrency } = useCurrency();

    return (
        <Select
            value={value}
            onChange={onChange}
            size={size}
            style={{ width: '80px' }}
            showSearch={false}
            bordered={false}
        >
            {currencies.map(currency => (
                <Option key={currency.code} value={currency.code}>
                    <Space>
                        <Text strong style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {currency.code}
                        </Text>
                        {functionalCurrency?.code === currency.code && (
                            <Text type="warning" style={{ fontSize: '10px' }}>
                                ★
                            </Text>
                        )}
                    </Space>
                </Option>
            ))}
        </Select>
    );
};
