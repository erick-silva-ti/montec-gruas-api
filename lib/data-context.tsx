import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type ItemType = 'produto' | 'servico';
export type QuoteStatus = 'rascunho' | 'aprovado' | 'rejeitado' | 'convertido';
export type OrderStatus = 'aberta' | 'em_andamento' | 'concluida';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  document: string;
  companyName: string;
  address: string;
  district: string;
  cityUf: string;
  createdAt: string;
}

export interface CatalogItem {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  unit: string;
  unitPrice: number;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerPhone: string;
  items: QuoteItem[];
  notes: string;
  paymentCondition: string;
  executionDeadline: string;
  warranty: string;
  discount: string;
  total: number;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOrder {
  id: string;
  number: string;
  quoteId?: string;
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerPhone: string;
  items: QuoteItem[];
  notes: string;
  paymentCondition: string;
  executionDeadline: string;
  warranty: string;
  discount: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

interface Counters {
  customer: number;
  catalog: number;
  quote: number;
  order: number;
}

interface DataState {
  customers: Customer[];
  catalog: CatalogItem[];
  quotes: Quote[];
  orders: ServiceOrder[];
  counters: Counters;
}

const STORAGE_KEY = '@grua:data:v1';

const seedCatalog = (): CatalogItem[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'cat-1',
      type: 'servico',
      name: 'Locacao de grua',
      description: 'Locacao de equipamento para obra',
      unit: 'dia',
      unitPrice: 2500,
      createdAt: now,
    },
    {
      id: 'cat-2',
      type: 'servico',
      name: 'Montagem de grua',
      description: 'Equipe tecnica para montagem',
      unit: 'un',
      unitPrice: 1800,
      createdAt: now,
    },
    {
      id: 'cat-3',
      type: 'produto',
      name: 'Peca de reposicao',
      description: 'Componente de manutencao',
      unit: 'un',
      unitPrice: 420,
      createdAt: now,
    },
  ];
};

const initialState = (): DataState => ({
  customers: [],
  catalog: seedCatalog(),
  quotes: [],
  orders: [],
  counters: {
    customer: 0,
    catalog: 3,
    quote: 0,
    order: 0,
  },
});

interface CreateCustomerInput {
  name: string;
  phone: string;
  document: string;
  companyName: string;
  address: string;
  district: string;
  cityUf: string;
}

interface CreateCatalogInput {
  type: ItemType;
  name: string;
  description: string;
  unit: string;
  unitPrice: number;
}

interface CreateQuoteInput {
  customerId: string;
  items: QuoteItem[];
  notes: string;
  paymentCondition: string;
  executionDeadline: string;
  warranty: string;
  discount: string;
}

interface UpdateQuoteInput {
  customerId: string;
  items: QuoteItem[];
  notes: string;
  paymentCondition: string;
  executionDeadline: string;
  warranty: string;
  discount: string;
}

interface CreateOrderInput {
  customerId: string;
  items: QuoteItem[];
  notes: string;
  paymentCondition: string;
  executionDeadline: string;
  warranty: string;
  discount: string;
}

