import { createContext, useContext, useState, type ReactNode } from 'react';

export type FeuilleData = Record<string, unknown>[] | Record<string, unknown>;
export type FeuillesData = Record<string, Record<string, FeuilleData>>;

interface SidebarContextValue {
  feuillesData: FeuillesData;
  setFeuillesData: (data: FeuillesData | ((prev: FeuillesData) => FeuillesData)) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentFeuille: string;
  setCurrentFeuille: (feuille: string) => void;
  currentTest: string;
  setCurrentTest: (test: string) => void;
  isDefinition: boolean;
  setIsDefinition: (v: boolean) => void;
  fileName: string;
  setFileName: (name: string) => void;
}

const defaultFeuillesData: FeuillesData = {
  '1': { Feuille1: [] },
  '2': { Sheet1: [] },
  '3': { Feuille1: [] },
  '4': { lists: {}, fixed_vars: {}, amount_ranges: {}, passwords: {} },
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [feuillesData, setFeuillesData] = useState<FeuillesData>(defaultFeuillesData);
  const [activeTab, setActiveTab] = useState('1');
  const [currentFeuille, setCurrentFeuille] = useState('Feuille1');
  const [currentTest, setCurrentTest] = useState('');
  const [isDefinition, setIsDefinition] = useState(false);
  const [fileName, setFileName] = useState('');

  return (
    <SidebarContext.Provider
      value={{
        feuillesData,
        setFeuillesData,
        activeTab,
        setActiveTab,
        currentFeuille,
        setCurrentFeuille,
        currentTest,
        setCurrentTest,
        isDefinition,
        setIsDefinition,
        fileName,
        setFileName,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
