import React, { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';

const ORANGE = '#F5A623';
const BG = '#0A0A0A';
const SURFACE = '#141414';
const BORDER = '#242424';
const TEXT_PRIMARY = '#F0EDE8';
const TEXT_MUTED = '#6B6B6B';

const PdfViewer = ({
  navigation,
  route,
  pdfUrl: propPdfUrl,
  title: propTitle,
  footerText: propFooterText = 'PDF · READ ONLY',
  showHeader = true,
  showFooter = false,
  fitPolicy = 0,
}) => {
  const insets = useSafeAreaInsets();
  const routeParams = route?.params || {};
  const pdfUrl = propPdfUrl || routeParams.pdfUrl || routeParams.url || routeParams.uri;
  const title = routeParams.title || propTitle || 'Document';
  const footerText = routeParams.footerText || propFooterText;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);
  const [pageNumber, setPageNumber] = useState({ current: 1, total: null });
  const [inputValue, setInputValue] = useState('1'); // ← controlled input state
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pdfRef = useRef(null);
  const isTypingRef = useRef(false); // ← flag to prevent scroll→input fighting

  const onLoad = () => {
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const onError = () => {
    setLoading(false);
    setError(true);
  };

  const retry = () => {
    setError(false);
    setLoading(true);
    fadeAnim.setValue(0);
    setKey((prev) => prev + 1);
  };

  // ── real-time page jump + scroll sync ───────
  const handlePageInput = useCallback((text) => {
    setInputValue(text);
    isTypingRef.current = true;

    const n = parseInt(text, 10);
    if (n && n >= 1 && pdfRef.current) {
      pdfRef.current.setPage(n);
    }
  }, []);

  const onPageChanged = useCallback((page, total) => {
    setPageNumber({ current: page, total });

    // Only update input if user is NOT actively typing
    if (!isTypingRef.current) {
      setInputValue(String(page));
    }
  }, []);

  const onInputFocus = () => {
    isTypingRef.current = true;
  };

  const onInputBlur = () => {
    isTypingRef.current = false;
    // Snap input to actual current page on blur
    setInputValue(String(pageNumber.current));
  };
  // ────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {showHeader && (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation?.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>

            <View style={styles.pageBox}>
              <TextInput
                style={styles.pageInput}
                value={inputValue}           // ← controlled
                keyboardType="number-pad"
                selectTextOnFocus
                maxLength={4}
                onChangeText={handlePageInput}
                onFocus={onInputFocus}       // ← track typing state
                onBlur={onInputBlur}         // ← reset + sync on blur
              />
              <Text style={styles.pageSlash}>/</Text>
              <Text style={styles.pageTotal}>{pageNumber.total ?? '—'}</Text>
            </View>

            <View style={styles.accentDot} />
          </View>

          <View style={styles.divider} />
        </>
      )}

      <View style={styles.viewerContainer}>
        {loading && !error && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={ORANGE} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorTitle}>Failed to load PDF</Text>
            <Text style={styles.errorSub}>
              Check your connection and try again.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={retry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
            <Pdf
              key={key}
              ref={pdfRef}
              source={{ uri: pdfUrl, cache: true }}
              style={StyleSheet.absoluteFill}
              fitPolicy={fitPolicy}
              trustAllCerts={false}
              onLoadComplete={onLoad}
              onError={onError}
              fitWidth={true}
              onPageChanged={onPageChanged}
            />
          </Animated.View>
        )}
      </View>

      {showFooter && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 6 }]}>
          <View style={styles.footerPill}>
            <Text style={styles.footerText}>{footerText}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default PdfViewer;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backArrow: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    lineHeight: 20,
  },

  titleText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  pageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  pageInput: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
    padding: 0,
    includeFontPadding: false,
    backgroundColor: '#a5a4a4',
    color: '#000',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },

  pageSlash: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '600',
  },

  pageTotal: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
  },

  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ORANGE,
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
  },

  viewerContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  loadingText: {
    color: TEXT_MUTED,
    fontSize: 13,
    letterSpacing: 0.4,
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },

  errorIcon: {
    fontSize: 36,
    color: ORANGE,
    marginBottom: 4,
  },

  errorTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },

  errorSub: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: 'center',
  },

  retryBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: ORANGE,
    borderRadius: 6,
  },

  retryText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  footer: {
    alignItems: 'center',
    paddingTop: 6,
  },

  footerPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },

  footerText: {
    color: TEXT_MUTED,
    fontSize: 10,
    letterSpacing: 1.2,
  },
});