interface DataContextValue {
  loading: boolean;
  state: DataState;
  addCustomer: (input: CreateCustomerInput) => Promise<Customer>;
  updateCustomer: (customerId: string, input: CreateCustomerInput) => Promise<Customer>;
  deleteCustomer: (customerId: string) => Promise<void>;
  addCatalogItem: (input: CreateCatalogInput) => Promise<CatalogItem>;
  updateCatalogItem: (itemId: string, input: CreateCatalogInput) => Promise<CatalogItem>;
  deleteCatalogItem: (itemId: string) => Promise<void>;
  createQuote: (input: CreateQuoteInput) => Promise<Quote>;
  updateQuote: (quoteId: string, input: UpdateQuoteInput) => Promise<Quote>;
  deleteQuote: (quoteId: string) => Promise<void>;
  setQuoteStatus: (quoteId: string, status: QuoteStatus) => Promise<void>;
  convertQuoteToOrder: (quoteId: string) => Promise<ServiceOrder>;
  createOrder: (input: CreateOrderInput) => Promise<ServiceOrder>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

const formatCode = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, '0')}`;

const quoteTotal = (items: QuoteItem[]) =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

const cloneItems = (items: QuoteItem[]): QuoteItem[] =>
  items.map((item) => ({
    id: item.id,
    type: item.type,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>(initialState);
  const stateRef = useRef<DataState>(state);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) {
          return;
        }
        if (raw) {
          const parsed = JSON.parse(raw) as DataState;
          stateRef.current = parsed;
          setState(parsed);
        } else {
          const seeded = initialState();
          stateRef.current = seeded;
          setState(seeded);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const persist = async (next: DataState) => {
    stateRef.current = next;
    setState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addCustomer = async (input: CreateCustomerInput): Promise<Customer> => {
    const current = stateRef.current;
    const now = new Date().toISOString();
    const nextCounter = current.counters.customer + 1;
    const customer: Customer = {
      id: `cli-${nextCounter}`,
      name: input.name.trim(),
      phone: input.phone.trim(),
      document: input.document.trim(),
      companyName: input.companyName.trim(),
      address: input.address.trim(),
      district: input.district.trim(),
      cityUf: input.cityUf.trim(),
      createdAt: now,
    };

    const next: DataState = {
      ...current,
      customers: [customer, ...current.customers],
      counters: {
        ...current.counters,
        customer: nextCounter,
      },
    };

    await persist(next);
    return customer;
  };

  const updateCustomer = async (
    customerId: string,
    input: CreateCustomerInput,
  ): Promise<Customer> => {
    const current = stateRef.current;
    const existing = current.customers.find((entry) => entry.id === customerId);
    if (!existing) {
      throw new Error('Cliente nao encontrado.');
    }

    const updatedCustomer: Customer = {
      ...existing,
      name: input.name.trim(),
      phone: input.phone.trim(),
      document: input.document.trim(),
      companyName: input.companyName.trim(),
      address: input.address.trim(),
      district: input.district.trim(),
      cityUf: input.cityUf.trim(),
    };

    const next: DataState = {
      ...current,
      customers: current.customers.map((entry) =>
        entry.id === customerId ? updatedCustomer : entry,
      ),
      quotes: current.quotes.map((entry) =>
        entry.customerId === customerId
          ? {
              ...entry,
              customerName: updatedCustomer.name,
              customerDocument: updatedCustomer.document,
              customerPhone: updatedCustomer.phone,
              updatedAt: new Date().toISOString(),
            }
          : entry,
      ),
      orders: current.orders.map((entry) =>
        entry.customerId === customerId
          ? {
              ...entry,
              customerName: updatedCustomer.name,
              customerDocument: updatedCustomer.document,
              customerPhone: updatedCustomer.phone,
            }
          : entry,
      ),
    };

    await persist(next);
    return updatedCustomer;
  };

  const deleteCustomer = async (customerId: string): Promise<void> => {
    const current = stateRef.current;
    const inUseInQuotes = current.quotes.some((entry) => entry.customerId === customerId);
    const inUseInOrders = current.orders.some((entry) => entry.customerId === customerId);
    if (inUseInQuotes || inUseInOrders) {
      throw new Error('Cliente vinculado a orcamentos ou ordens de servico.');
    }

    const next: DataState = {
      ...current,
      customers: current.customers.filter((entry) => entry.id !== customerId),
    };

    await persist(next);
  };

  const addCatalogItem = async (input: CreateCatalogInput): Promise<CatalogItem> => {
    const current = stateRef.current;
    const now = new Date().toISOString();
    const nextCounter = current.counters.catalog + 1;
    const catalogItem: CatalogItem = {
      id: `cat-${nextCounter}`,
      type: input.type,
      name: input.name.trim(),
      description: input.description.trim(),
      unit: input.unit.trim() || 'un',
      unitPrice: input.unitPrice,
      createdAt: now,
    };

    const next: DataState = {
      ...current,
      catalog: [catalogItem, ...current.catalog],
      counters: {
        ...current.counters,
        catalog: nextCounter,
      },
    };

    await persist(next);
    return catalogItem;
  };

  const updateCatalogItem = async (
    itemId: string,
    input: CreateCatalogInput,
  ): Promise<CatalogItem> => {
    const current = stateRef.current;
    const existing = current.catalog.find((entry) => entry.id === itemId);
    if (!existing) {
      throw new Error('Item de catalogo nao encontrado.');
    }

    const updatedItem: CatalogItem = {
      ...existing,
      type: input.type,
      name: input.name.trim(),
      description: input.description.trim(),
      unit: input.unit.trim() || 'un',
      unitPrice: input.unitPrice,
    };

    const next: DataState = {
      ...current,
      catalog: current.catalog.map((entry) => (entry.id === itemId ? updatedItem : entry)),
    };

    await persist(next);
    return updatedItem;
  };

  const deleteCatalogItem = async (itemId: string): Promise<void> => {
    const current = stateRef.current;
    const inUseInQuotes = current.quotes.some((entry) =>
      entry.items.some((item) => item.id === itemId),
    );
    const inUseInOrders = current.orders.some((entry) =>
      entry.items.some((item) => item.id === itemId),
    );
    if (inUseInQuotes || inUseInOrders) {
      throw new Error('Item vinculado a orcamentos ou ordens de servico.');
    }

    const next: DataState = {
      ...current,
      catalog: current.catalog.filter((entry) => entry.id !== itemId),
    };

    await persist(next);
  };

  const createQuote = async (input: CreateQuoteInput): Promise<Quote> => {
    const current = stateRef.current;
    const customer = current.customers.find((entry) => entry.id === input.customerId);
    if (!customer) {
      throw new Error('Cliente nao encontrado.');
    }

    const now = new Date().toISOString();
    const nextCounter = current.counters.quote + 1;
    const quote: Quote = {
      id: `orc-${nextCounter}`,
      number: formatCode('ORC', nextCounter),
      customerId: customer.id,
      customerName: customer.name,
      customerDocument: customer.document,
      customerPhone: customer.phone,
      items: cloneItems(input.items),
      notes: input.notes.trim(),
      paymentCondition: input.paymentCondition.trim(),
      executionDeadline: input.executionDeadline.trim(),
      warranty: input.warranty.trim(),
      discount: input.discount.trim(),
      total: quoteTotal(input.items),
      status: 'rascunho',
      createdAt: now,
      updatedAt: now,
    };

    const next: DataState = {
      ...current,
      quotes: [quote, ...current.quotes],
      counters: {
        ...current.counters,
        quote: nextCounter,
      },
    };

    await persist(next);
    return quote;
  };

  const updateQuote = async (
    quoteId: string,
    input: UpdateQuoteInput,
  ): Promise<Quote> => {
    const current = stateRef.current;
    const existing = current.quotes.find((entry) => entry.id === quoteId);
    if (!existing) {
      throw new Error('Orcamento nao encontrado.');
    }
    if (existing.status !== 'rascunho') {
      throw new Error('Somente orcamentos em rascunho podem ser editados.');
    }

    const customer = current.customers.find((entry) => entry.id === input.customerId);
    if (!customer) {
      throw new Error('Cliente nao encontrado.');
    }

    const updatedQuote: Quote = {
      ...existing,
      customerId: customer.id,
      customerName: customer.name,
      customerDocument: customer.document,
      customerPhone: customer.phone,
      items: cloneItems(input.items),
      notes: input.notes.trim(),
      paymentCondition: input.paymentCondition.trim(),
      executionDeadline: input.executionDeadline.trim(),
      warranty: input.warranty.trim(),
      discount: input.discount.trim(),
      total: quoteTotal(input.items),
      updatedAt: new Date().toISOString(),
    };

    const next: DataState = {
      ...current,
      quotes: current.quotes.map((entry) => (entry.id === quoteId ? updatedQuote : entry)),
    };

    await persist(next);
    return updatedQuote;
  };

  const deleteQuote = async (quoteId: string): Promise<void> => {
    const current = stateRef.current;
    const quote = current.quotes.find((entry) => entry.id === quoteId);
    if (!quote) {
      throw new Error('Orcamento nao encontrado.');
    }
    if (quote.status !== 'rejeitado') {
      throw new Error('Apenas orcamentos rejeitados podem ser excluidos.');
    }

    const next: DataState = {
      ...current,
      quotes: current.quotes.filter((entry) => entry.id !== quoteId),
    };

    await persist(next);
  };

  const setQuoteStatus = async (quoteId: string, status: QuoteStatus): Promise<void> => {
    const current = stateRef.current;
    const nextQuotes = current.quotes.map((quote) =>
      quote.id === quoteId
        ? {
            ...quote,
            status,
            updatedAt: new Date().toISOString(),
          }
        : quote,
    );

    const next: DataState = {
      ...current,
      quotes: nextQuotes,
    };

    await persist(next);
  };

  const convertQuoteToOrder = async (quoteId: string): Promise<ServiceOrder> => {
    const current = stateRef.current;
    const quote = current.quotes.find((entry) => entry.id === quoteId);
    if (!quote) {
      throw new Error('Orcamento nao encontrado.');
    }
    if (quote.status !== 'aprovado') {
      throw new Error('Apenas orcamentos aprovados podem virar OS.');
    }

    const nextOrderCounter = current.counters.order + 1;
    const order: ServiceOrder = {
      id: `os-${nextOrderCounter}`,
      number: formatCode('OS', nextOrderCounter),
      quoteId: quote.id,
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerDocument: quote.customerDocument,
      customerPhone: quote.customerPhone,
      items: cloneItems(quote.items),
      notes: quote.notes,
      paymentCondition: quote.paymentCondition,
      executionDeadline: quote.executionDeadline,
      warranty: quote.warranty,
      discount: quote.discount,
      total: quote.total,
      status: 'aberta',
      createdAt: new Date().toISOString(),
    };

    const next: DataState = {
      ...current,
      orders: [order, ...current.orders],
      quotes: current.quotes.map((entry) =>
        entry.id === quote.id
          ? {
              ...entry,
              status: 'convertido',
              updatedAt: new Date().toISOString(),
            }
          : entry,
      ),
      counters: {
        ...current.counters,
        order: nextOrderCounter,
      },
    };

    await persist(next);
    return order;
  };

  const createOrder = async (input: CreateOrderInput): Promise<ServiceOrder> => {
    const current = stateRef.current;
    const customer = current.customers.find((entry) => entry.id === input.customerId);
    if (!customer) {
      throw new Error('Cliente nao encontrado.');
    }

    const nextOrderCounter = current.counters.order + 1;
    const order: ServiceOrder = {
      id: `os-${nextOrderCounter}`,
      number: formatCode('OS', nextOrderCounter),
      customerId: customer.id,
      customerName: customer.name,
      customerDocument: customer.document,
      customerPhone: customer.phone,
      items: cloneItems(input.items),
      notes: input.notes.trim(),
      paymentCondition: input.paymentCondition.trim(),
      executionDeadline: input.executionDeadline.trim(),
      warranty: input.warranty.trim(),
      discount: input.discount.trim(),
      total: quoteTotal(input.items),
      status: 'aberta',
      createdAt: new Date().toISOString(),
    };

    const next: DataState = {
      ...current,
      orders: [order, ...current.orders],
      counters: {
        ...current.counters,
        order: nextOrderCounter,
      },
    };

    await persist(next);
    return order;
  };

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
      state,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addCatalogItem,
      updateCatalogItem,
      deleteCatalogItem,
      createQuote,
      updateQuote,
      deleteQuote,
      setQuoteStatus,
      convertQuoteToOrder,
      createOrder,
    }),
    [loading, state],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de DataProvider.');
  }
  return context;
}
