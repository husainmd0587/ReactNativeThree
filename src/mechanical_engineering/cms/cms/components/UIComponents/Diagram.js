import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFont } from '@shopify/react-native-skia';
import Shape2D from './Shape2D';

const Diagram = ({ title = '', width = 320, height = 200, shapes = [] }) => {
  const font = useFont(require('../../../../../assets/fonts/roboto.ttf'), 11);

  return (
    <View style={styles.wrapper}>
      {title ? (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}

      <View style={[styles.canvasWrap, { width, height }]}>
        <Shape2D width={width} height={height} shapes={shapes} font={font} backgroundColor="#FFFFFF" />
      </View>
    </View>
  );
};

export default Diagram;

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D8D8E8',
    alignSelf: 'flex-start',
  },
  titleRow: {
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#C5CAE9',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3949AB',
    letterSpacing: 0.3,
  },
  canvasWrap: {
    backgroundColor: '#FFFFFF',
  },
});