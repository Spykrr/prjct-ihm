import { createContext } from 'react';

export type FeuilleData = Record<string, unknown>[] | Record<string, unknown>;
export type FeuillesData = Record<string, Record<string, FeuilleData>>;

export interface SidebarContextValue {
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

export const SidebarContext = createContext<SidebarContextValue | null>(null);
