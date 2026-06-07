import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const DescriptionScreen = ({ route }) => {
  const { title, desc } = route.params;

  return (
    <View>
      <Text>{title}</Text>
      <Text>{desc}</Text>
    </View>
  )
}

export default DescriptionScreen

const styles = StyleSheet.create({})