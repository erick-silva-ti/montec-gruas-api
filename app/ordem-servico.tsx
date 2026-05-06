import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { AppTheme, currency } from '@/constants/app-theme';
import { onlyDigits } from '@/lib/formatters';
import { shareDocumentPdf } from '@/lib/pdf';
import { CatalogItem, ItemType, QuoteItem, useData } from '@/lib/data-context';

function ItemLine({ item, onAdd }: { item: CatalogItem; onAdd: (item: CatalogItem) => void }) {
  return (
    <View style={styles.catalogLine}>
      <View style={{ flex: 1 }}>
        <Text style={styles.catalogName}>{item.name}</Text>
        <Text style={styles.catalogMeta}>
          {item.type.toUpperCase()}{item.unit ? ` · ${item.unit}` : ''} · {currency(item.unitPrice)}
        </Text>
      </View>
      <Pressable style={styles.smallBtn} onPress={() => onAdd(item)}>
        <Text style={styles.smallBtnText}>Adicionar</Text>
      </Pressable>
    </View>
  );
}

function QuoteLine({ item, onChangeQty }: { item: QuoteItem; onChangeQty: (id: string, qty: number) => void }) {
  return (
    <View style={styles.quoteLine}>
      <View style={{ flex: 1 }}>
        <Text style={styles.quoteName}>{item.name}</Text>
        <Text style={styles.quoteMeta}>{currency(item.unitPrice)}{item.unit ? ` / ${item.unit}` : ' un.'}</Text>
      </View>
      <TextInput
        style={styles.qtyInput}
        value={String(item.quantity)}
        keyboardType="numeric"
        onChangeText={(value) => onChangeQty(item.id, Number(onlyDigits(value)) || 0)}
      />
      <Text style={styles.quoteTotal}>{currency(item.quantity * item.unitPrice)}</Text>
    </View>
  );
}

