import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    Currency, 
    ExchangeRate, 
    listCurrencies, 
    getFunctionalCurrency, 
    getLatestRates,
    getRateForDate,
    convertAmount,
    formatCurrencyAmount
} from '@services/currency';

interface CurrencyContextType {
    // Data
    currencies: Currency[];
    functionalCurrency: Currency | null;
    latestRates: ExchangeRate[];
    isLoading: boolean;
    
    // Actions
    refetchCurrencies: () => void;
    refetchRates: () => void;
    
    // Currency operations
    formatAmount: (amount: number, currencyCode?: string) => string;
    convertToBase: (amount: number, fromCurrency: string, date?: string) => Promise<number>;
    getExchangeRate: (fromCurrency: string, toCurrency: string, date?: string) => Promise<number>;
    getCurrencyByCode: (code: string) => Currency | undefined;
    
    // Multi-currency display helpers
    displayAmountWithBase: (amount: number, currencyCode: string) => ReactNode;
    getCurrencySymbol: (currencyCode: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
    children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
    const queryClient = useQueryClient();

    // Queries
    const { data: currencies = [], isLoading: loadingCurrencies, refetch: refetchCurrencies } = useQuery({
        queryKey: ['currencies'],
        queryFn: () => listCurrencies(true), // Only active currencies
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const { data: functionalCurrency } = useQuery({
        queryKey: ['functional-currency'],
        queryFn: getFunctionalCurrency,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    const { data: latestRates = [], isLoading: loadingRates, refetch: refetchRates } = useQuery({
        queryKey: ['latest-rates'],
        queryFn: getLatestRates,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const isLoading = loadingCurrencies || loadingRates;

    // Helper functions
    const getCurrencyByCode = (code: string): Currency | undefined => {
        return currencies.find(c => c.code === code);
    };

    const getCurrencySymbol = (currencyCode: string): string => {
        const currency = getCurrencyByCode(currencyCode);
        return currency?.symbol || currencyCode;
    };

    const formatAmount = (amount: number, currencyCode?: string): string => {
        if (!currencyCode && functionalCurrency) {
            currencyCode = functionalCurrency.code;
        }
        
        const currency = currencyCode ? getCurrencyByCode(currencyCode) : functionalCurrency || undefined;
        return formatCurrencyAmount(amount, currency);
    };

    const getExchangeRate = async (fromCurrency: string, toCurrency: string, date?: string): Promise<number> => {
        if (fromCurrency === toCurrency) return 1;
        
        try {
            const rate = await getRateForDate(fromCurrency, toCurrency, date);
            return rate;
        } catch (error) {
            console.error('Failed to get exchange rate:', error);
            return 1;
        }
    };

    const convertToBase = async (amount: number, fromCurrency: string, date?: string): Promise<number> => {
        if (!functionalCurrency) {
            console.warn('No functional currency set');
            return amount;
        }
        
        if (fromCurrency === functionalCurrency.code) return amount;
        
        try {
            const result = await convertAmount({
                amount,
                from_currency: fromCurrency,
                to_currency: functionalCurrency.code,
                date
            });
            
            return result?.converted_amount || amount;
        } catch (error) {
            console.error('Failed to convert to base currency:', error);
            return amount;
        }
    };

    const displayAmountWithBase = (amount: number, currencyCode: string): ReactNode => {
        const formattedOriginal = formatAmount(amount, currencyCode);
        
        if (!functionalCurrency || currencyCode === functionalCurrency.code) {
            return <span>{formattedOriginal}</span>;
        }
        
        // For non-base currencies, show both original and converted amount
        return (
            <div>
                <div>{formattedOriginal}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                    ≈ {formatAmount(amount, functionalCurrency.code)} {functionalCurrency.code}
                </div>
            </div>
        );
    };

    const value: CurrencyContextType = {
        // Data
        currencies,
        functionalCurrency,
        latestRates,
        isLoading,
        
        // Actions
        refetchCurrencies: () => {
            queryClient.invalidateQueries({ queryKey: ['currencies'] });
            refetchCurrencies();
        },
        refetchRates: () => {
            queryClient.invalidateQueries({ queryKey: ['latest-rates'] });
            refetchRates();
        },
        
        // Currency operations
        formatAmount,
        convertToBase,
        getExchangeRate,
        getCurrencyByCode,
        
        // Display helpers
        displayAmountWithBase,
        getCurrencySymbol,
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = (): CurrencyContextType => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        // Provide fallback values instead of throwing an error
        console.warn('useCurrency must be used within a CurrencyProvider, using fallback values');
        return {
            currencies: [],
            functionalCurrency: null,
            latestRates: [],
            isLoading: false,
            refetchCurrencies: () => {},
            refetchRates: () => {},
            getCurrencyByCode: () => undefined,
            getExchangeRate: async () => 1,
            convertToBase: async (amount) => amount,
            formatAmount: (amount, currencyCode) => {
                const currency = currencyCode || 'KES';
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency === 'KES' ? 'KES' : 'USD',
                    minimumFractionDigits: 2,
                }).format(amount);
            },
            displayAmountWithBase: (amount, currency) => {
                const formatted = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency === 'KES' ? 'KES' : 'USD',
                    minimumFractionDigits: 2,
                }).format(amount);
                return `${formatted} (${currency})`;
            },
            getCurrencySymbol: (code) => code,
        };
    }
    return context;
};

// Custom hook for currency conversion with loading states
export const useCurrencyConversion = () => {
    const { convertToBase, functionalCurrency } = useCurrency();
    const [converting, setConverting] = useState(false);

    const convert = async (amount: number, fromCurrency: string, date?: string) => {
        setConverting(true);
        try {
            const result = await convertToBase(amount, fromCurrency, date);
            return result;
        } finally {
            setConverting(false);
        }
    };

    return {
        convert,
        converting,
        functionalCurrency,
    };
};

// Custom hook for currency selection
export const useCurrencySelector = (defaultCurrency?: string) => {
    const { currencies, functionalCurrency } = useCurrency();
    const [selectedCurrency, setSelectedCurrency] = useState<string>(
        defaultCurrency || functionalCurrency?.code || 'KES'
    );

    const currency = currencies.find(c => c.code === selectedCurrency);

    return {
        selectedCurrency,
        setSelectedCurrency,
        currency,
        currencies,
        functionalCurrency,
    };
};
