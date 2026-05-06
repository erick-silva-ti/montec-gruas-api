export const AppTheme = {
  yellow: '#C99A00',
  yellowDark: '#9A7300',
  charcoal: '#41434A',
  black: '#111111',
  line: '#D8D8D8',
  white: '#FFFFFF',
  background: '#F2F2F2',
};

export const currency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
