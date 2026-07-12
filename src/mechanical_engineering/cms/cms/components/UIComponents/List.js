// List/List.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const LIST_ICON_TYPES = {
  checked: "☑",
  checkbox: "☐",
  dot: "•",
  circle: "○",
  filled: "●",
  square: "▪",
  star: "★",
  arrow: "➜",
  triangle: "▸",
  diamond: "◆",
  number: "#",
};

const List = ({
  title,
  items = [],
  listIcon = "checked",
  accentColor = "#F59E0B",
  cardStyle,
  titleStyle,
  itemStyle,
}) => {
  const icon = LIST_ICON_TYPES[listIcon] ?? LIST_ICON_TYPES.checked;

  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <View style={[styles.card, cardStyle, { borderColor: accentColor }]}>
      {!!title && <Text style={[styles.cardTitle, titleStyle]}>{title}</Text>}

      {items.map((item, index) => (
        <View key={index} style={styles.listItemWrapper}>
          <Text style={[styles.listItem, itemStyle]}>
            <Text style={[styles.listIcon, { color: accentColor }]}>
              {icon}{' '}
            </Text>
            {String(item)}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 16,
    padding: 12,
    marginVertical: 6,
    
    // Modern shadow effect
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    
    // Vintage/old shadow effect (layered)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
    letterSpacing: 0.3,
    
    // Text shadow for depth
    textShadowColor: 'rgba(0,0,0,0.03)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  listItemWrapper: {
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  listItem: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  listIcon: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 4,
  },
});

export default List;