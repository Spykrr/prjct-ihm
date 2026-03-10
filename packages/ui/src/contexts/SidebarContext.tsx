import { useState, type ReactNode } from 'react';
import { SidebarContext, type FeuillesData } from './sidebarContextDef';

export type { FeuilleData, FeuillesData } from './sidebarContextDef';

const defaultFeuillesData: FeuillesData = {
  '1': { Feuille1: [] },
  '2': { Sheet1: [] },
  '3': { Feuille1: [] },
  '4': { lists: {}, fixed_vars: {}, amount_ranges: {}, passwords: {} },
};

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
