// IntroCard/IntroCard.js
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';

const IntroCard = ({ title, text, thumbnail, readMoreItem, pdfUrl, accent, navigation }) => {
  
  return (
    <View style={styles.introCard}>
      <View style={styles.introTop}>
        <View style={styles.introTextContainer}>
          <Text style={styles.introTitle}>{title}</Text>
          <Text style={styles.introText} numberOfLines={5}>{text}</Text>
        </View>
        <Image source={{ uri: thumbnail }} style={styles.introThumb} />
      </View>
      <View style={styles.introButtons}>
        <TouchableOpacity
          style={[styles.introBtn, styles.introBtnFilled, { backgroundColor: accent }]}
          onPress={() => readMoreItem && navigation.navigate("PdfViewer", { pdfUrl, title })}
        >
          <Text style={styles.introBtnFilledText}>📖 Read More</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.introBtn, styles.introBtnOutline, { borderColor: accent }]}
          onPress={() => pdfUrl && Linking.openURL(pdfUrl)}
        >
          <Text style={[styles.introBtnOutlineText, { color: accent }]}>
            ⬇  Download PDF
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    marginHorizontal: 5,
    marginBottom: 16,
    elevation: 2,
  },
  introTop: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  introTextContainer: {
    flex: 1,
    paddingRight: 5,
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  introText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 15,
  },
  introThumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  introButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  introBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  introBtnFilled: {},
  introBtnFilledText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  introBtnOutline: {
    borderWidth: 1.5,
  },
  introBtnOutlineText: {
    fontWeight: '700',
    fontSize: 14,
  },
});

export default IntroCard;