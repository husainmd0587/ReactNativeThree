import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
} from 'react-native';

import { createNativeStackNavigator }
from '@react-navigation/native-stack';
import { materialsData } from './data';

import Intro from './componenets/intro';

const ListScreen = [
  {
    name: 'Intro',
    component: Intro,
    title: 'Introduction to industrial materials',
    icon: '📚',
    color: '#7F77F1',
    showInMenu:false
  },
];


const Main = ({ navigation }) => {
  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO */}
      <View style={styles.heroWrapper}>
        <ImageBackground
          source={{
            uri: 'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/IndustrialMaterials/images/intro/header.jpg',
          }}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.overlay}>
            <Text style={styles.heading}>
              INDUSTRIAL
            </Text>

            <Text style={styles.heading2}>
              MATERIALS
            </Text>

            <Text style={styles.subHeading}>
              Explore properties, types,
              applications and uses of
              engineering materials.
            </Text>
          </View>
        </ImageBackground>
      </View>

      {/* FLOATING CONTENT */}
      <View style={styles.content}>
        {/* TOP MENU CARDS */}
        <View style={styles.topGrid}>
          <TouchableOpacity
            style={styles.topCard}
            onPress={() =>
              navigation.navigate('Intro')
            }
          >
            <Text style={styles.topIcon}>
              📘
            </Text>

            <Text style={styles.topTitle}>
              Introduction
            </Text>

            <Text style={styles.topSub}>
              Basics & Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.topCard}
          >
            <Text style={styles.topIcon}>
              💎
            </Text>

            <Text style={styles.topTitle}>
              Properties
            </Text>

            <Text style={styles.topSub}>
              Material Properties
            </Text>
          </TouchableOpacity>
        </View>

        {/* SECTION TITLE */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            MATERIAL CATEGORIES
          </Text>
        </View>

        {/* GRID */}
        <View style={styles.grid}>
          {materialsData.children.map(
            (item, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.85}
                style={styles.materialCard}
              >
                {/* Image */}
                <Image
                  source={{
                    uri:
                      item.image ||
                      'https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/IndustrialMaterials/images/materials-images/metals/aluminum.jpg',
                  }}
                  style={
                    styles.materialImage
                  }
                />

                {/* Icon Circle */}
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor:
                        item.color,
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.materialIcon
                    }
                  >
                    {item.icon}
                  </Text>
                </View>

                {/* Content */}
                <View
                  style={
                    styles.cardContent
                  }
                >
                  <Text
                    style={[
                      styles.materialTitle,
                      {
                        color:
                          item.color,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>

                  <Text
                    numberOfLines={2}
                    style={
                      styles.materialDesc
                    }
                  >
                    {item.desc ||
                      'Industrial engineering materials'}
                  </Text>

                  <Text
                    style={[
                      styles.explore,
                      {
                        color:
                          item.color,
                      },
                    ]}
                  >
                    Explore →
                  </Text>
                </View>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* INFO CARD */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>
            💡
          </Text>

          <Text style={styles.infoText}>
            Right material selection is
            the key to performance,
            durability, safety and cost
            efficiency in engineering.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default Main;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1EC',
  },

  heroWrapper: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  hero: {
    height: 280,
    overflow: 'hidden',
    borderRadius: 30,
  },

  heroImage: {
    borderRadius: 30,
  },

  overlay: {
    flex: 1,
    backgroundColor:
      'rgba(2,18,55,0.68)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  heading: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 48,
  },

  heading2: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFC83D',
    lineHeight: 30,
  },

  subHeading: {
    color: '#E7E7E7',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 14,
    width: '70%',
  },

  content: {
    marginTop: -45,
    backgroundColor: '#F4F1EC',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 50,
  },

  topGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom:10,
  },

  topCard: {
    width: '45%',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical:5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },

  topIcon: {
    fontSize: 30,
  },

  topTitle: {
    fontSize: 15,
    lineHeight:18,
    fontWeight: '700',
    color: '#111',
  },

  topSub: {
    marginTop: 6,
    color: '#666',
    fontSize: 13,
    lineHeight:15
  },

  sectionRow: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#13234B',
    letterSpacing: 1,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  materialCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 10,
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },

  materialImage: {
    width: '100%',
    height: 120,
  },

  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: -20,
    borderWidth: 4,
    borderColor: '#fff',
  },

  materialIcon: {
    fontSize: 26,
  },

  cardContent: {
    alignItems: 'center',
    paddingBottom:10
  },

  materialTitle: {
    fontSize: 22,
    lineHeight:22,
    fontWeight: '900',
    textAlign: 'center',
  },

  materialDesc: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    lineHeight: 15,
  },

  explore: {
    fontSize: 16,
    fontWeight: '700',
   
  },

  infoCard: {
    backgroundColor: '#EAF3FF',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginTop: 12,
  },

  infoIcon: {
    fontSize: 28,
    marginRight: 12,
  },

  infoText: {
    flex: 1,
    color: '#234',
    fontSize: 14,
    lineHeight: 22,
  },
});


const Stack =
  createNativeStackNavigator();

const MaterialsHome = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Main"
        component={Main}
      />

      {ListScreen.map(
        (item, index) => (
          <Stack.Screen
            key={index}
            name={item.name}
            component={
              item.component
            }
            options={{
              title:
                item.title,
            }}
          />
        )
      )}
    </Stack.Navigator>
  );
};

export default MaterialsHome;

