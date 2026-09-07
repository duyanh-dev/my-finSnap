import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Currency {
  label: string;
  code: string;
  symbol: string;
  rate: number; 
}

export const CURRENCIES: Currency[] = [
  { label: 'Việt Nam Đồng', code: 'VNĐ', symbol: 'đ', rate: 1 },
  { label: 'Đô la Úc', code: 'AUD', symbol: '$', rate: 16500 },
  { label: 'Đô la Mỹ', code: 'USD', symbol: '$', rate: 25500 },
  { label: 'Euro', code: 'EUR', symbol: '€', rate: 27500 },
];

const STORAGE_KEY = '@user_currency_config';
const RATES_KEY = '@exchange_rates';

export const updateExchangeRates = async () => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/VND');
    const data = await response.json();

    if (data && data.rates) {
      const newRates: { [key: string]: number } = {};
      
      CURRENCIES.forEach(curr => {
        if (curr.code === 'VNĐ') {
          newRates[curr.code] = 1;
        } else {
          const rateToVnd = 1 / data.rates[curr.code];
          newRates[curr.code] = rateToVnd;
        }
      });

      await AsyncStorage.setItem(RATES_KEY, JSON.stringify(newRates));
      return { success: true, rates: newRates };
    }
  } catch (e) {
    console.error("Lỗi cập nhật tỷ giá:", e);
    return { success: false };
  }
};

export const getLatestCurrencies = async (): Promise<Currency[]> => {
  try {
    const savedRates = await AsyncStorage.getItem(RATES_KEY);
    if (!savedRates) return CURRENCIES;

    const rates = JSON.parse(savedRates);
    return CURRENCIES.map(curr => ({
      ...curr,
      rate: rates[curr.code] || curr.rate
    }));
  } catch (e) {
    return CURRENCIES;
  }
};

export const convertCurrency = (amount: number, fromCode: string, toCode: string, currentRates?: Currency[]) => {
  // Nếu có truyền list rates mới nhất thì dùng, ko thì dùng list mặc định
  const list = currentRates || CURRENCIES;
  const fromCurrency = list.find(c => c.code === fromCode) || list[0];
  const toCurrency = list.find(c => c.code === toCode) || list[0];

  if (fromCode === toCode) return amount;
  return (amount * fromCurrency.rate) / toCurrency.rate;
};

export const saveCurrencyConfig = async (currencyCode: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, currencyCode);
  } catch (e) {
    console.error("Lỗi lưu đơn vị:", e);
  }
};

export const getCurrencyConfig = async (): Promise<Currency> => {
  try {
    const code = await AsyncStorage.getItem(STORAGE_KEY);
    const latestList = await getLatestCurrencies();
    return latestList.find(c => c.code === code) || latestList[0];
  } catch (e) {
    const latestList = await getLatestCurrencies();
    return latestList[0];
  }
};