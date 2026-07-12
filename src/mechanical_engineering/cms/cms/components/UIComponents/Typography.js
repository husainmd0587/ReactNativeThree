// Typography/Heading.js
import React from 'react';
import { Text, StyleSheet } from 'react-native';

export const Heading = ({ text }) => {
  return <Text style={styles.heading}>{text}</Text>;
};
export const Paragraph = ({ text }) => {
  return <Text style={styles.paragraph}>{text}</Text>;
};


const styles = StyleSheet.create({
    heading: {
    fontSize: 20,
    fontFamily:'Oswald-Medium',
    color: '#222',
    paddingHorizontal:5,
    borderRadius:5,
    backgroundColor:"rgba(192, 187, 255, 0.467)"
  },
  paragraph: {
    fontSize: 15,
    // fontFamily:'Oswald-Light',
    lineHeight: 18,
    color: '#555',
    paddingHorizontal:5,
    borderRadius:5,
    backgroundColor:"rgba(19, 255, 2, 0.06)"
  },
});

