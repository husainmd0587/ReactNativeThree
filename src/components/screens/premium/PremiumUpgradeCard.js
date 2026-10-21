import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAvailablePurchases,
  getUserFriendlyErrorMessage,
  isUserCancelledError,
  useIAP,
  withIAPContext,
} from 'react-native-iap';
import {ACCESS_TOKEN_STORAGE_KEY, PREMIUM_PRODUCT_ID} from './iapConfig';
import verifyGooglePurchase from './verifyGooglePurchase';

/**
 * "Lifetime Premium" upgrade card shown on the account/profile screen.
 *
 * Flow (react-native-iap v13):
 *  1. withIAPContext opens the Play Billing connection on mount.
 *  2. getProducts loads the localized price for engineering_premium.
 *  3. requestPurchase launches the Play purchase sheet (Android: skus[]).
 *  4. onPurchaseSuccess receives the Purchase — we send its purchaseToken
 *     to our backend for server-side verification FIRST.
 *  5. Only after the backend confirms premium.active do we call
 *     finishTransaction (acknowledge the non-consumable to Play) and ask
 *     the parent to refresh /auth/me. If verification fails, the
 *     transaction is deliberately left unfinished so Google redelivers
 *     it on the next launch and nothing the user paid for is lost.
 *  6. Restore uses getAvailablePurchases() and the same verify path.
 */
