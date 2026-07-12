// Banner/Banner.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Banner = ({ text }) => {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#d3fad7',
    borderRadius: 5,
    padding:5,
    marginBottom: 12,
    borderWidth:1,
    borderColor:"#ccc"
  },
  bannerText: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default Banner;