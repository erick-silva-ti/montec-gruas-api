import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTheme } from '@/constants/app-theme';

type HomeScreenStyles = {
  safe: ViewStyle;
  bg: ViewStyle;
  bgImage: ImageStyle;
  topBar: ViewStyle;
  maintenanceBtn: ViewStyle;
  topCardWrap: ViewStyle;
  topCard: ViewStyle;
  logo: ImageStyle;
  actions: ViewStyle;
  mainButton: ViewStyle;
  mainButtonSolid: ViewStyle;
  mainButtonOutline: ViewStyle;
  mainButtonWithIcon: ViewStyle;
  mainButtonPressed: ViewStyle;
  buttonInner: ViewStyle;
  buttonIcon: TextStyle;
  mainButtonText: TextStyle;
  mainButtonTextOutline: TextStyle;
};

function MainButton({
  title,
  onPress,
  outlined = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  outlined?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.mainButton,
        outlined ? styles.mainButtonOutline : styles.mainButtonSolid,
        icon && styles.mainButtonWithIcon,
        pressed && styles.mainButtonPressed,
      ]}>
      <View style={styles.buttonInner}>
        {icon ? (
          <MaterialIcons
            name={icon}
            size={24}
            color={outlined ? AppTheme.white : AppTheme.white}
            style={styles.buttonIcon}
          />
        ) : null}
        <Text style={[styles.mainButtonText, outlined && styles.mainButtonTextOutline]}>{title}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground source={require('@/assets/branding/menu.jpg')} style={styles.bg} resizeMode="contain" imageStyle={styles.bgImage}>
        <View style={styles.topBar}>
          <Pressable style={styles.maintenanceBtn} onPress={() => router.push('/manutencao')}>
            <MaterialIcons name="settings" size={24} color={AppTheme.white} />
          </Pressable>
        </View>

        <View style={styles.actions}>
          <MainButton title="NOVO ORCAMENTO" onPress={() => router.push('/novo-orcamento')} />
          <MainButton title="ORDEM DE SERVICO" onPress={() => router.push('/ordem-servico')} />
          <MainButton title="ORCAMENTOS GERADOS" onPress={() => router.push('/orcamentos')} outlined />
          <MainButton title="EMITIR NOTA FISCAL" onPress={() => router.push('/emitir-nota-fiscal')} icon="receipt-long" />
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create<HomeScreenStyles>({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  bg: {
    flex: 1,
    backgroundColor: AppTheme.yellow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  topBar: {
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 3,
  },
  maintenanceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(17,17,17,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCardWrap: {
    paddingTop: 14,
    paddingHorizontal: 18,
  },
  topCard: {
    backgroundColor: 'rgba(245,245,245,0.89)',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingTop: 20,
    paddingBottom: 18,
    minHeight: 176,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 2,
  },
  logo: {
    width: '86%',
    height: 126,
  },
  actions: {
    gap: 11,
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 28,
    zIndex: 2,
  },
  mainButton: {
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    elevation: 5,
  },
  mainButtonSolid: {
    backgroundColor: AppTheme.charcoal,
  },
  mainButtonOutline: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 3,
    borderColor: AppTheme.white,
  },
  mainButtonWithIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonIcon: {
    marginRight: 6,
  },
  mainButtonText: {
    color: AppTheme.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.1,
    textAlign: 'center',
  },
  mainButtonTextOutline: {
    color: AppTheme.white,
  },
});
