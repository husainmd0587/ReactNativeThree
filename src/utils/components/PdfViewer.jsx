import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
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
  pdfUrl,
  title = 'Document',
  navigation,
  footerText = 'PDF · READ ONLY',
  showHeader = true,
  showFooter = true,
  fitPolicy = 0,
}) => {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

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
    setKey(prev => prev + 1);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={BG}
      />

      {showHeader && (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation?.goBack()}
              hitSlop={{
                top: 10,
                bottom: 10,
                left: 10,
                right: 10,
              }}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <Text style={styles.titleText}>
              {title}
            </Text>

            <View style={styles.accentDot} />
          </View>

          <View style={styles.divider} />
        </>
      )}

      <View style={styles.viewerContainer}>
        {loading && !error && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator
              size="large"
              color={ORANGE}
            />
            <Text style={styles.loadingText}>
              Loading...
            </Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>
              ⚠
            </Text>

            <Text style={styles.errorTitle}>
              Failed to load PDF
            </Text>

            <Text style={styles.errorSub}>
              Check your connection and try again.
            </Text>

            <TouchableOpacity
              style={styles.retryBtn}
              onPress={retry}
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: fadeAnim },
            ]}
          >
            <Pdf
              key={key}
              source={{
                uri: pdfUrl,
                cache: true,
              }}
              style={StyleSheet.absoluteFill}
              fitPolicy={fitPolicy}
              trustAllCerts={false}
              onLoadComplete={onLoad}
              onError={onError}
            />
          </Animated.View>
        )}
      </View>

      {showFooter && (
        <View
          style={[
            styles.footer,
            {
              paddingBottom:
                insets.bottom + 6,
            },
          ]}
        >
          <View style={styles.footerPill}>
            <Text style={styles.footerText}>
              {footerText}
            </Text>
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