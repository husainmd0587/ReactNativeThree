import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import api from './api';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import {
  getIdToken,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
} from '@react-native-firebase/auth';

const WEB_CLIENT_ID = '815584273699-3dc3i5qkquh0cpfi4nno14odgt6aptuf.apps.googleusercontent.com';

// ── Backend config ─────────────────────────────────────────
// TODO: point this at your actual Express server.
//   Android emulator -> host machine's localhost is 10.0.2.2
//   iOS simulator     -> localhost works directly
//   Physical device   -> use your machine's LAN IP (e.g. http://192.168.1.20:5000/...)
const API_BASE_URL = 'https://www.techt.site/api/content';  //change for api 

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@threeapp/accessToken',
  REFRESH_TOKEN: '@threeapp/refreshToken',
  DEVICE_ID: '@threeapp/deviceId',
};

// Trim/extend as needed.
const COUNTRY_CODES = [
  { code: 'IN', dial: '+91', name: 'India' },
  { code: 'US', dial: '+1', name: 'United States' },
  { code: 'GB', dial: '+44', name: 'United Kingdom' },
  { code: 'AE', dial: '+971', name: 'UAE' },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia' },
  { code: 'AU', dial: '+61', name: 'Australia' },
  { code: 'CA', dial: '+1', name: 'Canada' },
  { code: 'SG', dial: '+65', name: 'Singapore' },
  { code: 'DE', dial: '+49', name: 'Germany' },
  { code: 'FR', dial: '+33', name: 'France' },
  { code: 'PK', dial: '+92', name: 'Pakistan' },
  { code: 'BD', dial: '+880', name: 'Bangladesh' },
  { code: 'NP', dial: '+977', name: 'Nepal' },
];

// ── Small local helpers ─────────────────────────────────────

// Stable per-install device id, persisted so refresh-token rotation can
// keep tagging sessions from "this device" consistently across app runs.
// Not cryptographically strong — it's just an identifier, not a secret.
const getOrCreateDeviceId = async () => {
  const existing = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (existing) return existing;

  const generated = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, generated);
  return generated;
};

const saveTokens = async (accessToken, refreshToken) => {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
    [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
  ]);
};

const clearTokens = async () => {
  await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);
};

const AuthScreen = () => {
  const firebaseAuth = getAuth();

  const [mode, setMode] = useState('google'); // 'google' | 'phone'
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  // Backend sync state — separate from Firebase's own user/error so a
  // successful Firebase login and a failed backend sync can be shown
  // distinctly instead of looking like the whole login failed.
  const [backendUser, setBackendUser] = useState(null);
  const [backendError, setBackendError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);

  // Phone auth state
  const [country, setCountry] = useState(COUNTRY_CODES[0]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmResult, setConfirmResult] = useState(null); // FirebaseAuthTypes.ConfirmationResult
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });

    const currentUser = firebaseAuth.currentUser;
    if (currentUser) setUser(currentUser);

    // On app start, if we have a previously-saved access token, confirm
    // it's still valid via /auth/me instead of silently trusting it —
    // this is what actually "restores" a session across app restarts.
    restoreSession();
  }, [firebaseAuth]);

  useEffect(() => {
    if (resendTimer <= 0) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [resendTimer]);

  const resetPhoneFlow = () => {
    setPhoneNumber('');
    setOtp('');
    setConfirmResult(null);
    setResendTimer(0);
  };

  /* =========================================================
     BACKEND SYNC (the missing half of the loop)
  ========================================================= */

  // Restores a previously-saved session on app launch by asking the
  // backend to confirm the stored access token still works.
  const restoreSession = async () => {
    try {
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!accessToken) return;

      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setBackendUser(json.data);
      } else {
        // Token expired/invalid — clean up rather than keep a dead session.
        await clearTokens();
      }
    } catch (err) {
      console.log('❌ Session restore error:', err?.message);
    } finally {
      setRestoringSession(false);
    }
  };

  // Takes a signed-in Firebase user, exchanges its ID token for our own
