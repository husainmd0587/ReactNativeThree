// FirstStack.js
import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import MainStack from './MainStack';
import SplashScreen from './splash';

const FirstStack = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return <MainStack />;
};

export default FirstStack;

const styles = StyleSheet.create({});