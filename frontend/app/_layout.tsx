import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { deepLinkService } from '@/services/deeplink.service';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Initialize deep link service
    console.log('[RootLayout] 🚀 Initializing deep link service...');
    
    deepLinkService.initialize().catch((error) => {
      console.error('[RootLayout] ❌ Failed to initialize deep link service:', error);
    });

    // Cleanup on unmount
    return () => {
      console.log('[RootLayout] 🧹 Cleaning up deep link service...');
      deepLinkService.cleanup();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