export default function ServiceOrderScreen() {
  const { state, createOrder, convertQuoteToOrder } = useData();

  const [mode, setMode] = useState<'importar' | 'manual'>('importar');
  const [quoteId, setQuoteId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentCondition, setPaymentCondition] = useState('');
  const [executionDeadline, setExecutionDeadline] = useState('');
  const [warranty, setWarranty] = useState('');
  const [discount, setDiscount] = useState('');
  const [additionalExpanded, setAdditionalExpanded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [catalogType, setCatalogType] = useState<ItemType>('produto');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [manualItems, setManualItems] = useState<QuoteItem[]>([]);

  const selectedQuote = state.quotes.find((quote) => quote.id === quoteId);

  const manualTotal = useMemo(
    () => manualItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [manualItems],
  );

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();

    return state.customers
      .filter((customer) => {
        if (!term) return true;

        const customerName = customer.name?.toLowerCase() ?? '';
        const customerPhone = customer.phone?.toLowerCase() ?? '';
        const customerDocument = customer.document?.toLowerCase() ?? '';

        return (
          customerName.includes(term)
          || customerPhone.includes(term)
          || customerDocument.includes(term)
        );
      })
      .slice(0, 3);
  }, [state.customers, customerSearch]);

  const filteredCatalog = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase();

    return state.catalog
      .filter((item) => item.type === catalogType)
      .filter((item) => {
        if (!term) return true;

        const itemName = item.name?.toLowerCase() ?? '';
        const itemDescription = item.description?.toLowerCase() ?? '';
        const itemUnit = item.unit?.toLowerCase() ?? '';

        return (
          itemName.includes(term)
          || itemDescription.includes(term)
          || itemUnit.includes(term)
        );
      })
      .slice(0, 3);
  }, [state.catalog, catalogType, catalogSearch]);

  const addCatalogToOrder = (item: CatalogItem) => {
    setManualItems((prev) => {
      const found = prev.find((entry) => entry.id === item.id);
      if (found) {
        return prev.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry,
        );
      }

      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          description: item.description,
          unit: item.unit,
          quantity: 1,
          unitPrice: item.unitPrice,
          type: item.type,
        },
      ];
    });
  };

  const changeQty = (id: string, quantity: number) => {
    setManualItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(quantity, 0) } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const createManualOrder = async () => {
    if (!customerId) {
      Alert.alert('Validacao', 'Selecione um cliente para a OS manual.');
      return;
    }
    if (manualItems.length === 0) {
      Alert.alert('Validacao', 'Adicione itens para criar a OS.');
      return;
    }

    try {
      const order = await createOrder({
        customerId,
        items: manualItems,
        notes,
        paymentCondition,
        executionDeadline,
        warranty,
        discount,
      });
      Alert.alert('OS criada', `Numero ${order.number} criada com sucesso.`);
      setManualItems([]);
      setCustomerSearch('');
      setCatalogSearch('');
      setNotes('');
      setPaymentCondition('');
      setExecutionDeadline('');
      setWarranty('');
      setDiscount('');
    } catch (error) {
      Alert.alert('Erro', (error as Error).message);
    }
  };

  const convertFromQuote = async () => {
    if (!selectedQuote) return;
    try {
      const order = await convertQuoteToOrder(selectedQuote.id);
      setQuoteId('');
      Alert.alert('OS criada', `OS numero ${order.number} criada com sucesso. Orcamento marcado como convertido.`);
    } catch (error) {
      Alert.alert('Erro ao converter', (error as Error).message);
    }
  };

  const exportOrderPdf = async (orderId: string) => {
    const order = state.orders.find((entry) => entry.id === orderId);
    if (!order) {
      Alert.alert('Nao foi possivel gerar PDF', 'OS nao encontrada.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      await shareDocumentPdf({
        type: 'ordem-servico',
        number: order.number,
        customerName: order.customerName,
        customerDocument: order.customerDocument,
        customerPhone: order.customerPhone,
        items: order.items,
        notes: order.notes,
        total: order.total,
        createdAt: order.createdAt,
        customer: state.customers.find((customer) => customer.id === order.customerId),
      });
    } catch (error) {
      Alert.alert('Nao foi possivel gerar PDF', (error as Error).message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerWrap}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBack}>{'<'} Voltar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Ordem de Servico</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.modeWrap}>
          <Pressable
            style={[styles.modeBtn, mode === 'importar' && styles.modeBtnActive]}
            onPress={() => setMode('importar')}>
            <Text style={[styles.modeTxt, mode === 'importar' && styles.modeTxtActive]}>
              Importar de Orcamento
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
            onPress={() => setMode('manual')}>
            <Text style={[styles.modeTxt, mode === 'manual' && styles.modeTxtActive]}>Criar manual</Text>
          </Pressable>
        </View>

        {mode === 'importar' ? (
          <View style={styles.card}>
            <Text style={styles.title}>Orcamentos aprovados</Text>
            {state.quotes.filter((q) => q.status === 'aprovado').length === 0 ? (
              <Text style={styles.empty}>Nao existem orcamentos aprovados.</Text>
            ) : (
              state.quotes.filter((q) => q.status === 'aprovado').map((quote) => (
                <Pressable
                  key={quote.id}
                  onPress={() => setQuoteId(quote.id)}
                  style={[styles.quoteCard, quote.id === quoteId && styles.quoteCardActive]}>
                  <Text style={styles.quoteNumber}>{quote.number}</Text>
                  <Text style={styles.meta}>{quote.customerName}</Text>
                  <Text style={styles.meta}>Status: {quote.status}</Text>
                  <Text style={styles.meta}>Total: {currency(quote.total)}</Text>
                </Pressable>
              ))
            )}
            <Pressable
              style={[
                styles.primaryBtn,
                !selectedQuote && { opacity: 0.45 },
              ]}
              disabled={!selectedQuote}
              onPress={convertFromQuote}>
              <Text style={styles.primaryTxt}>Converter em OS</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Nova OS manual</Text>
            <Text style={styles.label}>Selecione cliente</Text>
            {state.customers.length === 0 ? (
              <Text style={styles.empty}>Cadastre um cliente primeiro em Novo Orcamento.</Text>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  placeholder="Buscar cliente (nome, telefone ou documento)"
                />

                <FlatList
                  data={filteredCustomers}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ListEmptyComponent={<Text style={styles.empty}>Nenhum cliente encontrado.</Text>}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setCustomerId(item.id)}
                      style={[styles.customerCard, customerId === item.id && styles.customerCardActive]}>
                      <Text style={styles.customerName}>{item.name}</Text>
                      <Text style={styles.meta}>{item.phone} - {item.document || 'Sem documento'}</Text>
                    </Pressable>
                  )}
                />
              </>
            )}

            <Text style={styles.label}>Selecionar itens</Text>
            <View style={styles.switchRow}>
              <Pressable
                style={[styles.switchBtn, catalogType === 'produto' && styles.switchBtnActive]}
                onPress={() => setCatalogType('produto')}>
                <Text style={[styles.switchText, catalogType === 'produto' && styles.switchTextActive]}>
                  Produtos
                </Text>
              </Pressable>
              <Pressable
                style={[styles.switchBtn, catalogType === 'servico' && styles.switchBtnActive]}
                onPress={() => setCatalogType('servico')}>
                <Text style={[styles.switchText, catalogType === 'servico' && styles.switchTextActive]}>
                  Servicos
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              value={catalogSearch}
              onChangeText={setCatalogSearch}
              placeholder={`Buscar ${catalogType === 'produto' ? 'produto' : 'servico'} (nome, descricao ou unidade)`}
            />

            <FlatList
              data={filteredCatalog}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.empty}>Nenhum item encontrado.</Text>}
              renderItem={({ item }) => <ItemLine item={item} onAdd={addCatalogToOrder} />}
            />

            <Text style={styles.label}>Itens escolhidos</Text>
            <FlatList
              data={manualItems}
              keyExtractor={(item) => `${item.id}-${item.type}`}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.empty}>Nenhum item adicionado.</Text>}
              renderItem={({ item }) => <QuoteLine item={item} onChangeQty={changeQty} />}
            />
            <Text style={styles.total}>Total: {currency(manualTotal)}</Text>

            <Pressable style={styles.primaryBtn} onPress={createManualOrder}>
              <Text style={styles.primaryTxt}>Criar Ordem de Servico</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Pressable style={styles.collapseHeader} onPress={() => setAdditionalExpanded((v) => !v)}>
            <Text style={styles.title}>Informacoes Adicionais</Text>
            <MaterialIcons
              name={additionalExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={24}
              color={AppTheme.charcoal}
            />
          </Pressable>

          {additionalExpanded && (
            <>
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Condicao de Pagamento</Text>
                <TextInput
                  style={styles.input}
                  value={paymentCondition}
                  onChangeText={setPaymentCondition}
                  placeholder="Ex: 30/60/90 dias"
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Prazo de Execucao</Text>
                <TextInput
                  style={styles.input}
                  value={executionDeadline}
                  onChangeText={setExecutionDeadline}
                  placeholder="Ex: 15 dias uteis"
                />
              </View>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Garantia</Text>
                    <TextInput
                      style={styles.input}
                      value={warranty}
                      onChangeText={setWarranty}
                      placeholder="Ex: 12 meses"
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Desconto (%)</Text>
                    <TextInput
                      style={styles.input}
                      value={discount}
                      onChangeText={setDiscount}
                      placeholder="Ex: 5"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Observacoes Gerais</Text>
                <TextInput
                  style={[styles.input, styles.notes]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Observacoes adicionais..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Ordens de servico criadas</Text>
          {state.orders.length === 0 ? (
            <Text style={styles.empty}>Nenhuma OS gerada ate agora.</Text>
          ) : (
            state.orders.map((order) => (
              <View key={order.id} style={styles.osLine}>
                <Text style={styles.quoteNumber}>{order.number}</Text>
                <Text style={styles.meta}>{order.customerName}</Text>
                <Text style={styles.meta}>Itens: {order.items.length}</Text>
                <Text style={styles.meta}>Total: {currency(order.total)}</Text>
                <Pressable style={styles.secondaryBtn} onPress={() => exportOrderPdf(order.id)}>
                  <Text style={styles.secondaryTxt}>Gerar PDF</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
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
  container: {
    padding: 14,
    gap: 12,
    paddingBottom: 40,
  },
  modeWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: AppTheme.white,
  },
  modeBtnActive: {
    borderColor: AppTheme.yellowDark,
    backgroundColor: '#FFE9A1',
  },
  modeTxt: {
    fontWeight: '700',
    color: AppTheme.charcoal,
  },
  modeTxtActive: {
    color: '#5B4300',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.line,
    backgroundColor: AppTheme.white,
    padding: 12,
    gap: 10,
  },
  title: {
    fontWeight: '900',
    fontSize: 16,
    color: AppTheme.black,
  },
  quoteCard: {
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  quoteCardActive: {
    borderColor: AppTheme.yellowDark,
    backgroundColor: '#FFF3C8',
  },
  quoteNumber: {
    fontWeight: '900',
    color: AppTheme.black,
  },
  meta: {
    color: AppTheme.charcoal,
    fontSize: 12,
  },
  warn: {
    color: '#A36200',
    fontSize: 12,
  },
  primaryBtn: {
    backgroundColor: AppTheme.yellow,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 8,
  },
  primaryTxt: {
    color: AppTheme.black,
    fontWeight: '900',
    textAlign: 'center',
  },
  secondaryBtn: {
    backgroundColor: AppTheme.charcoal,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  secondaryTxt: {
    color: AppTheme.white,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  switchBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  switchBtnActive: {
    borderColor: AppTheme.yellowDark,
    backgroundColor: '#FFE9A1',
  },
  switchText: {
    fontWeight: '700',
    color: AppTheme.charcoal,
  },
  switchTextActive: {
    color: '#5B4300',
  },
  label: {
    fontWeight: '700',
    color: AppTheme.black,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 8,
    height: 42,
    paddingHorizontal: 10,
  },
  notes: {
    height: 82,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  itemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    paddingVertical: 6,
  },
  catalogLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 10,
    padding: 10,
  },
  catalogName: {
    fontWeight: '800',
    color: AppTheme.black,
  },
  catalogMeta: {
    color: AppTheme.charcoal,
    fontSize: 12,
  },
  smallBtn: {
    backgroundColor: AppTheme.charcoal,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallBtnText: {
    color: AppTheme.white,
    fontWeight: '700',
  },
  quoteLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 10,
    padding: 10,
  },
  quoteName: {
    fontWeight: '800',
    color: AppTheme.black,
  },
  quoteMeta: {
    color: AppTheme.charcoal,
    fontSize: 12,
  },
  qtyInput: {
    width: 52,
    height: 38,
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#FCFCFC',
  },
  quoteTotal: {
    minWidth: 72,
    textAlign: 'right',
    fontWeight: '800',
    color: AppTheme.black,
  },
  total: {
    fontWeight: '900',
    color: AppTheme.black,
    textAlign: 'right',
  },
  osLine: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 6,
  },
  customerCard: {
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  customerCardActive: {
    borderColor: AppTheme.yellowDark,
    backgroundColor: '#FFF3C8',
  },
  customerName: {
    fontWeight: '800',
    color: AppTheme.black,
  },
  empty: {
    color: AppTheme.charcoal,
    fontStyle: 'italic',
  },
  collapseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldWrap: {
    gap: 5,
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
