'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GraphTheme, THEMES } from '../components/graph/types';

interface ThemeContextType {
  currentTheme: GraphTheme;
  themeName: string;
  setTheme: (name: string) => void;
  customTheme: Partial<GraphTheme> | null;
  setCustomTheme: (theme: Partial<GraphTheme> | null) => void;
  highPerformanceMode: boolean;
  setHighPerformanceMode: (enabled: boolean) => void;
}

const defaultTheme = THEMES.deepSpace;

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: defaultTheme,
  themeName: 'deepSpace',
  setTheme: () => {},
  customTheme: null,
  setCustomTheme: () => {},
  highPerformanceMode: false,
  setHighPerformanceMode: () => {},
});

export function GraphThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<string>('deepSpace');
  const [customTheme, setCustomTheme] = useState<Partial<GraphTheme> | null>(null);
  const [highPerformanceMode, setHighPerformanceMode] = useState(false);

  // Charger le thème depuis localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('graphTheme');
    if (savedTheme && THEMES[savedTheme]) {
      setThemeName(savedTheme);
    }
    
    const savedCustom = localStorage.getItem('graphCustomTheme');
    if (savedCustom) {
      try {
        setCustomTheme(JSON.parse(savedCustom));
      } catch (e) {
        console.error('Invalid custom theme in localStorage');
      }
    }
    
    const savedPerfMode = localStorage.getItem('graphHighPerformance');
    if (savedPerfMode === 'true') {
      setHighPerformanceMode(true);
    }
  }, []);

  // Sauvegarder dans localStorage
  useEffect(() => {
    localStorage.setItem('graphTheme', themeName);
  }, [themeName]);

  useEffect(() => {
    if (customTheme) {
      localStorage.setItem('graphCustomTheme', JSON.stringify(customTheme));
    } else {
      localStorage.removeItem('graphCustomTheme');
    }
  }, [customTheme]);

  useEffect(() => {
    localStorage.setItem('graphHighPerformance', highPerformanceMode.toString());
  }, [highPerformanceMode]);

  // Fusionner le thème de base avec les personnalisations
  const currentTheme: GraphTheme = {
    ...THEMES[themeName] || defaultTheme,
    ...(customTheme || {}),
  };

  const setTheme = (name: string) => {
    if (THEMES[name]) {
      setThemeName(name);
    }
  };

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      themeName,
      setTheme,
      customTheme,
      setCustomTheme,
      highPerformanceMode,
      setHighPerformanceMode,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useGraphTheme = () => useContext(ThemeContext);
