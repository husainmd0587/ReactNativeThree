import AsyncStorage from '@react-native-async-storage/async-storage';

console.log('AsyncStorage =', AsyncStorage);
const storage = {
  set: async (key, value) => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  get: async (key) => {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },

  remove: async (key) => {
    await AsyncStorage.removeItem(key);
  },

  clear: async () => {
    await AsyncStorage.clear();
  },
};


export default  storage;
