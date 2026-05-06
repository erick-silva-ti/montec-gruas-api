import { router, useLocalSearchParams } from 'expo-router';
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
import {
  CatalogItem,
  Customer,
  ItemType,
  useData,
} from '@/lib/data-context';
import { formatCpfCnpj, formatPhone, parseMoneyInput, sanitizeMoneyInput } from '@/lib/formatters';

type MaintenanceType = 'clientes' | 'produtos' | 'servicos';
type CustomerPayload = {
  name: string;
  phone: string;
  document: string;
  companyName: string;
  address: string;
  district: string;
  cityUf: string;
};
type CatalogPayload = {
  type: ItemType;
  name: string;
  description: string;
  unit: string;
  unitPrice: number;
};

const isMaintenanceType = (value: string): value is MaintenanceType =>
  value === 'clientes' || value === 'produtos' || value === 'servicos';

function Header({ title }: { title: string }) {
  return (
    <View style={styles.headerWrap}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.headerBack}>{'<'} Voltar</Text>
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 50 }} />
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: TextInputProps['keyboardType'];
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        style={styles.input}
      />
    </View>
  );
}

export default function MaintenanceCrudScreen() {
  const params = useLocalSearchParams<{ tipo?: string | string[] }>();
  const rawType = Array.isArray(params.tipo) ? params.tipo[0] : params.tipo;
  const tipo: MaintenanceType = isMaintenanceType(rawType ?? '') ? (rawType as MaintenanceType) : 'clientes';

  const {
    state,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
  } = useData();

  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [cityUf, setCityUf] = useState('');

  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  const screenTitle =
    tipo === 'clientes' ? 'Manutencao de clientes' : tipo === 'produtos' ? 'Manutencao de produtos' : 'Manutencao de servicos';

  const catalogType: ItemType = tipo === 'produtos' ? 'produto' : 'servico';

  const listData = useMemo(() => {
    if (tipo === 'clientes') {
      return state.customers;
    }
    return state.catalog.filter((entry) => entry.type === catalogType);
  }, [tipo, state.customers, state.catalog, catalogType]);

  const resetCustomerForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setDocument('');
    setCompanyName('');
    setAddress('');
    setDistrict('');
    setCityUf('');
  };

  const resetCatalogForm = () => {
    setEditingId(null);
    setItemName('');
    setItemDescription('');
    setItemUnit('');
    setItemPrice('');
  };

  const loadCustomerForEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setName(customer.name);
    setPhone(customer.phone);
    setDocument(customer.document);
    setCompanyName(customer.companyName);
    setAddress(customer.address);
    setDistrict(customer.district);
    setCityUf(customer.cityUf);
  };

  const loadCatalogForEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setItemName(item.name);
    setItemDescription(item.description);
    setItemUnit(item.unit ?? '');
    setItemPrice(currency(item.unitPrice));
  };

  const saveCustomer = async () => {
    try {
      const payload: CustomerPayload = {
        name,
        phone,
        document,
        companyName,
        address,
        district,
        cityUf,
      };

      if (!payload.name.trim() || !payload.phone.trim()) {
        Alert.alert('Validacao', 'Nome e telefone sao obrigatorios.');
        return;
      }

      if (editingId) {
        await updateCustomer(editingId, payload);
        Alert.alert('Sucesso', 'Cliente atualizado.');
      } else {
        await addCustomer(payload);
        Alert.alert('Sucesso', 'Cliente cadastrado.');
      }

      resetCustomerForm();
    } catch (error) {
      Alert.alert('Erro', (error as Error).message);
    }
  };

  const saveCatalog = async () => {
    try {
      const parsed = parseMoneyInput(itemPrice);
      if (!itemName.trim() || Number.isNaN(parsed) || parsed <= 0) {
        Alert.alert('Validacao', 'Informe nome e preco valido.');
        return;
      }

      const payload: CatalogPayload = {
        type: catalogType,
        name: itemName,
        description: itemDescription,
        unit: itemUnit,
        unitPrice: parsed,
      };

      if (editingId) {
        await updateCatalogItem(editingId, payload);
        Alert.alert('Sucesso', 'Item atualizado.');
      } else {
        await addCatalogItem(payload);
        Alert.alert('Sucesso', 'Item cadastrado.');
      }

      resetCatalogForm();
    } catch (error) {
      Alert.alert('Erro', (error as Error).message);
    }
  };

  const confirmDeleteCustomer = (customer: Customer) => {
    Alert.alert('Excluir cliente', `Deseja excluir ${customer.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void deleteCustomer(customer.id)
            .then(() => {
              if (editingId === customer.id) {
                resetCustomerForm();
              }
              Alert.alert('Sucesso', 'Cliente excluido.');
            })
            .catch((error: Error) => Alert.alert('Erro', error.message));
        },
      },
    ]);
  };

  const confirmDeleteCatalog = (item: CatalogItem) => {
    Alert.alert('Excluir item', `Deseja excluir ${item.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void deleteCatalogItem(item.id)
            .then(() => {
              if (editingId === item.id) {
                resetCatalogForm();
              }
              Alert.alert('Sucesso', 'Item excluido.');
            })
            .catch((error: Error) => Alert.alert('Erro', error.message));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title={screenTitle} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.formWrap}>
          <Text style={styles.formTitle}>{editingId ? 'Editar cadastro' : 'Novo cadastro'}</Text>

          {tipo === 'clientes' ? (
            <>
              <Field label="Nome" value={name} onChangeText={setName} />
              <Field
                label="Telefone"
                value={phone}
                onChangeText={(value) => setPhone(formatPhone(value))}
                keyboardType="phone-pad"
              />
              <Field
                label="CPF/CNPJ"
                value={document}
                onChangeText={(value) => setDocument(formatCpfCnpj(value))}
                keyboardType="numeric"
              />
              <Field label="Razao social" value={companyName} onChangeText={setCompanyName} />
              <Field label="Endereco" value={address} onChangeText={setAddress} />
              <Field label="Bairro" value={district} onChangeText={setDistrict} />
              <Field label="Cidade/UF" value={cityUf} onChangeText={setCityUf} />

              <View style={styles.actionsRow}>
                <Pressable style={styles.primaryBtn} onPress={() => void saveCustomer()}>
                  <Text style={styles.primaryBtnText}>{editingId ? 'Atualizar' : 'Cadastrar'}</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={resetCustomerForm}>
                  <Text style={styles.secondaryBtnText}>Limpar</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Field label="Nome" value={itemName} onChangeText={setItemName} />
              <Field label="Descricao" value={itemDescription} onChangeText={setItemDescription} />
              <Field label="Unidade (ex: caixa, un, pacote)" value={itemUnit} onChangeText={setItemUnit} placeholder="un" />
              <Field
                label="Preco unitario"
                value={itemPrice}
                onChangeText={(value) => setItemPrice(sanitizeMoneyInput(value))}
                keyboardType="numeric"
              />

              <View style={styles.actionsRow}>
                <Pressable style={styles.primaryBtn} onPress={() => void saveCatalog()}>
                  <Text style={styles.primaryBtnText}>{editingId ? 'Atualizar' : 'Cadastrar'}</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={resetCatalogForm}>
                  <Text style={styles.secondaryBtnText}>Limpar</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <Text style={styles.listTitle}>Registros</Text>

        {tipo === 'clientes' ? (
          <FlatList
            data={listData as Customer[]}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum cliente cadastrado.</Text>}
            renderItem={({ item }) => (
              <View style={styles.lineCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>{item.name}</Text>
                  <Text style={styles.lineMeta}>{item.phone} - {item.document || 'Sem documento'}</Text>
                </View>
                <View style={styles.lineActions}>
                  <Pressable style={styles.lineBtnEdit} onPress={() => loadCustomerForEdit(item)}>
                    <Text style={styles.lineBtnEditText}>Editar</Text>
                  </Pressable>
                  <Pressable style={styles.lineBtnDelete} onPress={() => confirmDeleteCustomer(item)}>
                    <Text style={styles.lineBtnDeleteText}>Excluir</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={listData as CatalogItem[]}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum item cadastrado.</Text>}
            renderItem={({ item }) => (
              <View style={styles.lineCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>{item.name}</Text>
                  <Text style={styles.lineMeta}>{item.description || 'Sem descricao'}</Text>
                  <View style={styles.lineTagRow}>
                    {!!item.unit && (
                      <View style={styles.unitTag}><Text style={styles.unitTagText}>{item.unit}</Text></View>
                    )}
                    <Text style={styles.priceText}>{currency(item.unitPrice)}</Text>
                  </View>
                </View>
                <View style={styles.lineActions}>
                  <Pressable style={styles.lineBtnEdit} onPress={() => loadCatalogForEdit(item)}>
                    <Text style={styles.lineBtnEditText}>Editar</Text>
                  </Pressable>
                  <Pressable style={styles.lineBtnDelete} onPress={() => confirmDeleteCatalog(item)}>
                    <Text style={styles.lineBtnDeleteText}>Excluir</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
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
    fontSize: 17,
  },
  container: {
    padding: 16,
    paddingBottom: 28,
  },
  formWrap: {
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: AppTheme.white,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.black,
    marginBottom: 10,
  },
  fieldWrap: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: AppTheme.charcoal,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 10,
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: AppTheme.black,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: AppTheme.yellowDark,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: AppTheme.white,
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: AppTheme.charcoal,
    fontWeight: '800',
    fontSize: 14,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.black,
    marginBottom: 8,
  },
  empty: {
    paddingVertical: 18,
    textAlign: 'center',
    color: '#666',
    fontWeight: '600',
  },
  listHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  searchWrap:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: AppTheme.line, borderRadius: 10, backgroundColor: AppTheme.white, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10 },
  searchInput:      { flex: 1, fontSize: 14, color: AppTheme.black },
  pagerRow:         { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 12 },
  pagerBtn:         { padding: 6, borderRadius: 8, backgroundColor: '#F0F0F0' },
  pagerBtnDisabled: { backgroundColor: '#F9F9F9' },
  pagerText:        { fontSize: 14, fontWeight: '700' as const, color: AppTheme.charcoal },
  lineCardActive:   { borderColor: AppTheme.yellow, borderWidth: 2 },
  lineMeta:         { marginTop: 2, fontSize: 12, color: '#555', fontWeight: '600' as const },
  lineTagRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  unitTag:          { backgroundColor: '#F0D060', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  unitTagText:      { fontSize: 11, fontWeight: '800' as const, color: AppTheme.yellowDark },
  priceText:        { fontSize: 13, color: AppTheme.yellowDark, fontWeight: '800' as const },
  lineCard: {
    borderWidth: 1,
    borderColor: AppTheme.line,
    borderRadius: 12,
    padding: 10,
    backgroundColor: AppTheme.white,
    flexDirection: 'row',
    gap: 10,
  },
  lineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: AppTheme.black,
  },
  lineActions: {
    justifyContent: 'center',
    gap: 6,
  },
  lineBtnEdit: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
  },
  lineBtnEditText: {
    fontSize: 12,
    fontWeight: '800',
    color: AppTheme.charcoal,
  },
  lineBtnDelete: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFE9E9',
    alignItems: 'center',
  },
  lineBtnDeleteText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9E1F1F',
  },
});
