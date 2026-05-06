import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AppTheme } from '@/constants/app-theme';
import { DataProvider } from '@/lib/data-context';
import { useData } from '@/lib/data-context';

function LoadingScreen() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.06],
  });

  const logoOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1],
  });

  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.3],
  });

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.34],
  });

  return (
    <View style={styles.loadingSafe}>
      <View style={styles.loadingBackground}>
        <View style={styles.decorTop} />
        <View style={styles.decorBottom} />

        <View style={styles.logoWrap}>
          <Animated.View
            style={[
              styles.logoGlow,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
          <Animated.Image
            source={require('@/assets/branding/logo.png')}
            resizeMode="contain"
            style={[
              styles.logo,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          />
        </View>

        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

function AppContent() {
  const { loading } = useData();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="manutencao" options={{ headerShown: false }} />
        <Stack.Screen name="manutencao/[tipo]" options={{ headerShown: false }} />
        <Stack.Screen name="novo-orcamento" options={{ headerShown: false }} />
        <Stack.Screen name="editar-orcamento/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="orcamentos" options={{ headerShown: false }} />
        <Stack.Screen name="ordem-servico" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

const styles = StyleSheet.create({
  loadingSafe: {
    flex: 1,
    backgroundColor: AppTheme.yellow,
  },
  loadingBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.yellow,
    overflow: 'hidden',
  },
  decorTop: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -180,
    left: -120,
  },
  decorBottom: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(65,67,74,0.16)',
    bottom: -150,
    right: -110,
  },
  logoWrap: {
    width: 250,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 220,
    height: 140,
  },
  loadingText: {
    marginTop: 16,
    color: AppTheme.charcoal,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
