import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAvailablePurchases,
  getPurchaseHistory,
  useIAP,
  withIAPContext,
} from 'react-native-iap';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  ANDROID_PACKAGE_NAME,
  API_BASE_URL,
  PREMIUM_PRODUCT_ID,
  VERIFY_GOOGLE_PURCHASE_PATH,
} from './iapConfig';
import verifyGooglePurchase from './verifyGooglePurchase';

/**
 * Diagnostics panel for the premium purchase loop. Non-production helper:
 * it lets you inspect every stage of the flow on a real device without
 * waiting for a real payment each time.
 *
 *  1. Connection  — is Play Billing connected (initConnection)?
 *  2. Product     — does Google Play return premium_lifetime + price?
 *  3. Owned       — what purchases does this Google account already own?
 *  4. Backend     — does POST /billing/google/verify-purchase accept a token?
 *
 * It never grants entitlement by itself; stage 4 still goes through the
 * same backend path the real card uses.
 */
const IapTestPanelInner = ({onPremiumActivated}) => {
  const [lines, setLines] = useState([]);
  const [running, setRunning] = useState(false);
  const logRef = useRef([]);

  const append = useCallback(text => {
    logRef.current = [...logRef.current, text];
    setLines([...logRef.current]);
  }, []);

  const clear = useCallback(() => {
    logRef.current = [];
    setLines([]);
  }, []);

  // Bound every native call so a stalled Play/native response can never
  // leave the panel spinning forever.
  const withTimeout = useCallback((promise, ms, label) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
          ms,
        ),
      ),
    ]);
  }, []);

  const {
    connected,
    products,
    availablePurchases,
    initConnectionError,
    getProducts,
  } = useIAP();

  useEffect(() => {
    if (connected) {
      append(`✓ Play Billing connected`);
      getProducts({skus: [PREMIUM_PRODUCT_ID]});
    }
  }, [connected, getProducts, append]);

  useEffect(() => {
    if (initConnectionError) {
      append(`✗ initConnection failed: ${initConnectionError?.message}`);
    }
  }, [initConnectionError, append]);

  const runChecks = useCallback(async () => {
    setRunning(true);
    clear();
    append(`package: ${ANDROID_PACKAGE_NAME}`);
    append(`product id: ${PREMIUM_PRODUCT_ID}`);
    append(`connected: ${connected ? 'yes' : 'no'}`);

    try {
      // Stage 2 — product
      try {
        const prods = await withTimeout(
          getProducts({skus: [PREMIUM_PRODUCT_ID]}),
          15000,
          'getProducts',
        );
        const list = prods || [];
        if (!list.length) {
          append('✗ getProducts returned no products');
          append('  → is premium_lifetime active in Play Console?');
        } else {
          list.forEach(p => {
            append(`✓ product ${p.productId}`);
            append(`   title: ${p.title || '(none)'}`);
            append(`   price: ${p.localizedPrice || '(none)'}`);
          });
        }
      } catch (err) {
        append(`✗ getProducts: ${err?.message || err}`);
      }

      // Stage 3 — owned purchases
      try {
        const owned =
          (await withTimeout(
            getAvailablePurchases(),
            15000,
            'getAvailablePurchases',
          )) || [];
        if (!owned.length) {
          append('· no owned purchases for this Google account');
        } else {
          owned.forEach(p => {
            append(`✓ owned ${p.productId}`);
            append(`   token: ${String(p.purchaseToken || '').slice(0, 18)}…`);
          });
        }
        const history =
          (await withTimeout(
            getPurchaseHistory(),
            15000,
            'getPurchaseHistory',
          )) || [];
        append(`· purchase history entries: ${history.length}`);
      } catch (err) {
        append(`✗ owned/history: ${err?.message || err}`);
      }

      // Stage 4 — backend reachability + auth
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
      append(`· access token: ${token ? 'present' : 'MISSING (sign in first)'}`);
      const controller = new AbortController();
      const probeTimeout = setTimeout(() => controller.abort(), 20000);
      try {
        const res = await fetch(
          `${API_BASE_URL}${VERIFY_GOOGLE_PURCHASE_PATH}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token || ''}`,
            },
            body: JSON.stringify({
              productId: PREMIUM_PRODUCT_ID,
              purchaseToken: 'diagnostic-probe-token',
              packageName: ANDROID_PACKAGE_NAME,
            }),
          },
        );
        const json = await res.json().catch(() => null);
        append(`· backend probe HTTP ${res.status}`);
        if (json?.code) {
          append(`   code: ${json.code}`);
        }
        if (json?.message) {
          append(`   message: ${String(json.message).slice(0, 90)}`);
        }
        if (res.status === 400) {
          append('✓ backend reached Play and rejected the fake token (correct)');
        }
      } catch (err) {
        append(
          `✗ backend probe: ${
            err?.name === 'AbortError'
              ? 'timed out after 20s (server unreachable from this device?)'
              : err?.message || err
          }`,
        );
      } finally {
        clearTimeout(probeTimeout);
      }

      append('done.');
    } finally {
      setRunning(false);
    }
  }, [connected, getProducts, append, clear, withTimeout]);

  // Verify a real owned purchase end-to-end (backend + acknowledge).
  const verifyOwned = useCallback(async () => {
    setRunning(true);
    try {
      const owned =
        (await withTimeout(
          getAvailablePurchases(),
          15000,
          'getAvailablePurchases',
        )) || [];
      const mine = owned.find(p => p.productId === PREMIUM_PRODUCT_ID);
      if (!mine) {
        append('· no owned premium_lifetime purchase to verify');
        Alert.alert(
          'Nothing to verify',
          'This Google account owns no premium_lifetime purchase yet.',
        );
        return;
      }
      append('→ sending owned purchaseToken to backend…');
      const result = await verifyGooglePurchase(mine);
      append(result.ok ? '✓ backend verified purchase' : `✗ ${result.message}`);
      if (result.ok && onPremiumActivated) {
        onPremiumActivated();
      }
    } catch (err) {
      append(`✗ ${err?.message || err}`);
    } finally {
      setRunning(false);
    }
  }, [append, onPremiumActivated, withTimeout]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>IAP Diagnostics</Text>
      <Text style={styles.desc}>
        Dev-only checks for the purchase loop. Safe to remove before release.
      </Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, running && styles.disabled]}
          onPress={runChecks}
          disabled={running}
          activeOpacity={0.8}>
          {running ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Run checks</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnAlt, running && styles.disabled]}
          onPress={verifyOwned}
          disabled={running}
          activeOpacity={0.8}>
          <Text style={styles.btnAltText}>Verify owned</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusDot}>
          {connected ? '● connected' : '○ not connected'}
        </Text>
        <Text style={styles.statusDot}>
          products: {products.length} | owned: {availablePurchases.length}
        </Text>
      </View>

      <ScrollView style={styles.logBox} nestedScrollEnabled>
        <Text style={styles.logText}>
          {lines.length ? lines.join('\n') : 'No output yet — tap "Run checks".'}
        </Text>
      </ScrollView>
    </View>
  );
};

const IapTestPanel = withIAPContext(IapTestPanelInner);

export default IapTestPanel;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7DD3FC',
    marginBottom: 2,
  },
  desc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnAlt: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  btnAltText: {
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusDot: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  logBox: {
    maxHeight: 220,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 10,
  },
  logText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
