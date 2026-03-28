import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

import { StarkZapProvider } from '@/providers/StarkZapProvider';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StarkZapProvider network="sepolia">
        <AnimatedSplashOverlay />
        <AppTabs />
      </StarkZapProvider>
    </ThemeProvider>
  );
}
