import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTheme } from '@/constants/app-theme';

function Header() {
  return (
    <View style={styles.headerWrap}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.headerBack}>{'<'} Voltar</Text>
      </Pressable>
      <Text style={styles.headerTitle}>Manutencao</Text>
      <View style={{ width: 50 }} />
    </View>
  );
}

function OptionCard({
  title,
  subtitle,
  icon,
  route,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: '/manutencao/clientes' | '/manutencao/produtos' | '/manutencao/servicos';
}) {
  return (
    <Pressable style={styles.option} onPress={() => router.push(route)}>
      <View style={styles.iconWrap}>
        <MaterialIcons name={icon} size={24} color={AppTheme.white} />
      </View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={AppTheme.charcoal} />
    </Pressable>
  );
}

export default function MaintenanceMenuScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Header />

      <View style={styles.container}>
        <OptionCard
          title="Clientes"
          subtitle="Cadastro, edicao e exclusao"
          icon="groups"
          route="/manutencao/clientes"
        />
        <OptionCard
          title="Produtos"
          subtitle="Cadastro, edicao e exclusao"
          icon="inventory-2"
          route="/manutencao/produtos"
        />
        <OptionCard
          title="Servicos"
          subtitle="Cadastro, edicao e exclusao"
          icon="build-circle"
          route="/manutencao/servicos"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AppTheme.white,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBack: {
    color: AppTheme.charcoal,
    fontWeight: '700',
    fontSize: 15,
  },
  headerTitle: {
    color: AppTheme.charcoal,
    fontWeight: '800',
    fontSize: 18,
  },
  container: {
    padding: 16,
    gap: 12,
  },
  option: {
    backgroundColor: AppTheme.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.line,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AppTheme.yellowDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.black,
  },
  optionSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
});
