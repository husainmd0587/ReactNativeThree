import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
} from 'react-native';

const lineTypes = [
  {
    title: 'Visible Line',
    symbol: '━━━━━━',
    color: '#000',
    desc:
      'A thick continuous line used to show visible edges and outlines of an object.',
  },
  {
    title: 'Hidden Line',
    symbol: '- - - - - -',
    color: '#2563EB',
    desc:
      'Used to represent edges or features that are hidden from view.',
  },
  {
    title: 'Center Line',
    symbol: '— · — · —',
    color: '#EF4444',
    desc:
      'Shows the center of circles, holes, and symmetrical parts.',
  },
  {
    title: 'Dimension Line',
    symbol: '↔────────↔',
    color: '#9333EA',
    desc:
      'Used to indicate dimensions and measurements of an object.',
  },
  {
    title: 'Extension Line',
    symbol: '│        │',
    color: '#F97316',
    desc:
      'Extends from the object to show where dimensions start and end.',
  },
  {
    title: 'Section Line',
    symbol: '/////////',
    color: '#DC2626',
    desc:
      'Represents cut surfaces in sectional views.',
  },
  {
    title: 'Cutting Plane Line',
    symbol: '— ─▶ —',
    color: '#16A34A',
    desc:
      'Shows the location where an imaginary cut is made.',
  },
  {
    title: 'Break Line',
    symbol: '≈≈≈≈≈',
    color: '#2563EB',
    desc:
      'Used to shorten long objects in drawings.',
  },
  {
    title: 'Leader Line',
    symbol: '────▶',
    color: '#EA580C',
    desc:
      'Connects notes, labels, or dimensions to a feature.',
  },
];

const LinesTypes = () => {
  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Banner Image */}
      <View style={styles.imageCard}>
        <Image
          source={{
            uri:'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/engineeringDrawing%26cad/drawing%263d/linesTypes/drawing3D.png',
          }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

   <View style={{padding:10}}>
          {/* Heading */}
      <Text style={styles.heading}>
        Line Types in Engineering Drawing
      </Text>

      <Text style={styles.subHeading}>
        Different types of lines are used in engineering
        drawings to represent visible edges, hidden
        details, dimensions, sections, and other
        important information.
      </Text>

      {/* Cards */}
      {lineTypes.map((item, index) => (
        <View key={index} style={styles.card}>
          <View
            style={[
              styles.symbolBox,
              { backgroundColor: `${item.color}15` },
            ]}
          >
            <Text
              style={[
                styles.symbol,
                { color: item.color },
              ]}
            >
              {item.symbol}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {item.title}
            </Text>

            <Text style={styles.description}>
              {item.desc}
            </Text>
          </View>
        </View>
      ))}

      {/* Bottom Space */}
      <View style={{ height: 30 }} />
   </View>
    </ScrollView>
  );
};

export default LinesTypes;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // dark navy
    paddingHorizontal: 5,
  },

  imageCard: {
    marginTop: 10,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 4,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },

  image: {
    width: '100%',
    height:250
  },

  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC', // white text
    marginTop: 20,
  },

  subHeading: {
    fontSize: 15,
    color: '#94A3B8', // soft gray
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 20,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: '#1E293B', // dark card
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },

  symbolBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: '#0F172A',
  },

  symbol: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 6,
  },

  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#CBD5E1',
  },
});