const PremiumUpgradeCardInner = ({active = false, onPremiumActivated}) => {
  const [busy, setBusy] = useState(null); // 'buy' | 'restore' | 'verify' | null
  const [status, setStatus] = useState('');
  const processingRef = useRef(false);

  // Latest hook callbacks, kept in refs so memoized handlers never close
  // over stale versions (the hook identity changes on every render).
  const finishTransactionRef = useRef(null);
  const clearCurrentPurchaseRef = useRef(null);
  const clearCurrentPurchaseErrorRef = useRef(null);

  const handlePurchaseSuccess = useCallback(
    async purchase => {
      if (processingRef.current) {
        return;
      }
      if (!purchase || purchase.productId !== PREMIUM_PRODUCT_ID) {
        return;
      }
      processingRef.current = true;
      setBusy('verify');
      try {
        setStatus('Verifying purchase with server…');
        const result = await verifyGooglePurchase(purchase);
        if (result.ok) {
          // Backend confirmed the entitlement — now acknowledge to Play
          // so the transaction is closed (non-consumable).
          await finishTransactionRef.current({
            purchase,
            isConsumable: false,
          });
          setStatus('✓ Premium activated');
          if (onPremiumActivated) {
            onPremiumActivated();
          }
        } else {
          // Keep the transaction unacknowledged on failure: Play will
          // redeliver it, and the user can Restore (or relaunch) later.
          setStatus(result.message || 'Verification failed.');
          Alert.alert(
            'Verification pending',
            result.message ||
              'Your purchase could not be verified with the server yet. It has not been lost — use "Restore purchase" once the server is reachable.',
          );
        }
      } catch (err) {
        setStatus(err?.message || 'Verification failed.');
      } finally {
        processingRef.current = false;
        setBusy(null);
        clearCurrentPurchaseRef.current();
      }
    },
    [onPremiumActivated],
  );

  const handlePurchaseError = useCallback(error => {
    if (isUserCancelledError(error)) {
      setStatus('Purchase cancelled.');
    } else {
      setStatus(getUserFriendlyErrorMessage(error));
    }
    clearCurrentPurchaseErrorRef.current();
  }, []);

  const {
    connected,
    products,
    initConnectionError,
    clearCurrentPurchase,
    clearCurrentPurchaseError,
    finishTransaction,
    getProducts,
    requestPurchase,
  } = useIAP({
    onPurchaseSuccess: handlePurchaseSuccess,
    onPurchaseError: handlePurchaseError,
  });

  useEffect(() => {
    finishTransactionRef.current = finishTransaction;
    clearCurrentPurchaseRef.current = clearCurrentPurchase;
    clearCurrentPurchaseErrorRef.current = clearCurrentPurchaseError;
  }, [finishTransaction, clearCurrentPurchase, clearCurrentPurchaseError]);

  useEffect(() => {
    if (connected) {
      getProducts({skus: [PREMIUM_PRODUCT_ID]});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const product = products.find(p => p.productId === PREMIUM_PRODUCT_ID);
  const priceLabel = product?.localizedPrice || '₹299';

  // Shared "verify an owned purchase then activate" path for restore.
  const verifyAndActivate = useCallback(
    async purchase => {
      setStatus('Verifying purchase with server…');
      const result = await verifyGooglePurchase(purchase);
      if (result.ok) {
        await finishTransactionRef.current({
          purchase,
          isConsumable: false,
        });
        setStatus('✓ Premium activated');
        if (onPremiumActivated) {
          onPremiumActivated();
        }
        return true;
      }
      setStatus(result.message || 'Verification failed.');
      Alert.alert('Verification failed', result.message || 'Unknown error.');
      return false;
    },
    [onPremiumActivated],
  );

  const requireSignIn = useCallback(async () => {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (!token) {
      Alert.alert(
        'Sign in required',
        'Please sign in (Google or phone) first so Premium can be attached to your account.',
      );
      return false;
    }
    return true;
  }, []);

  const handleBuy = useCallback(async () => {
    if (!connected) {
      setStatus('Google Play is not connected.');
      return;
    }
    if (!(await requireSignIn())) {
      return;
    }
    setBusy('buy');
    setStatus('');
    try {
      // react-native-iap v13: Android takes {skus: [...]}, iOS {sku: ...}.
      const request =
        Platform.OS === 'android'
          ? {skus: [PREMIUM_PRODUCT_ID]}
          : {sku: PREMIUM_PRODUCT_ID};
      await requestPurchase(request);
    } catch (err) {
      if (isUserCancelledError(err)) {
        setStatus('Purchase cancelled.');
      } else {
        setStatus(getUserFriendlyErrorMessage(err));
      }
    } finally {
      setBusy(null);
    }
  }, [connected, requestPurchase, requireSignIn]);

  const handleRestore = useCallback(async () => {
    if (!connected) {
      setStatus('Google Play is not connected.');
      return;
    }
    if (!(await requireSignIn())) {
      return;
    }
    setBusy('restore');
    setStatus('');
    try {
      // Direct call (not the hook wrapper) so we get the purchases array
      // back instead of only updating context state.
      const purchases = await getAvailablePurchases();
      const owned = (purchases || []).find(
        p => p.productId === PREMIUM_PRODUCT_ID,
      );
      if (!owned) {
        setStatus('No previous purchase found for this Google account.');
        Alert.alert(
          'Nothing to restore',
          'No previous purchase of Lifetime Premium was found for this Google account.',
        );
        return;
      }
      await verifyAndActivate(owned);
    } catch (err) {
      setStatus(getUserFriendlyErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }, [connected, requireSignIn, verifyAndActivate]);

  // ── Already premium: just confirm state ──────────────────────
  if (active) {
    return (
      <View style={styles.card}>
        <View style={styles.activeBox}>
          <Text style={styles.activeText}>✓ Lifetime Premium active</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Lifetime Premium</Text>
      <Text style={styles.desc}>
        One-time purchase. Unlock every engineering tool and simulation — no
        recurring fees.
      </Text>
      <Text style={styles.price}>{priceLabel}</Text>

      <TouchableOpacity
        style={[styles.buyButton, (busy || !product) && styles.disabled]}
        onPress={handleBuy}
        disabled={!!busy || !product}
        activeOpacity={0.8}>
        {busy === 'buy' || busy === 'verify' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buyButtonText}>
            {product ? `Upgrade — ${priceLabel}` : 'Loading price…'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.restoreButton, busy && styles.disabled]}
        onPress={handleRestore}
        disabled={!!busy}
        activeOpacity={0.8}>
        {busy === 'restore' ? (
          <ActivityIndicator color="#4285F4" />
        ) : (
          <Text style={styles.restoreButtonText}>Restore purchase</Text>
        )}
      </TouchableOpacity>

      {status ? <Text style={styles.status}>{status}</Text> : null}
      {initConnectionError ? (
        <Text style={styles.warn}>
          Google Play connection failed — purchases unavailable right now.
        </Text>
      ) : null}
      {!connected && !initConnectionError ? (
        <Text style={styles.warn}>Connecting to Google Play…</Text>
      ) : null}
    </View>
  );
};

const PremiumUpgradeCard = withIAPContext(PremiumUpgradeCardInner);

export default PremiumUpgradeCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F4F7FE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2F5',
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2B4A',
    marginBottom: 4,
  },
  desc: {
    fontSize: 13,
    color: '#4A5A78',
    lineHeight: 19,
    marginBottom: 8,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4285F4',
    marginBottom: 12,
  },
  buyButton: {
    backgroundColor: '#4285F4',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  restoreButton: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  restoreButtonText: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
  status: {
    marginTop: 10,
    fontSize: 13,
    color: '#4A5A78',
    textAlign: 'center',
  },
  warn: {
    marginTop: 8,
    fontSize: 12,
    color: '#B06800',
    textAlign: 'center',
  },
  activeBox: {
    backgroundColor: '#E6F4EA',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeText: {
    color: '#1E7E34',
    fontSize: 14,
    fontWeight: '700',
  },
});
