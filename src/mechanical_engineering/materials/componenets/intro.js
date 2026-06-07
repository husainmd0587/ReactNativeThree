import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const IntroIndustrialMaterials = () => {
  const categories = [
    {
      title: 'Metals',
      emoji: '⚙️',
      color: '#FFE5D9',
      text: 'Strong and durable materials used in machine components, structures, tools, and automobiles.',
    },
    {
      title: 'Plastics & Polymers',
      emoji: '🧪',
      color: '#E3FCEC',
      text: 'Lightweight materials used in gears, insulation, machine covers, and automotive interiors.',
    },
    {
      title: 'Ceramics',
      emoji: '🔥',
      color: '#E8F0FE',
      text: 'Hard and heat-resistant materials used in cutting tools, insulators, and furnace linings.',
    },
    {
      title: 'Composites',
      emoji: '🚀',
      color: '#FFF3CD',
      text: 'Advanced lightweight materials with high strength used in aerospace and automotive industries.',
    },
  ];

  const properties = [
    'Strength',
    'Hardness',
    'Toughness',
    'Ductility',
    'Elasticity',
    'Corrosion Resistance',
    'Heat Resistance',
    'Wear Resistance',
  ];

  const industries = [
    'Automobile Industry',
    'Manufacturing Industry',
    'Aerospace Industry',
    'Machine Design',
    'Construction',
    'Oil & Gas Plants',
    'Power Plants',
    'Tool Engineering',
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Industrial Materials
        </Text>

        <Text style={styles.subtitle}>
          Learn about materials used in mechanical
          engineering, manufacturing, machines,
          automobiles, and industries.
        </Text>
      </View>

      {/* Introduction Card */}
      <View style={styles.mainCard}>
        <Text style={styles.cardTitle}>
          📘 What are Industrial Materials?
        </Text>

        <Text style={styles.description}>
          Industrial materials are materials used to
          manufacture machines, tools, structures,
          automobiles, and industrial products.
          Selecting the correct material is important
          because it directly affects strength,
          durability, cost, safety, and performance.
        </Text>
      </View>

      {/* Why Important */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Why Material Selection Matters?
        </Text>

        <View style={styles.bulletCard}>
          <Text style={styles.bullet}>
            ✅ Improves machine life
          </Text>

          <Text style={styles.bullet}>
            ✅ Reduces manufacturing cost
          </Text>

          <Text style={styles.bullet}>
            ✅ Improves strength & durability
          </Text>

          <Text style={styles.bullet}>
            ✅ Prevents corrosion & failure
          </Text>

          <Text style={styles.bullet}>
            ✅ Increases safety
          </Text>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Types of Industrial Materials
        </Text>

        {categories.map((item, index) => (
          <View
            key={index}
            style={[
              styles.categoryCard,
              { backgroundColor: item.color },
            ]}
          >
            <Text style={styles.categoryEmoji}>
              {item.emoji}
            </Text>

            <View style={{ flex: 1 }}>
              <Text style={styles.categoryTitle}>
                {item.title}
              </Text>

              <Text style={styles.categoryText}>
                {item.text}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Properties */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Important Material Properties
        </Text>

        <View style={styles.propertyContainer}>
          {properties.map((item, index) => (
            <View
              key={index}
              style={styles.propertyChip}
            >
              <Text style={styles.propertyText}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Applications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Industrial Applications
        </Text>

        <View style={styles.applicationCard}>
          {industries.map((item, index) => (
            <Text
              key={index}
              style={styles.industryItem}
            >
              🔹 {item}
            </Text>
          ))}
        </View>
      </View>

      {/* Bottom Note */}
      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>
          💡 Engineering Fact
        </Text>

        <Text style={styles.footerText}>
          No single material is perfect for every
          application. Engineers select materials
          based on strength, cost, weight,
          temperature resistance, corrosion
          resistance, and manufacturing process.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

export default IntroIndustrialMaterials;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 10,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
  },

  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: '#666',
  },

  mainCard: {
    marginHorizontal: 20,
    marginTop: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 10,
  },

  description: {
    color: '#555',
    lineHeight: 24,
    fontSize: 15,
  },

  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 15,
    color: '#1A1A2E',
  },

  bulletCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
  },

  bullet: {
    fontSize: 15,
    marginBottom: 10,
    color: '#444',
  },

  categoryCard: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 22,
    marginBottom: 14,
  },

  categoryEmoji: {
    fontSize: 34,
    marginRight: 14,
  },

  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 5,
  },

  categoryText: {
    color: '#555',
    lineHeight: 22,
  },

  propertyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  propertyChip: {
    backgroundColor: '#E9ECFF',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },

  propertyText: {
    fontWeight: '600',
    color: '#344CB7',
  },

  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
  },

  industryItem: {
    fontSize: 15,
    marginBottom: 12,
    color: '#444',
  },

  footerCard: {
    backgroundColor: '#DFF6FF',
    marginHorizontal: 20,
    marginTop: 30,
    borderRadius: 22,
    padding: 20,
  },

  footerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#0F3460',
  },

  footerText: {
    color: '#333',
    lineHeight: 24,
  },
});