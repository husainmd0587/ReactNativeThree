import React, { useState } from 'react';
import {View,Text,ScrollView,TouchableOpacity,StyleSheet,SafeAreaView,StatusBar,Image} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CATEGORIES, INSTRUMENTS } from './instrumentsData';
import InstrumentDetailScreen from './detailsPage';

const Stack = createNativeStackNavigator();

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────

const Badge = ({ text, color, lightColor }) => (
  <View style={[styles.badge, { backgroundColor: lightColor }]}>
    <Text style={[styles.badgeText, { color }]}>{text}</Text>
  </View>
);

const InstrumentCard = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={() => onPress(item)}
    activeOpacity={0.82}
  >
    <View style={[styles.cardAccent, { backgroundColor: item.color }]} />
    <View style={styles.cardContent}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Badge text={item.accuracy} color={item.color} lightColor={item.lightColor} />
      </View>
      <Text style={styles.cardCategory}>{item.categoryLabel}</Text>

      {/* Body row: image + description side by side */}
      <View style={styles.cardBody}>
        <Image
          source={item.image}
          style={styles.cardImage}
          resizeMode="contain"
        />
        <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.cardStandard, { color: item.color }]}>{item.standard}</Text>
        <Text style={styles.cardArrow}>View details →</Text>
      </View>
    </View>
  </TouchableOpacity>
);

// ─── SCREEN ───────────────────────────────────────────────────────────────────

const AllMeasuringToolsMain = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filtered =
    selectedCategory === 'all'
      ? INSTRUMENTS
      : INSTRUMENTS.filter(i => i.category === selectedCategory);

  const handlePress = item => {
    navigation.navigate('InstrumentDetail', { instrument: item });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1F4E79"
        translucent={false}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mechanical Instruments</Text>
        <Text style={styles.headerSub}>
          {INSTRUMENTS.length} instruments · Reference Guide
        </Text>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.chip,
              selectedCategory === cat.id && styles.chipActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === cat.id && styles.chipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Result count */}
      <Text style={styles.countLabel}>
        {filtered.length} instrument{filtered.length !== 1 ? 's' : ''}
      </Text>

      {/* List */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}  alwaysBounceVertical={false}   
      >
        {filtered.map((item) => (
          <InstrumentCard key={item.id} item={item} onPress={handlePress} />
        ))}
      </ScrollView>

    </SafeAreaView>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
  
    backgroundColor: '#F4F6F8',
  },

  // Header
  header: {
    backgroundColor: '#1F4E79',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    minHeight: 60,
  },
  headerTitle: {
   fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily:'Oswald-Medium',
  },
  headerSub: {
    fontSize: 13,
    color: '#A8C8E8',
    marginTop: 4,
  },

  // Filter
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    flexDirection: 'row',
    height:35,
    backgroundColor:'#eaea'
  },
  chip: {
    paddingHorizontal: 14,
    borderRadius: 20,
    height:20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D8E4',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#1F4E79',
    borderColor: '#1F4E79',
  },
  chipText: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Count
  countLabel: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 20,
    marginBottom: 4,
  },

  // List
  listContent: {
  paddingHorizontal: 16,
  paddingBottom: 150,

  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardAccent: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
    flex: 1,
    marginRight: 8,
  },
  cardBody: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 10,
  marginBottom: 10,
},
cardImage: {
  width: 60,
  height: 60,
  borderRadius: 8,
  backgroundColor: '#F4F6F8',
  flexShrink: 0,
},
  cardCategory: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
cardDesc: {
  fontSize: 13,
  color: '#4A5568',
  lineHeight: 19,
  flex: 1,          
},
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardStandard: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardArrow: {
    fontSize: 12,
    color: '#A0AEC0',
  },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default function AllMeasuringTools() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MeasuringTools" component={AllMeasuringToolsMain} />
      <Stack.Screen name="InstrumentDetail" component={InstrumentDetailScreen} />
    </Stack.Navigator>
  );
}
