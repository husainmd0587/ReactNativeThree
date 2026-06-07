import { StyleSheet, Text, View,ScrollView,TouchableOpacity,Image } from 'react-native'
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import DescriptionScreen from './componenets/descriptionScreen'
import {DATA} from './componenets/data'

const Stack = createNativeStackNavigator()

const MAinScreen = ({ navigation }) => {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {DATA.map((item, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={0.85}
          style={styles.card}
          onPress={() =>
            navigation.navigate('Description', {
              title: item.title,
              desc: item.desc?.[0]?.desc,
            })
          }
        >
          <View style={styles.leftAccent} />

          <View style={styles.content}>
            <Text style={styles.title}>
              {item.title}
            </Text>

            <Text
              style={styles.desc}
              numberOfLines={2}
            >
              {item.desc || 'No description available'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default MAinScreen;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFDF7',
  },

  card: {
    width: '90%',
    backgroundColor: '#FFF8E7', // creamy bg
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,

    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    elevation: 4,
  },

  leftAccent: {
    width: 6,
    height: '85%',
    backgroundColor: '#D9A86C',
    borderRadius: 20,
    marginRight: 14,
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F2A25',
    marginBottom: 8,
  },

  desc: {
    fontSize: 14,
    color: '#6B625B',
    lineHeight: 22,
  },
});


const AutomobileHome = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MAinScreen} />
      <Stack.Screen name="Description" component={DescriptionScreen} />
    </Stack.Navigator>
  )
}

export default AutomobileHome

