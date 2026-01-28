import { WebView } from 'react-native-webview';
import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const WebviewComp = () => {
  return (
    <><WebView source={{ uri: 'https://reactnative.dev/' }} style={{ flex: 1 }} /></>
  )
}

export default WebviewComp

