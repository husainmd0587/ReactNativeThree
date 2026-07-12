// PDF/PDF.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';


const PDF = ({navigation, url, title,index }) => {
  return (
    <TouchableOpacity style={styles.pdf} 
    onPress={() => navigation.navigate("PdfViewer", { pdfUrl: url, title })}>
      <Text style={styles.pdfIcon}>📕</Text>
      <View style={styles.pdfContent}>
        <Text style={styles.pdfTitle}>{title}</Text>
        <Text style={styles.pdfSub}>Open PDF</Text>
      </View>
       <Text style={styles.actionIcon}>➜</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pdf: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 5,
    elevation: 1,
    paddingHorizontal: 12,
    paddingVertical:5,
    borderBottomWidth:1,
    marginVertical:5,
    borderWidth:1,
    borderColor:'#ccc'
  },
  pdfIcon: {
    fontSize: 18,
    marginRight: 14,
  },
  pdfContent: { flex: 1 },
  pdfTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  pdfSub: {
    color: '#888',
    marginTop: 3,
    fontSize: 12,
  },
  actionIcon: {
    fontSize: 18,
    color: '#235dfc',
  },
});

export default PDF;