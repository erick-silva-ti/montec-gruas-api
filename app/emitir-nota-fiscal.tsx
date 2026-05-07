import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTheme, currency } from '@/constants/app-theme';
import { formatCpfCnpj, formatDatePtBr, formatPhone } from '@/lib/formatters';
import { useData } from '@/lib/data-context';

export default function InvoiceScreen() {
  const { state } = useData();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const orders = useMemo(
    () => [...state.orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.orders],
  );

  const toggleDetails = (orderId: string) => {
    setExpandedOrderId((current) => (current === orderId ? null : orderId));
  };

  const onIssueInvoice = () => {
    Alert.alert('Em breve', 'A emissao de nota fiscal sera implementada futuramente.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerWrap}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.headerBack}>{'<'} Voltar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Emitir Nota Fiscal</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {orders.length === 0 ? (
          <Text style={styles.empty}>Nenhuma ordem de servico encontrada.</Text>
        ) : (
          orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;

            return (
              <View key={order.id} style={styles.card}>
                <Text style={styles.number}>{order.number}</Text>
                <Text style={styles.meta}>Cliente: {order.customerName}</Text>
                <Text style={styles.meta}>Data: {formatDatePtBr(order.createdAt)}</Text>
                <Text style={styles.total}>Total: {currency(order.total)}</Text>

                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.button, styles.buttonOutline]}
                    onPress={() => toggleDetails(order.id)}>
                    <Text style={[styles.buttonText, styles.buttonTextOutline]}>
                      {isExpanded ? 'Ocultar' : 'Visualizar'}
                    </Text>
                  </Pressable>
                  <Pressable style={[styles.button, styles.buttonSolid]} onPress={onIssueInvoice}>
                    <Text style={styles.buttonText}>Emitir Nota</Text>
                  </Pressable>
                </View>

                {isExpanded ? (
                  <View style={styles.detailsBox}>
                    <Text style={styles.detailLine}>Documento: {formatCpfCnpj(order.customerDocument || '') || 'Nao informado'}</Text>
                    <Text style={styles.detailLine}>Telefone: {formatPhone(order.customerPhone || '') || 'Nao informado'}</Text>
                    <Text style={styles.detailLine}>Condicao de pagamento: {order.paymentCondition || 'Nao informado'}</Text>
                    <Text style={styles.detailLine}>Prazo de execucao: {order.executionDeadline || 'Nao informado'}</Text>
                    <Text style={styles.detailLine}>Garantia: {order.warranty || 'Nao informado'}</Text>
                    <Text style={styles.detailLine}>Observacoes: {order.notes || 'Sem observacoes'}</Text>

                    <Text style={styles.itemsTitle}>Itens da ordem</Text>
                    {order.items.map((item, index) => (
                      <View key={`${order.id}-${item.id}-${index}`} style={styles.itemLine}>
                        <Text style={styles.itemText}>{item.quantity}x {item.name}</Text>
                        <Text style={styles.itemValue}>{currency(item.quantity * item.unitPrice)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
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
    gap: 5,
  },
  number: {
    fontWeight: '900',
    color: AppTheme.black,
    fontSize: 16,
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
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: AppTheme.charcoal,
    backgroundColor: AppTheme.white,
  },
  buttonSolid: {
    backgroundColor: AppTheme.charcoal,
  },
  buttonText: {
    color: AppTheme.white,
    fontWeight: '700',
  },
  buttonTextOutline: {
    color: AppTheme.charcoal,
  },
  detailsBox: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: AppTheme.line,
    paddingTop: 10,
    gap: 4,
  },
  detailLine: {
    color: AppTheme.charcoal,
    fontSize: 12,
  },
  itemsTitle: {
    marginTop: 8,
    fontWeight: '800',
    color: AppTheme.black,
    fontSize: 13,
  },
  itemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    paddingVertical: 6,
  },
  itemText: {
    color: AppTheme.charcoal,
    flex: 1,
    marginRight: 8,
  },
  itemValue: {
    color: AppTheme.black,
    fontWeight: '700',
  },
});
