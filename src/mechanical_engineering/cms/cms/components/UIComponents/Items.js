// Items/Items.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AnimatedArrow from './utils/animationComp'


const Items = ({ title, items = [], navigation }) => {
  return (
    <View>
      {!!title && <Text style={styles.heading}>{title}</Text>}
      {items.map(item => {
        const customNavigation=item.navigation || 'ItemScreen'
       return(
             <TouchableOpacity 
          key={item.id} 
          style={styles.genericCard}
          onPress={() => navigation.push(customNavigation, { item,needToFetchBlock:false })}
        >
          <Text style={styles.genericCardTitle}>{item.icon} {item.title}</Text>
          <Text style={styles.genericArrow}>
            <AnimatedArrow size={12} color="#bdd7f8" />
          </Text>
        </TouchableOpacity>
       )
})}
    </View>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    margin:5,
    backgroundColor:'#dad8d8',
    borderRadius:5,
    paddingHorizontal:5
  },
  genericCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding:10,
    marginBottom: 10,
    marginHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    borderWidth:1,
    borderColor:"#a7a7a7"
  
  },
  genericCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  genericArrow: {
    fontSize: 18,
    color: '#bbb',
  },
});

export default Items;