import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTheme, currency } from '@/constants/app-theme';
import { onlyDigits } from '@/lib/formatters';
import { CatalogItem, ItemType, QuoteItem, useData } from '@/lib/data-context';
import { MaterialIcons } from '@expo/vector-icons';

function Header() {
  return (
    <View style={styles.headerWrap}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.headerBack}>{'<'} Voltar</Text>
      </Pressable>
      <Text style={styles.headerTitle}>Novo Orcamento</Text>
      <View style={{ width: 50 }} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LabelInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  maxLength?: number;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={styles.input}
      />
    </View>
  );
}

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

function QuoteLine({
  item,
  onChangeQty,
  onIncrement,
  onDecrement,
}: {
  item: QuoteItem;
  onChangeQty: (id: string, qty: number) => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
}) {
  return (
    <View style={styles.quoteLine}>
      <View style={{ flex: 1 }}>
        <Text style={styles.quoteName}>{item.name}</Text>
        <Text style={styles.quoteMeta}>{currency(item.unitPrice)}{item.unit ? ` / ${item.unit}` : ' un.'}</Text>
      </View>
      <View style={styles.qtyControls}>
        <Pressable style={styles.qtyBtn} onPress={() => onDecrement(item.id)}>
          <Text style={styles.qtyBtnText}>-</Text>
        </Pressable>
        <TextInput
          style={styles.qtyInput}
          value={String(item.quantity)}
          keyboardType="numeric"
          onChangeText={(v) => onChangeQty(item.id, Number(onlyDigits(v)) || 0)}
        />
        <Pressable style={styles.qtyBtn} onPress={() => onIncrement(item.id)}>
          <Text style={styles.qtyBtnText}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.quoteTotal}>{currency(item.quantity * item.unitPrice)}</Text>
    </View>
  );
}

export default function NewQuoteScreen() {
  const { state, createQuote } = useData();

  const [customerId, setCustomerId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');

  const [notes, setNotes] = useState('');
  const [paymentCondition, setPaymentCondition] = useState('');
  const [executionDeadline, setExecutionDeadline] = useState('');
  const [warranty, setWarranty] = useState('');
  const [discount, setDiscount] = useState('');
  const [additionalExpanded, setAdditionalExpanded] = useState(false);

  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([]);

  const [catalogType, setCatalogType] = useState<ItemType>('produto');
  const [catalogSearch, setCatalogSearch] = useState('');

  const total = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [selectedItems],
  );

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

  const addCatalogToQuote = (item: CatalogItem) => {
    setSelectedItems((prev) => {
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
    setSelectedItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(quantity, 0) } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const incrementQty = (id: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)),
    );
  };

  const decrementQty = (id: string) => {
    setSelectedItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const saveQuote = async () => {
    try {
      if (selectedItems.length === 0) {
        Alert.alert('Validacao', 'Adicione pelo menos um produto ou servico.');
        return;
      }

      if (!customerId) {
        Alert.alert('Validacao', 'Selecione um cliente cadastrado.');
        return;
      }

      const quote = await createQuote({
        customerId,
        items: selectedItems,
        notes,
        paymentCondition,
        executionDeadline,
        warranty,
        discount,
      });

      Alert.alert('Orcamento salvo', `Numero ${quote.number} criado com sucesso.`);
      router.replace('/orcamentos');
    } catch (error) {
      Alert.alert('Nao foi possivel salvar', (error as Error).message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header />
      <ScrollView contentContainerStyle={styles.container}>
        <Section title="Selecionar cliente">
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
                <Text style={styles.customerMeta}>{item.phone} - {item.document || 'Sem documento'}</Text>
              </Pressable>
            )}
          />
        </Section>

        <Section title="Selecionar itens do orcamento">
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
            renderItem={({ item }) => <ItemLine item={item} onAdd={addCatalogToQuote} />}
          />
        </Section>

        <Section title="Itens escolhidos">
          <FlatList
            data={selectedItems}
            keyExtractor={(item) => `${item.id}-${item.type}`}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum item adicionado.</Text>}
            renderItem={({ item }) => (
              <QuoteLine
                item={item}
                onChangeQty={changeQty}
                onIncrement={incrementQty}
                onDecrement={decrementQty}
              />
            )}
          />
          <Text style={styles.total}>Total: {currency(total)}</Text>
        </Section>

        <View style={styles.section}>
          <Pressable style={styles.collapseHeader} onPress={() => setAdditionalExpanded((v) => !v)}>
            <Text style={styles.sectionTitle}>Informacoes Adicionais</Text>
            <MaterialIcons
              name={additionalExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={24}
              color={AppTheme.charcoal}
            />
          </Pressable>

          {additionalExpanded && (
            <>
              <LabelInput label="Condicao de Pagamento" value={paymentCondition} onChangeText={setPaymentCondition} placeholder="Ex: 30/60/90 dias" />
              <LabelInput label="Prazo de Execucao" value={executionDeadline} onChangeText={setExecutionDeadline} placeholder="Ex: 15 dias uteis" />
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <LabelInput label="Garantia" value={warranty} onChangeText={setWarranty} placeholder="Ex: 12 meses" />
                </View>
                <View style={{ flex: 1 }}>
                  <LabelInput label="Desconto (%)" value={discount} onChangeText={setDiscount} placeholder="Ex: 5" keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Observacoes Gerais</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
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

        <Pressable style={styles.primaryButton} onPress={saveQuote}>
          <Text style={styles.primaryButtonText}>Salvar Orcamento</Text>
        </Pressable>
      </ScrollView>
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
    gap: 14,
    paddingBottom: 42,
  },
  section: {
    backgroundColor: AppTheme.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.line,
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.black,
  },
  fieldWrap: {
    gap: 5,
  },
  label: {
    fontSize: 13,
    color: AppTheme.charcoal,
    fontWeight: '600',
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FCFCFC',
  },
  switchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  switchBtn: {
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
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
  customerMeta: {
    marginTop: 2,
    color: AppTheme.charcoal,
    fontSize: 12,
  },
  catalogLine: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    paddingVertical: 9,
  },
  catalogName: {
    fontWeight: '700',
    color: AppTheme.black,
  },
  catalogMeta: {
    fontSize: 12,
    color: AppTheme.charcoal,
  },
  smallBtn: {
    backgroundColor: AppTheme.charcoal,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    color: AppTheme.white,
    fontWeight: '700',
  },
  quoteLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    paddingVertical: 8,
  },
  quoteName: {
    fontWeight: '700',
    color: AppTheme.black,
  },
  quoteMeta: {
    fontSize: 12,
    color: AppTheme.charcoal,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.white,
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.charcoal,
    lineHeight: 20,
  },
  qtyInput: {
    width: 52,
    height: 34,
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 7,
    textAlign: 'center',
  },
  quoteTotal: {
    width: 90,
    textAlign: 'right',
    fontWeight: '700',
    color: AppTheme.black,
  },
  total: {
    marginTop: 8,
    textAlign: 'right',
    fontWeight: '900',
    fontSize: 16,
    color: AppTheme.black,
  },
  primaryButton: {
    backgroundColor: AppTheme.yellow,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: AppTheme.black,
    fontWeight: '900',
    fontSize: 16,
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
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
});
