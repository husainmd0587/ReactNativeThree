import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ImageBackground,
} from 'react-native';

const IntroMechanicalDrawing = () => {
  const Data = {
    header: {
      title: 'Mechanical Engineering Drawing',
      desc:
        'Learn the language of machines through technical drawings, dimensions, symbols and 3D visualization.',
      image:
        'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/engineeringDrawing%26cad/drawing%263d/drwingBanner.jpg',
    },
  };

  const topics = [
    '✏️ Types of Lines',
    '📦 Orthographic Projection',
    '🧊 Isometric View',
    '📏 Dimensioning',
    '✂️ Sectional Views',
    '⚙️ Machine Elements',
    '🔩 Threads & Bolts',
    '📐 Drawing Standards',
    '🧩 Assembly Drawings',
    '📊 Tolerances',
  ];

  const importance = [
    'Clear communication of machine designs',
    'Used in manufacturing and production',
    'Essential for machine assembly',
    'Helps understand 2D & 3D objects',
    'Widely used in industries and CAD',
  ];

  const whereUsed = [
    {
      icon: '🚗',
      title: 'Automobile Industry',
      desc:
        'Used to design engines, gears, suspension systems, braking systems and vehicle components.',
    },
    {
      icon: '✈️',
      title: 'Aerospace Industry',
      desc:
        'Helps design aircraft engines, turbines, wings and precision aerospace components.',
    },
    {
      icon: '🏭',
      title: 'Manufacturing Industry',
      desc:
        'Used to manufacture machine parts with exact measurements and dimensions.',
    },
    {
      icon: '🤖',
      title: 'Robotics & Automation',
      desc:
        'Used to design robotic arms, mechanical systems and automation equipment.',
    },
    {
      icon: '🔩',
      title: 'Workshop & Production',
      desc:
        'Technicians and machinists read engineering drawings for machining and assembly.',
    },
  ];

  const users = [
    'Mechanical Engineers',
    'CAD Designers',
    'Draftsmen',
    'Machine Operators',
    'Production Engineers',
    'Manufacturing Technicians',
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO SECTION */}
      <ImageBackground
        source={{ uri: Data.header.image }}
        style={styles.heroCard}
        imageStyle={styles.heroImage}
      >
        <View style={styles.overlay} />

        <View style={styles.heroContent}>
          <Text style={styles.heroEmoji}>
            ⚙️
          </Text>

          <Text style={styles.title}>
            {Data.header.title}
          </Text>

          <Text style={styles.subtitle}>
            {Data.header.desc}
          </Text>
        </View>
      </ImageBackground>

      {/* WHAT IS */}
      <View style={styles.card}>
        <Text style={styles.heading}>
          📘 What is Mechanical Engineering
          Drawing?
        </Text>

        <Text style={styles.description}>
          Mechanical Engineering Drawing is a
          technical method used to represent
          machines, machine parts, tools and
          engineering systems using standardized
          drawings, symbols and dimensions.
          {'\n\n'}
          It helps engineers, technicians and
          manufacturers understand the exact
          shape, size and structure of machine
          components. It acts as a universal
          language of engineering where designs
          can be understood without verbal
          explanation.
        </Text>
      </View>

      {/* WHERE USED */}
      <View style={styles.card}>
        <Text style={styles.heading}>
          🏭 Where is it Used?
        </Text>

        <Text style={styles.description}>
          Mechanical engineering drawing is used
          in many industries to design, develop
          and manufacture mechanical products.
        </Text>

        {whereUsed.map((item, index) => (
          <View key={index} style={styles.useCard}>
            <Text style={styles.useTitle}>
              {item.icon} {item.title}
            </Text>

            <Text style={styles.useDesc}>
              {item.desc}
            </Text>
          </View>
        ))}
      </View>

      {/* WHO USES */}
      <View style={styles.card}>
        <Text style={styles.heading}>
          👨‍🔧 Who Uses It?
        </Text>

        {users.map((item, index) => (
          <View key={index} style={styles.pointRow}>
            <View style={styles.dot} />

            <Text style={styles.point}>
              {item}
            </Text>
          </View>
        ))}
      </View>

      {/* IMPORTANCE */}
      <View style={styles.card}>
        <Text style={styles.heading}>
          🚀 Why is it Important?
        </Text>

        {importance.map((item, index) => (
          <View key={index} style={styles.pointRow}>
            <View style={styles.dot} />

            <Text style={styles.point}>
              {item}
            </Text>
          </View>
        ))}
      </View>

      {/* TOPICS */}
      <View style={styles.card}>
        <Text style={styles.heading}>
          📚 Main Topics You Will Learn
        </Text>

        <View style={styles.topicContainer}>
          {topics.map((item, index) => (
            <View
              key={index}
              style={styles.topicChip}
            >
              <Text style={styles.topicText}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* FUN FACT */}
      <View style={styles.factCard}>
        <Text style={styles.factTitle}>
          💡 Fun Fact
        </Text>

        <Text style={styles.factText}>
          Mechanical engineering drawing is often
          called the “language of engineers”
          because machines can be manufactured
          directly from technical drawings without
          verbal explanation.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

export default IntroMechanicalDrawing;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  heroCard: {
    height: 320,
    margin: 16,
    borderRadius: 34,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },

  heroImage: {
    borderRadius: 34,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  heroContent: {
    padding: 24,
  },

  heroEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 38,
  },

  subtitle: {
    fontSize: 15,
    color: '#CBD5E1',
    marginTop: 10,
    lineHeight: 24,
  },

  card: {
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
  },

  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 16,
  },

  description: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 20,
  },

  useCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },

  useTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },

  useDesc: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
  },

  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 100,
    backgroundColor: '#38BDF8',
    marginTop: 8,
    marginRight: 12,
  },

  point: {
    flex: 1,
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 24,
  },

  topicContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  topicChip: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 10,
    marginBottom: 10,
  },

  topicText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },

  factCard: {
    marginHorizontal: 16,
    backgroundColor: '#172554',
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2563EB',
  },

  factTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#93C5FD',
    marginBottom: 10,
  },

  factText: {
    color: '#DBEAFE',
    lineHeight: 26,
    fontSize: 15,
  },
});