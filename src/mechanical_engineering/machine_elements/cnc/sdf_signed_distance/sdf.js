import React from 'react';
import { StyleSheet, View } from 'react-native';
import  {CNCSimulator} from './components/CNCSimulator';

export default function SDF() {
  return (
    <View style={styles.container}>
      <CNCSimulator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
});