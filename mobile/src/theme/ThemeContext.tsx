import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  primarySoft: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderStrong: string;
  primary: string;
  success: string;
  danger: string;
  warning: string;
  inverse: string;
}

const STORAGE_KEY = 'nganson.theme.preference';

const lightColors: ThemeColors = {
  background: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceRaised: '#F8FAFC',
  surfaceMuted: '#F1F5F9',
  primarySoft: '#EAF2FF',
  text: '#172033',
  textMuted: '#56657A',
  textSubtle: '#8796AB',
  border: '#DCE3EC',
  borderStrong: '#CBD5E1',
  primary: '#0B63E5',
  success: '#059669',
  danger: '#DC2626',
  warning: '#D97706',
  inverse: '#FFFFFF',
};

const darkColors: ThemeColors = {
  background: '#0B1220',
  surface: '#111A2B',
  surfaceRaised: '#172236',
  surfaceMuted: '#1D2A3E',
  primarySoft: '#10294F',
  text: '#E8EEF8',
  textMuted: '#A7B4C7',
  textSubtle: '#8796AB',
  border: '#26354B',
  borderStrong: '#34465F',
  primary: '#5B9CFF',
  success: '#34D399',
  danger: '#FB7185',
  warning: '#FBBF24',
  inverse: '#0B1220',
};

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colors: ThemeColors;
  setPreference: (value: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const resolveTheme = (preference: ThemePreference, scheme: ColorSchemeName): ResolvedTheme => {
  if (preference === 'system') return scheme === 'dark' ? 'dark' : 'light';
  return preference;
};

export const MobileThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {});

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const setPreference = (value: ThemePreference) => {
    setPreferenceState(value);
    AsyncStorage.setItem(STORAGE_KEY, value).catch(() => {});
  };

  const resolvedTheme = resolveTheme(preference, systemScheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      colors,
      setPreference,
      toggleTheme: () => setPreference(resolvedTheme === 'dark' ? 'light' : 'dark'),
    }),
    [colors, preference, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useMobileTheme = (): ThemeContextValue => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useMobileTheme must be used inside MobileThemeProvider');
  return value;
};
