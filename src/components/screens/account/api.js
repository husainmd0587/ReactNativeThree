import axios from 'axios';

// ── Base URL setup ──────────────────────────────────────────────
// localhost does NOT work from a real device or Android emulator.
//   - Android Emulator → 10.0.2.2
//   - iOS Simulator    → localhost (fine as-is)
//   - Physical device  → your machine's LAN IP, e.g. 192.168.1.5
// Swap BASE_URL below (or wire up an env var / react-native-config) as needed.

const BASE_URL = 'https://www.techt.site/api/content';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api