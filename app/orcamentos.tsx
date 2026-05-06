import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTheme, currency } from '@/constants/app-theme';
import { QuoteStatus, useData } from '@/lib/data-context';
import { shareDocumentPdf } from '@/lib/pdf';

const statusLabel: Record<QuoteStatus, string> = {
  rascunho: 'RASCUNHO',
  aprovado: 'APROVADO',
  rejeitado: 'REJEITADO',
  convertido: 'CONVERTIDO EM OS',
};

const statusColor: Record<QuoteStatus, string> = {
  rascunho: '#606060',
  aprovado: '#007A24',
  rejeitado: '#A81818',
  convertido: '#235F9E',
};

type FilterOption = 'todos' | QuoteStatus;

const filterOptions: { key: FilterOption; label: string }[] = [
  { key: 'todos',     label: 'Todos' },
  { key: 'rascunho',  label: 'Rascunho' },
  { key: 'aprovado',  label: 'Aprovado' },
  { key: 'convertido', label: 'Convertido' },
  { key: 'rejeitado', label: 'Rejeitado' },
];

export default function QuotesScreen() {
  const { state, setQuoteStatus, deleteQuote, convertQuoteToOrder } = useData();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('todos');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const filteredQuotes = useMemo(() => {
    if (activeFilter === 'todos') return state.quotes;
    return state.quotes.filter((q) => q.status === activeFilter);
  }, [state.quotes, activeFilter]);

  const approve = async (id: string) => {
    await setQuoteStatus(id, 'aprovado');
  };

  const reject = async (id: string) => {
    await setQuoteStatus(id, 'rejeitado');
  };

  const createOrder = async (id: string) => {
    const quote = state.quotes.find((entry) => entry.id === id);
    if (!quote) {
      Alert.alert('Nao foi possivel converter', 'Orcamento nao encontrado.');
      return;
    }

    if (quote.status !== 'aprovado') {
      Alert.alert('Acao indisponivel', 'Apenas orcamentos aprovados podem virar OS.');
      return;
    }

    try {
      const order = await convertQuoteToOrder(id);
      Alert.alert('OS criada', `Numero ${order.number} criada a partir do orcamento.`);
      router.push('/ordem-servico');
    } catch (error) {
      Alert.alert('Nao foi possivel converter', (error as Error).message);
    }
  };

  const exportQuotePdf = async (id: string) => {
    const quote = state.quotes.find((entry) => entry.id === id);
    if (!quote) {
      Alert.alert('Nao foi possivel gerar PDF', 'Orcamento nao encontrado.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      await shareDocumentPdf({
        type: 'orcamento',
        number: quote.number,
        customerName: quote.customerName,
        customerDocument: quote.customerDocument,
        customerPhone: quote.customerPhone,
        items: quote.items,
        notes: quote.notes,
        paymentCondition: quote.paymentCondition,
        executionDeadline: quote.executionDeadline,
        warranty: quote.warranty,
        discount: quote.discount,
        total: quote.total,
        createdAt: quote.createdAt,
        customer: state.customers.find((customer) => customer.id === quote.customerId),
      });
    } catch (error) {
      Alert.alert('Nao foi possivel gerar PDF', (error as Error).message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const goToEditQuote = (id: string) => {
    const quote = state.quotes.find((entry) => entry.id === id);
    if (!quote) {
      Alert.alert('Nao foi possivel editar', 'Orcamento nao encontrado.');
      return;
    }

    if (quote.status !== 'rascunho') {
      Alert.alert('Acao indisponivel', 'Somente orcamentos em rascunho podem ser editados.');
      return;
    }

    router.push({ pathname: '/editar-orcamento/[id]', params: { id } });
  };

  const requestDeleteQuote = (id: string) => {
    const quote = state.quotes.find((entry) => entry.id === id);
    if (!quote) {
      Alert.alert('Nao foi possivel excluir', 'Orcamento nao encontrado.');
      return;
    }

    if (quote.status !== 'rejeitado') {
      Alert.alert('Acao indisponivel', 'Somente orcamentos rejeitados podem ser excluidos.');
      return;
    }

    Alert.alert(
      'Excluir orcamento',
      `Deseja realmente excluir o orcamento ${quote.number}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            void deleteRejectedQuote(id);
          },
        },
      ],
    );
  };

  const deleteRejectedQuote = async (id: string) => {
    try {
      await deleteQuote(id);
      Alert.alert('Orcamento excluido', 'O orcamento rejeitado foi removido.');
    } catch (error) {
      Alert.alert('Nao foi possivel excluir', (error as Error).message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerWrap}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBack}>{'<'} Voltar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Orcamentos Gerados</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
        {filterOptions.map((opt) => {
          const active = activeFilter === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(opt.key)}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.container}>
        {filteredQuotes.length === 0 ? (
          <Text style={styles.empty}>
            {state.quotes.length === 0
              ? 'Nenhum orcamento criado.'
              : 'Nenhum orcamento com este status.'}
          </Text>
        ) : (
          filteredQuotes.map((quote) => (
            <View key={quote.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.number}>{quote.number}</Text>
                <View style={styles.cardTopRight}>
                  <Text style={[styles.status, { color: statusColor[quote.status] }]}>
                    {statusLabel[quote.status]}
                  </Text>
                  <Pressable
                    style={styles.menuButton}
                    onPress={() => setOpenMenuId((current) => (current === quote.id ? null : quote.id))}>
                    <View style={styles.menuLine} />
                    <View style={styles.menuLine} />
                    <View style={styles.menuLine} />
                  </Pressable>

                  {openMenuId === quote.id ? (
                    <View style={styles.menuDropdown}>
                      {quote.status === 'rascunho' ? (
                        <Pressable
                          style={styles.menuItem}
                          onPress={() => {
                            setOpenMenuId(null);
                            goToEditQuote(quote.id);
                          }}>
                          <Text style={styles.menuItemText}>Editar</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                          setOpenMenuId(null);
                          approve(quote.id);
                        }}>
                        <Text style={styles.menuItemText}>Aprovar</Text>
                      </Pressable>
                      <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                          setOpenMenuId(null);
                          reject(quote.id);
                        }}>
                        <Text style={styles.menuItemText}>Rejeitar</Text>
                      </Pressable>
                      <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                          setOpenMenuId(null);
                          exportQuotePdf(quote.id);
                        }}>
                        <Text style={styles.menuItemText}>Gerar PDF</Text>
                      </Pressable>
                      <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                          setOpenMenuId(null);
                          createOrder(quote.id);
                        }}>
                        <Text style={styles.menuItemText}>Virar OS</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.menuItem,
                          styles.menuItemLast,
                          quote.status !== 'rejeitado' && styles.menuItemDisabled,
                        ]}
                        onPress={() => {
                          setOpenMenuId(null);
                          requestDeleteQuote(quote.id);
                        }}>
                        <Text
                          style={[
                            styles.menuItemText,
                            styles.menuItemDangerText,
                            quote.status !== 'rejeitado' && styles.menuItemTextDisabled,
                          ]}>
                          Excluir
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>

              <Text style={styles.customer}>{quote.customerName}</Text>
              <Text style={styles.meta}>Doc: {quote.customerDocument || 'Nao informado'}</Text>
              <Text style={styles.meta}>Telefone: {quote.customerPhone || 'Nao informado'}</Text>
              <Text style={styles.meta}>Itens: {quote.items.length}</Text>
              <Text style={styles.total}>Total: {currency(quote.total)}</Text>

            </View>
          ))
        )}
      </ScrollView>

      {isGeneratingPdf ? (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={AppTheme.yellowDark} />
            <Text style={styles.loadingText}>Gerando PDF...</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.background,
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: AppTheme.line,
    backgroundColor: AppTheme.white,
  },
  headerBack: {
    fontWeight: '700',
    color: AppTheme.charcoal,
    fontSize: 15,
  },
  headerTitle: {
    fontWeight: '800',
    fontSize: 18,
    color: AppTheme.black,
  },
  filterBar: {
    backgroundColor: AppTheme.white,
    borderBottomWidth: 1,
    borderColor: AppTheme.line,
    maxHeight: 70,
    flexGrow: 0,
  },
  filterBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppTheme.line,
    backgroundColor: AppTheme.background,
  },
  filterChipActive: {
    backgroundColor: AppTheme.yellow,
    borderColor: AppTheme.yellowDark,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppTheme.charcoal,
  },
  filterChipTextActive: {
    color: AppTheme.black,
  },
  container: {
    padding: 14,
    gap: 12,
    paddingBottom: 40,
  },
  empty: {
    color: AppTheme.charcoal,
    textAlign: 'center',
    marginTop: 50,
    fontStyle: 'italic',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.line,
    backgroundColor: AppTheme.white,
    padding: 12,
    gap: 4,
    overflow: 'visible',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  number: {
    fontWeight: '900',
    color: AppTheme.black,
    fontSize: 16,
  },
  status: {
    fontWeight: '900',
    fontSize: 12,
  },
  customer: {
    marginTop: 3,
    fontWeight: '800',
    color: AppTheme.black,
  },
  meta: {
    color: AppTheme.charcoal,
    fontSize: 12,
  },
  total: {
    marginTop: 6,
    fontWeight: '900',
    color: AppTheme.black,
    textAlign: 'right',
  },
  menuButton: {
    width: 30,
    height: 26,
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  menuLine: {
    width: 13,
    height: 2,
    backgroundColor: AppTheme.charcoal,
    borderRadius: 2,
  },
  menuDropdown: {
    position: 'absolute',
    top: 32,
    right: 0,
    width: 150,
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 10,
    backgroundColor: AppTheme.white,
    overflow: 'hidden',
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.line,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontWeight: '700',
    color: AppTheme.charcoal,
  },
  menuItemDangerText: {
    color: '#A81818',
  },
  menuItemDisabled: {
    backgroundColor: '#F2F2F2',
  },
  menuItemTextDisabled: {
    color: '#9E9E9E',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    minWidth: 160,
    borderRadius: 12,
    backgroundColor: AppTheme.white,
    borderWidth: 1,
    borderColor: AppTheme.line,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: AppTheme.charcoal,
    fontWeight: '700',
  },
});