const syncWithBackend = async (firebaseUser) => {
  try {
    setSyncing(true);
    setBackendError('');

    const idToken = await getIdToken(firebaseUser);

    if (!idToken) {
      throw new Error('Firebase ID token was not received');
    }

    const deviceId = await getOrCreateDeviceId();

    const res = await fetch(`${API_BASE_URL}/auth/firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken,
        deviceId,
        deviceName: Platform.OS === 'ios'
          ? 'iPhone'
          : 'Android device',
        platform: Platform.OS,
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(
        json.message || 'Backend sync failed'
      );
    }

    await saveTokens(
      json.data.accessToken,
      json.data.refreshToken
    );

    setBackendUser(json.data.user);

  } catch (err) {
    console.log(
      '❌ Backend sync error:',
      err?.message
    );

    setBackendError(
      err?.message ||
      'Could not reach the backend'
    );
  } finally {
    setSyncing(false);
  }
};

  // Manual re-check button — proves the access token Postman/your team
  // is testing against is the exact same one this screen is holding.
  const verifyWithBackend = async () => {
    try {
      setSyncing(true);
      setBackendError('');

      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!accessToken) throw new Error('No stored access token to verify');

      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Verification failed');
      }
      setBackendUser(json.data);
    } catch (err) {
      console.log('❌ Verify error:', err?.message);
      setBackendError(err?.message || 'Verification failed');
    } finally {
      setSyncing(false);
    }
  };

  const logoutFromBackend = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (err) {
      // Non-fatal — we still sign the user out locally either way.
      console.log('❌ Backend logout error:', err?.message);
    } finally {
      await clearTokens();
      setBackendUser(null);
      setBackendError('');
    }
  };

  /* =========================================================
     GOOGLE AUTH
  ========================================================= */
const signInWithGoogle = async () => {
  try {
    setLoading(true);
    setError('');
    setBackendError('');

    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    // 1. Google login
    const result = await GoogleSignin.signIn();

    const googleIdToken = result.data?.idToken;

    if (!googleIdToken) {
      throw new Error('No Google ID token returned');
    }

    // 2. Google → Firebase credential
    const credential = GoogleAuthProvider.credential(googleIdToken);

    // 3. Firebase login
    const userCredential = await signInWithCredential(
      firebaseAuth,
      credential
    );

    const firebaseUser = userCredential.user;

    console.log('✅ Firebase login successful');
    console.log('Firebase UID:', firebaseUser.uid);

    // 4. Firebase → YOUR backend
    await syncWithBackend(firebaseUser);

    // 5. Local Firebase user
    setUser(firebaseUser);

  } catch (err) {
    console.log('❌ Google Login Error:', {
      code: err?.code,
      message: err?.message,
    });

    setError(
      err?.message ||
      err?.code ||
      'Google Sign-In failed'
    );
  } finally {
    setLoading(false);
  }
};

  /* =========================================================
     PHONE AUTH
  ========================================================= */
  const fullPhoneNumber = `${country.dial}${phoneNumber.trim()}`;

  const isPhoneValid = phoneNumber.trim().length >= 6;
  const isOtpValid = otp.trim().length >= 4;

  const sendOtp = async () => {
    if (!isPhoneValid) {
      setError('Enter a valid phone number');
      return;
    }
    try {
      setLoading(true);
      setError('');

      const confirmation = await signInWithPhoneNumber(firebaseAuth, fullPhoneNumber);
      setConfirmResult(confirmation);
      setResendTimer(30);
    } catch (err) {
      console.log('❌ Phone Sign-In Error:', { code: err?.code, message: err?.message });
      setError(err?.message || err?.code || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!confirmResult || !isOtpValid) {
      setError('Enter the OTP you received');
      return;
    }
    try {
      setLoading(true);
      setError('');

      const userCredential = await confirmResult.confirm(otp.trim());
      setUser(userCredential.user);
      resetPhoneFlow();

      // Complete the loop here too — same backend endpoint handles both.
      await syncWithBackend(userCredential.user);
    } catch (err) {
      console.log('❌ OTP Verify Error:', { code: err?.code, message: err?.message });
      setError(err?.message || err?.code || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     SIGN OUT
  ========================================================= */
  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError('');

      try {
        await GoogleSignin.signOut();
      } catch (_) {
        // ignore — user may not have signed in via Google
      }
      await firebaseSignOut(firebaseAuth);
      await logoutFromBackend();

      setUser(null);
      resetPhoneFlow();
    } catch (err) {
      console.log('❌ Sign out error:', { code: err?.code, message: err?.message });
      setError(err?.message || err?.code || 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  if (restoringSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#4285F4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Firebase Authentication</Text>

        {!user ? (
          <>
            {/* Mode switch */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, mode === 'google' && styles.tabActive]}
                onPress={() => {
                  setMode('google');
                  setError('');
                }}
              >
                <Text style={[styles.tabText, mode === 'google' && styles.tabTextActive]}>
                  Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, mode === 'phone' && styles.tabActive]}
                onPress={() => {
                  setMode('phone');
                  setError('');
                }}
              >
                <Text style={[styles.tabText, mode === 'phone' && styles.tabTextActive]}>
                  Phone
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'google' && (
              <TouchableOpacity
                style={styles.googleButton}
                onPress={signInWithGoogle}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Continue with Google</Text>
                )}
              </TouchableOpacity>
            )}

            {mode === 'phone' && (
              <View>
                {!confirmResult ? (
                  <>
                    <Text style={styles.label}>Phone number</Text>
                    <View style={styles.phoneRow}>
                      <TouchableOpacity
                        style={styles.countryPicker}
                        onPress={() => setPickerVisible(true)}
                      >
                        <Text style={styles.countryPickerText}>
                          {country.code} {country.dial}
                        </Text>
                      </TouchableOpacity>

                      <TextInput
                        style={styles.phoneInput}
                        placeholder="98765 43210"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        maxLength={15}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.googleButton, styles.phoneButton, !isPhoneValid && styles.buttonDisabled]}
                      onPress={sendOtp}
                      disabled={loading || !isPhoneValid}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Send OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Enter OTP sent to {fullPhoneNumber}</Text>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="• • • • • •"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={setOtp}
                      maxLength={6}
                    />

                    <TouchableOpacity
                      style={[styles.googleButton, styles.phoneButton, !isOtpValid && styles.buttonDisabled]}
                      onPress={verifyOtp}
                      disabled={loading || !isOtpValid}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Verify & Sign In</Text>
                      )}
                    </TouchableOpacity>

                    <View style={styles.otpActionsRow}>
                      <TouchableOpacity
                        onPress={resendTimer === 0 ? sendOtp : undefined}
                        disabled={resendTimer > 0 || loading}
                      >
                        <Text style={[styles.linkText, resendTimer > 0 && styles.linkTextDisabled]}>
                          {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={resetPhoneFlow} disabled={loading}>
                        <Text style={styles.linkText}>Change number</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Error</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.userCard}>
            <Text style={styles.success}>✓ Signed In</Text>

            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{user.displayName || 'Not available'}</Text>

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email || 'Not available'}</Text>

            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{user.phoneNumber || 'Not available'}</Text>

            <Text style={styles.label}>Firebase UID</Text>
            <Text style={styles.uid} selectable>
              {user.uid}
            </Text>

            <Text style={styles.label}>Provider</Text>
            <Text style={styles.value}>
              {user.providerData?.[0]?.providerId || 'unknown'}
            </Text>

            {/* ── Backend sync status ───────────────────────── */}
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Backend session</Text>

            {syncing ? (
              <View style={styles.backendRow}>
                <ActivityIndicator size="small" color="#4285F4" />
                <Text style={styles.backendSyncingText}>Syncing with server...</Text>
              </View>
            ) : backendUser ? (
              <>
                <Text style={styles.label}>Backend User ID</Text>
                <Text style={styles.uid} selectable>
                  {backendUser.id}
                </Text>

                <Text style={styles.label}>Premium</Text>
                <Text style={styles.value}>
                  {backendUser.premium?.active ? 'Active' : 'Not active'}
                </Text>

                <View style={styles.backendOkBox}>
                  <Text style={styles.backendOkText}>✓ Backend session confirmed</Text>
                </View>
              </>
            ) : (
              <Text style={styles.value}>Not synced yet</Text>
            )}

            {backendError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Backend Error</Text>
                <Text style={styles.errorText}>{backendError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={verifyWithBackend}
              disabled={syncing}
              activeOpacity={0.8}
            >
              <Text style={styles.verifyButtonText}>Verify /auth/me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Out</Text>
              )}
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Error</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Country code picker modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select country</Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryRow}
                  onPress={() => {
                    setCountry(item);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={styles.countryRowText}>{item.name}</Text>
                  <Text style={styles.countryRowDial}>{item.dial}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setPickerVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AuthScreen;

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#111' },
  subtitle: { fontSize: 13, color: '#777', textAlign: 'center', marginTop: 4, marginBottom: 22 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#eceef1',
    borderRadius: 10,
    padding: 3,
    marginBottom: 18,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', elevation: 1 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#777' },
  tabTextActive: { color: '#111' },

  googleButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  phoneButton: { backgroundColor: '#111' },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  label: { fontSize: 12, color: '#888', marginBottom: 6, marginTop: 4 },

  phoneRow: { flexDirection: 'row', marginBottom: 14 },
  countryPicker: {
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e4e8',
    justifyContent: 'center',
    marginRight: 8,
  },
  countryPickerText: { fontSize: 14, fontWeight: '600', color: '#222' },
  phoneInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e4e8',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111',
  },

  otpInput: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e4e8',
    paddingHorizontal: 14,
    fontSize: 18,
    letterSpacing: 4,
    color: '#111',
    marginBottom: 14,
  },

  otpActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  linkText: { fontSize: 12, fontWeight: '600', color: '#4285F4' },
  linkTextDisabled: { color: '#aaa' },

  errorBox: {
    marginTop: 16,
    padding: 13,
    borderRadius: 10,
    backgroundColor: '#ffe8e8',
    borderWidth: 1,
    borderColor: '#ffcaca',
  },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#c62828', marginBottom: 4 },
  errorText: { fontSize: 12, color: '#b71c1c', lineHeight: 17 },

  userCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    elevation: 3,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  success: { fontSize: 17, fontWeight: '700', color: '#188038', marginBottom: 16 },
  value: { fontSize: 15, color: '#222', marginTop: 2 },
  uid: { fontSize: 11, color: '#444', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  backendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backendSyncingText: { fontSize: 13, color: '#555', marginLeft: 8 },
  backendOkBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#e6f4ea',
    borderWidth: 1,
    borderColor: '#b7e1c4',
  },
  backendOkText: { fontSize: 12, fontWeight: '600', color: '#188038' },

  verifyButton: {
    height: 42,
    borderRadius: 10,
    backgroundColor: '#eceef1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  verifyButtonText: { color: '#333', fontSize: 13, fontWeight: '600' },

  signOutButton: {
    height: 46,
    borderRadius: 10,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '65%',
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },
  countryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  countryRowText: { fontSize: 14, color: '#222' },
  countryRowDial: { fontSize: 14, color: '#777', fontWeight: '600' },
  modalClose: { alignItems: 'center', paddingVertical: 14 },
  modalCloseText: { fontSize: 14, fontWeight: '600', color: '#4285F4' },
});