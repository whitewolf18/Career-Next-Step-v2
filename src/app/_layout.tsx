import { DarkTheme, DefaultTheme, ThemeProvider, Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider
        value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
      >
        <StatusBar style="dark" />
        <Slot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
