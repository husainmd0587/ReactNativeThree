import React from 'react'
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  Canvas,
  RoundedRect,
  Circle,
  Line,
  vec,
  Text as SkiaText,
  useFont,
} from '@shopify/react-native-skia'

const safetyTopics = [
  'Personal Protective Equipment (PPE)',
  'Fire Safety',
  'Electrical Safety',
  'Machine Guarding',
  'Hazard Identification',
  'Emergency Procedures',
  'First Aid',
  'Chemical Safety',
  'Workplace Ergonomics',
  'Lockout / Tagout (LOTO)',
]

const Safety = () => {
  const font = useFont(require('../../assets/fonts/Oswald-Regular.ttf'), 16)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER CARD */}
        <View style={styles.headerCard}>
          <Canvas style={styles.canvas}>
            
            {/* Background */}
            <RoundedRect
              x={0}
              y={0}
              width={350}
              height={220}
              r={28}
              color="#111827"
            />

            {/* Decorative circles */}
            <Circle cx={300} cy={45} r={40} color="#f59e0b" />
            <Circle cx={260} cy={170} r={30} color="#ef4444" />
            <Circle cx={70} cy={180} r={22} color="#22c55e" />

            {/* Helmet Shape */}
            <RoundedRect
              x={120}
              y={70}
              width={110}
              height={60}
              r={25}
              color="#facc15"
            />

            {/* Helmet base */}
            <RoundedRect
              x={105}
              y={120}
              width={140}
              height={18}
              r={8}
              color="#eab308"
            />

            {/* Warning line */}
            <Line
              p1={vec(50, 40)}
              p2={vec(120, 40)}
              color="#ffffff"
              style="stroke"
              strokeWidth={4}
            />

            {font && (
              <>
                <SkiaText
                  x={25}
                  y={35}
                  text="INDUSTRIAL SAFETY"
                  font={font}
                  color="white"
                />

                <SkiaText
                  x={25}
                  y={200}
                  text="Safety First • Zero Accidents"
                  font={font}
                  color="#d1d5db"
                />
              </>
            )}
          </Canvas>
        </View>

        {/* DESCRIPTION */}
        <View style={styles.infoCard}>
          <Text style={styles.title}>What is Industrial Safety?</Text>

          <Text style={styles.description}>
            Industrial safety focuses on preventing accidents,
            injuries, and hazards in factories, workshops,
            manufacturing plants, and industrial environments.
            It ensures workers remain safe while operating
            machines and equipment.
          </Text>
        </View>

        {/* TOPICS */}
        <Text style={styles.sectionTitle}>Important Topics</Text>

        {safetyTopics.map((item, index) => (
          <View key={index} style={styles.topicCard}>
            <View style={styles.numberBox}>
              <Text style={styles.number}>{index + 1}</Text>
            </View>

            <Text style={styles.topicText}>{item}</Text>
          </View>
        ))}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            “Safety is not expensive, it is priceless.”
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

export default Safety

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  headerCard: {
    alignItems: 'center',
    marginTop: 20,
  },

  canvas: {
    width: 350,
    height: 220,
  },

  infoCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginTop: 25,
    borderRadius: 20,
    padding: 20,
  },

  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },

  description: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 24,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 30,
    marginLeft: 20,
    marginBottom: 15,
  },

  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 18,
    padding: 16,
  },

  numberBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  number: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },

  topicText: {
    color: '#f8fafc',
    fontSize: 16,
    flex: 1,
    fontWeight: '600',
  },

  footer: {
    marginTop: 30,
    marginBottom: 40,
    alignItems: 'center',
  },

  footerText: {
    color: '#94a3b8',
    fontSize: 15,
    fontStyle: 'italic',
  },
})