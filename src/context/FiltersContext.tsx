import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface FiltersContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  selectedAgents: string[];
  setSelectedAgents: (agents: string[]) => void;
  selectedProperties: string[];
  setSelectedProperties: (properties: string[]) => void;
  filterType: string;
  setFilterType: (type: string) => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export const FiltersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>('all');

  return (
    <FiltersContext.Provider
      value={{
        dateRange,
        setDateRange,
        selectedAgents,
        setSelectedAgents,
        selectedProperties,
        setSelectedProperties,
        filterType,
        setFilterType,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
};

export const useFilters = (): FiltersContextType => {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
};
