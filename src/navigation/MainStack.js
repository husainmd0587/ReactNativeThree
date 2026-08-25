import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ImageBackground, 
  StatusBar, ScrollView, TextInput, FlatList, Dimensions, Animated 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import storage from '../utils/store/localStorage/asynStorage.js';
import ProgressRing from '../utils/components/common/progressBar.js';

import HomeCad from '../mechanical_engineering/Edand3D/index.js'
import HomeTurningMilling from '../turning_milling/index.js';
import AllMeasuringTools from '../mechanical_engineering/measurings/allmeasuringTools.js';
import MetalWeightCalculator from '../mechanical_engineering/calculator/home.js';
import MachineElements from '../mechanical_engineering/machine_elements/index.js';
import Robots from '../mechanical_engineering/robots/index.js';
import Workshop from '../mechanical_engineering/workshop/index.js';
import AutomobileHome from '../mechanical_engineering/automobile/index.js';
import MaterialsHome from '../mechanical_engineering/materials/index.js';
import ProductionManagement from '../mechanical_engineering/management/management.js';
import MCQ from '../mechanical_engineering/management/mcq/index.js';

// special simulations screens
import AutoCadPractice from '../mechanical_engineering/Edand3D/customScreens/AutoCad/index.js';
import FreehandTurning from '../turning_milling/customScreens/mannualTurning/freehandTurning.js';
import CncSimulatorPro from '../turning_milling/customScreens/cnc/CncSimulatorPro.js';
import RoboticSimulator from '../mechanical_engineering/robots/customScreens/robotics/mannualRobot/robotTestScreen.js';
import ScientificCalculator from '../mechanical_engineering/calculator/allCalculators/ScientificCalculator.js';

import { Header } from '../components/common/index.js';
import SplashScreen from './splash.js';
const Stack = createNativeStackNavigator();
const { width } = Dimensions.get('window');

const FeaturedSimulatorCard = React.memo(({ simulator, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const cardWidth = width < 768 ? width * 0.75 : width * 0.4;

  return (
    <Animated.View
      style={[
        styles.featuredCardWrapper,
        {
          width: cardWidth,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <TouchableOpacity
        style={styles.featuredCard}
        onPress={() => onPress(simulator.route)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={simulator.bgImage}
          style={styles.featuredImage}
          imageStyle={styles.featuredImageStyle}
          resizeMode="cover"
        >
          <View style={[styles.featuredOverlay, { backgroundColor: simulator.accent + '30' }]} />
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>⭐ FEATURED</Text>
          </View>
          <View style={styles.featuredEmojiContainer}>
            <Text style={styles.featuredEmoji}>{simulator.emoji}</Text>
          </View>
          <View style={[styles.featuredColorBar, { backgroundColor: simulator.accent }]} />
        </ImageBackground>
        <View style={styles.featuredContent}>
          <Text style={styles.featuredName} numberOfLines={1}>{simulator.label}</Text>
          <Text style={styles.featuredDesc} numberOfLines={2}>{simulator.desc}</Text>
          <View style={[styles.featuredTag, { backgroundColor: simulator.accent + '20' }]}>
            <Text style={[styles.featuredTagText, { color: simulator.accent }]}>
              🎯 Try Now
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── Featured Simulator Scroll ──

const FeaturedSimulatorScroll = React.memo(({ simulators, onSimulatorPress }) => {
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Calculate card width based on screen
  const cardWidth = width < 768 ? width * 0.75 : width * 0.4;
  const spacing = 16;
  // The total width includes the card + marginRight from card wrapper
  const totalWidth = cardWidth + spacing;

  // Auto-scroll animation
  useEffect(() => {
    if (simulators.length === 0) return;

    const startAutoScroll = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      intervalRef.current = setInterval(() => {
        if (flatListRef.current) {
          const nextIndex = (currentIndex + 1) % simulators.length;
          // Calculate offset based on card width + spacing
          const offsetX = nextIndex * totalWidth;
          
          flatListRef.current.scrollToOffset({
            offset: offsetX,
            animated: true,
          });
          
          setCurrentIndex(nextIndex);
        }
      }, 3000);
    };

    startAutoScroll();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentIndex, simulators.length, totalWidth]);

  const handleMomentumScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    // Calculate which card is centered
    const index = Math.round(offsetX / totalWidth);
    const clampedIndex = Math.min(Math.max(index, 0), simulators.length - 1);
    setCurrentIndex(clampedIndex);
    
    // Snap to exact position after user scroll
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: clampedIndex * totalWidth,
        animated: true,
      });
    }
  };

  // Handle scroll to get current index
  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / totalWidth);
    if (index !== currentIndex && index >= 0 && index < simulators.length) {
      setCurrentIndex(index);
    }
  };

  // Shuffle simulators for featured section
  const shuffledSimulators = useMemo(() => {
    const shuffled = [...simulators];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [simulators]);

  // Dot indicators
  const renderDots = () => {
    return (
      <View style={styles.featuredDotsContainer}>
        {shuffledSimulators.map((simulator, index) => (
          <View
            key={index}
            style={[
              styles.featuredDot,
              currentIndex === index && styles.featuredDotActive,
              { backgroundColor: currentIndex === index ? simulator.accent : '#D1D5DB' }
            ]}
          />
        ))}
      </View>
    );
  };

  if (simulators.length === 0) return null;

  return (
    <View style={styles.featuredSection}>
      <View style={styles.featuredHeader}>
        <View style={styles.featuredHeaderLeft}>
          <Text style={styles.featuredTitle}>🌟 Featured Simulators</Text>
          <Text style={styles.featuredSubtitle}>Most popular interactive experiences</Text>
        </View>
        <TouchableOpacity 
          style={styles.featuredSeeAllBtn}
          onPress={() => onSimulatorPress(shuffledSimulators[0]?.route)}
        >
          <Text style={styles.featuredSeeAllText}>View All →</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={shuffledSimulators}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.route + '_featured'}
        renderItem={({ item }) => (
          <FeaturedSimulatorCard
            simulator={item}
            onPress={onSimulatorPress}
          />
        )}
        contentContainerStyle={[
          styles.featuredList,
          { 
            paddingHorizontal: (width - cardWidth) / 2, // Center the first and last cards
          }
        ]}
        snapToAlignment="center"
        snapToInterval={totalWidth}
        decelerationRate="fast"
        bounces={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialNumToRender={3}
        showsHorizontalScrollIndicator={false}
        // Add these props for better snapping
        pagingEnabled={false}
        disableIntervalMomentum={true}
      />

      {renderDots()}
    </View>
  );
});

// ── Simulator Grid Component ──
const SimulatorGrid = React.memo(({ simulators, onSimulatorPress }) => {
  if (simulators.length === 0) return null;

  return (
    <View style={styles.simulatorSection}>
      <View style={styles.simulatorHeader}>
        <View style={styles.simulatorHeaderLeft}>
          <Text style={styles.simulatorTitle}>🚀 All Simulators</Text>
          <Text style={styles.simulatorSubtitle}>Hands-on learning experiences</Text>
        </View>
      </View>

      <View style={styles.simulatorGrid}>
        {simulators.map((simulator, index) => {
          const isLastInRow = (index + 1) % 3 === 0;
          return (
            <View 
              key={simulator.route} 
              style={[
                styles.simulatorGridItem,
                isLastInRow && styles.simulatorGridItemLast
              ]}
            >
              <SimulatorCard
                simulator={simulator}
                onPress={onSimulatorPress}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
});

// ── Simulator Card Component (Grid) ──
const SimulatorCard = React.memo(({ simulator, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
    }).start();
    Animated.spring(translateY, {
      toValue: 2,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.simulatorCardWrapper,
        {
          transform: [{ scale: scaleAnim }, { translateY }],
        }
      ]}
    >
      <TouchableOpacity
        style={styles.simulatorCard}
        onPress={() => onPress(simulator.route)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={simulator.bgImage}
          style={styles.simulatorImage}
          imageStyle={styles.simulatorImageStyle}
          resizeMode="cover"
        >
          <View style={[styles.simulatorOverlay, { backgroundColor: simulator.accent + '40' }]} />
          <View style={styles.simulatorBadge}>
            <Text style={styles.simulatorBadgeText}>SIM</Text>
          </View>
          <Text style={styles.simulatorEmoji}>{simulator.emoji}</Text>
          <View style={[styles.simulatorColorBar, { backgroundColor: simulator.accent }]} />
        </ImageBackground>
        <View style={styles.simulatorContent}>
          <Text style={styles.simulatorName} numberOfLines={1}>{simulator.label}</Text>
          <Text style={styles.simulatorDesc} numberOfLines={2}>{simulator.desc}</Text>
          <View style={[styles.simulatorTag, { backgroundColor: simulator.accent + '20' }]}>
            <Text style={[styles.simulatorTagText, { color: simulator.accent }]}>
              Interactive
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── Module card component ──
const ModuleCard = React.memo(({ screen, onPress, wide = false, listView = false }) => {
  const cardStyles = [
    styles.card,
    wide && styles.cardWide,
    listView && styles.cardList,
    listView && styles.cardListFull
  ];

  const imageStyles = [
    styles.cardImg,
    wide && styles.cardImgWide,
    listView && styles.cardImgList
  ];

  const bodyStyles = [
    styles.cardBody,
    wide && styles.cardBodyWide,
    listView && styles.cardBodyList
  ];

  return (
    <TouchableOpacity
      style={cardStyles}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <ImageBackground
        source={screen.bgImage}
        style={imageStyles}
        imageStyle={styles.cardImageStyle}
        resizeMode="cover"
      >
        <View style={[styles.imageOverlay, { backgroundColor: screen.accentBg + '80' }]} />
        <Text style={styles.cardEmoji}>{screen.emoji}</Text>
        <View style={[styles.colorBar, { backgroundColor: screen.accent }]} />
      </ImageBackground>

      <View style={bodyStyles}>
        <View style={styles.cardContent}>
          <Text style={styles.cardName} numberOfLines={1}>{screen.label}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{screen.desc}</Text>
        </View>
        <Text style={[styles.cardArrow, { color: screen.accent }]}>→</Text>
      </View>
    </TouchableOpacity>
  );
});

// ── Toolbox component ──
const Toolbox = React.memo(({ 
  listView, 
  onToggleListView, 
  searchOpen, 
  onToggleSearch, 
  searchText, 
  onSearchChange 
}) => {
  const viewMode = listView ? 'list' : 'grid';

  return (
    <View style={styles.toolbox}>
      <View style={styles.toolboxLeft}>
        <TouchableOpacity
          style={styles.toolboxBtn}
          onPress={onToggleSearch}
          activeOpacity={0.85}
        >
          <Text style={styles.toolboxBtnIcon}>🔍</Text>
          <Text style={styles.toolboxBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.toolboxBtn}
        onPress={onToggleListView}
        activeOpacity={0.85}
      >
        <Text style={styles.toolboxBtnIcon}>
          {viewMode === 'grid' ? '☰' : '▦'}
        </Text>
        <Text style={styles.toolboxBtnText}>
          {viewMode === 'grid' ? 'List' : 'Grid'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

// ── Search bar component ──
const SearchBar = React.memo(({ searchText, onSearchChange }) => (
  <View style={styles.searchWrap}>
    <TextInput
      value={searchText}
      onChangeText={onSearchChange}
      placeholder="Search modules..."
      placeholderTextColor="#9CA3AF"
      style={styles.searchInput}
      autoFocus
      returnKeyType="done"
    />
  </View>
));

// ── Empty state component ──
const EmptyState = React.memo(() => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyStateEmoji}>📭</Text>
    <Text style={styles.emptyStateTitle}>No module found</Text>
    <Text style={styles.emptyStateText}>Try a different keyword</Text>
  </View>
));

// ── Navigation main ──
const NavigationMain = ({ navigation }) => {
  const [listView, setListView] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {      
    const loadViewMode = async () => {
      try {
        const savedMode = await storage.get('viewMode');
        if (savedMode !== null) {
          setListView(savedMode === 'list');
        }
      } catch (error) {
        console.error('Error loading view mode:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadViewMode();
  }, []);

  // Memoize filtered modules
  const filteredModules = useMemo(() => {
    const modules = AllScreens.filter(s => s.showInMenu !== false && s.name !== 'Calculator');
    const normalizedSearch = searchText.trim().toLowerCase();
    
    if (!normalizedSearch) return modules;
    
    return modules.filter((screen) => {
      const label = (screen.label || '').toLowerCase();
      const desc = (screen.desc || '').toLowerCase();
      return label.includes(normalizedSearch) || desc.includes(normalizedSearch);
    });
  }, [searchText]);

  // Separate main and wide modules
  const { mainModules, wideModules } = useMemo(() => ({
    mainModules: filteredModules.filter(s => !s.wide),
    wideModules: filteredModules.filter(s => s.wide)
  }), [filteredModules]);

  // Memoize drawer items
  const drawerItems = useMemo(() => 
    filteredModules.map((screen) => ({
      key: screen.name,
      label: screen.label,
      emoji: screen.emoji,
      route: screen.name,
    })),
    [filteredModules]
  );

  // Simulators data
  const simulators = useMemo(() => [
    {
      route: 'AutoCadPractice',
      label: 'AutoCAD Practice',
      desc: 'Practice 2D/3D drafting and modeling',
      emoji: '📐',
      bgImage: require('../assets/images/navigations/drawing_cad.png'),
      accent: '#7F77DD',
    },
    {
      route: 'FreehandTurning',
      label: 'Freehand Turning',
      desc: 'Manual lathe operation simulation',
      emoji: '🔧',
      bgImage: require('../assets/images/navigations/drawing_cad.png'),
      accent: '#1D9E75',
    },
    {
      route: 'CncSimulatorPro',
      label: 'CNC Simulator Pro',
      desc: 'Professional CNC programming simulation',
      emoji: '⚙️',
      bgImage: require('../assets/images/navigations/drawing_cad.png'),
      accent: '#378ADD',
    },
    {
      route: 'RoboticSimulator',
      label: 'Robotics Simulator',
      desc: 'Program and simulate robot arms',
      emoji: '🤖',
      bgImage: require('../assets/images/navigations/drawing_cad.png'),
      accent: '#D4537E',
    },
    {
      route: 'ScientificCalculator',
      label: 'Scientific Calculator',
      desc: 'Advanced calculations for engineers',
      emoji: '🧮',
      bgImage: require('../assets/images/navigations/drawing_cad.png'),
      accent: '#FFA500',
    }
  ], []);

  // Callback handlers
  const handleToggleListView = useCallback(async () => {
    const newValue = !listView;
    setListView(newValue);
    
    try {
      await storage.set('viewMode', newValue ? 'list' : 'grid');
    } catch (error) {
      console.error('Error saving view mode:', error);
    }
  }, [listView]);

  const handleToggleSearch = useCallback(() => {
    setSearchOpen(prev => !prev);
    if (!searchOpen) setSearchText('');
  }, [searchOpen]);

  const handleSearchChange = useCallback((text) => {
    setSearchText(text);
  }, []);

  const handleNavigate = useCallback((screenName) => {
    navigation.navigate(screenName);
  }, [navigation]);

  const handleSimulatorPress = useCallback((route) => {
    navigation.navigate(route);
  }, [navigation]);

  // Render wide module function
  const renderWideModule = useCallback((screen) => (
    <ModuleCard
      key={screen.name}
      screen={screen}
      onPress={() => handleNavigate(screen.name)}
      wide
      listView={listView}
    />
  ), [listView, handleNavigate]);

  if(isLoading) return <ProgressRing/>
   
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with Background Image */}
      <View style={styles.headerContainer}>
        <ImageBackground
          source={require('../assets/images/navigations/drawing_cad.png')}
          style={styles.headerBackground}
          imageStyle={styles.headerBackgroundImage}
          resizeMode="cover"
        >
          <View style={styles.headerOverlay}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>ME Studio</Text>
                <Text style={styles.headerSubtitle}>Mechanical Engineering · Learn Easily</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.headerProfileBtn}>
                  <Text style={styles.headerProfileEmoji}>👤</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>

      <Toolbox
        listView={listView}
        onToggleListView={handleToggleListView}
        searchOpen={searchOpen}
        onToggleSearch={handleToggleSearch}
        searchText={searchText}
        onSearchChange={handleSearchChange}
      />

      {searchOpen && (
        <SearchBar
          searchText={searchText}
          onSearchChange={handleSearchChange}
        />
      )}

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={[styles.body, listView && styles.bodyList]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Featured Simulator Scroll Section */}
        <FeaturedSimulatorScroll 
          simulators={simulators}
          onSimulatorPress={handleSimulatorPress}
        />

        {/* Simulator Grid Section */}
        <SimulatorGrid 
          simulators={simulators}
          onSimulatorPress={handleSimulatorPress}
        />

        {filteredModules.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>MODULES</Text>
            
            <View style={[styles.grid, listView && styles.list]}>
              {mainModules.map((screen) => (
                <ModuleCard
                  key={screen.name}
                  screen={screen}
                  onPress={() => handleNavigate(screen.name)}
                  listView={listView}
                />
              ))}
            </View>

            {wideModules.map(renderWideModule)}
          </>
        ) : (
          <EmptyState />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Screens config ──
const AllScreens = [
  {
    name: 'Engineering_drawing&CAD',
    label: 'Engineering Drawing & CAD',
    desc: 'Sketch, model and export 2D/3D parts',
    component: HomeCad,
    emoji: '✏️',
    bgImage: require('../assets/images/navigations/drawing_cad.png'),
    accent: '#7F77DD', 
    accentBg: '#EEEDFE',
    slogan: [
      'Unleash your creativity!',
      'Design, build, innovate.',
      'Concept to creation.',
    ],
  },
  {
    name: 'HomeTurningMilling',
    label: 'Turning & Milling',
    desc: 'Simulate CNC turning programs',
    component: HomeTurningMilling,
    emoji: '⚙️',
    bgImage: require('../assets/images/navigations/drawing_cad.png'),
    accent: '#1D9E75', 
    accentBg: '#E1F5EE',
    slogan: [
      'G-Code made easy.',
      'Test CNC programs virtually.',
      'Precision turning, simulated.',
    ],
  },
  {
    name: 'Mechanical measuring tools',
    label: 'Measuring Tools',
    desc: 'Calipers, micrometers & gauges',
    component: AllMeasuringTools,
    emoji: '📏',
    bgImage: require('../assets/images/navigations/drawing_cad.png'),
    accent: '#D85A30', 
    accentBg: '#FAECE7',
    slogan: [
      'Measure twice, cut once.',
      'Master precision measurement.',
    ],
  },
  {
    name: 'Machine Elements',
    label: 'Machine Elements',
    desc: 'Gears, shafts, fasteners & bearings',
    component: MachineElements,
    emoji: '🔩',
    bgImage: require('../assets/images/navigations/drawing_cad.png'),
    accent: '#378ADD', 
    accentBg: '#E6F1FB',
    slogan: [
      'Gears, bearings & more.',
      'Explore mechanical design.',
    ],
  },
  {
    name: 'robots',
    label: 'Robotics',
    desc: 'Kinematics, arms and automation systems',
    component: Robots,
    emoji: '🤖',
    bgImage: require('../assets/images/navigations/drawing_cad.png'),
    accent: '#D4537E', 
    accentBg: '#FBEAF0',
    slogan: ['Automate the future.', 'Explore robot kinematics.'],
  },
  {
    name: 'Engineering calculators',
    component: MetalWeightCalculator,
    label: 'Calculators',
    desc: 'Material weight & more',
    emoji: '🧮',
    bgImage: require('../assets/images/navigations/drawing_cad.png'),
    accent: '#FFA500', 
    accentBg: '#FFF5E6',
    slogan: ['Quick calculations.', 'Material weight & more.'],
  },
  {
    name:'AllWorkShops',
    label:'All WorkShops',
    component: Workshop,
    emoji: '🔧',
    bgImage: require('../assets/images/navigations/drawing_cad.png'),
    accent: '#5CB85C', 
    accentBg: '#EAFDEB',
    slogan: ['Welding, smithy & more.', 'Your workshop reference.'],
  },
  {
    name:'Automobile',
    label:'Automobile Engineering',
    component: AutomobileHome,
    emoji: '🚗',
    bgImage: require('../assets/images/navigations/drawing_cad.png'),
    accent: '#FF5733', 
    accentBg: '#FFEDE8',
    slogan: ['Engines, systems & design.', 'Explore automobile engineering.'],
  },
  {
    name:'Materials',
    label:'Materials Science',
    component: MaterialsHome,
    emoji: '🧱',
    bgImage: require('../assets/images/navigations/drawing_cad.png'),
    accent: '#6A5ACD', 
    accentBg: '#F0E8FF',
    slogan: ['Metals, polymers & ceramics.', 'Discover material properties.'],
  },
  {
    name: 'Management',
    label: 'Production Management',
    component: ProductionManagement,
    emoji: '📋',
    bgImage: require('../assets/images/navigations/drawing_cad.png'),
    wide: true,
    accent: '#854F0B', 
    accentBg: '#FAEEDA',
    slogan: ['5S, Kaizen & more.', 'Streamline your workflow.'],
  },
  {
    name: 'MCQ',
    label: '500 Q&A Practice',
    component: MCQ,
    emoji: '📝',
    bgImage: require('../assets/images/navigations/drawing_cad.png'),
    accent: '#3B82F6', 
    accentBg: '#DBEAFE',
    slogan: ['Test your knowledge.', 'Practice makes perfect.'],
  }
];

// ── Navigation Content ──
function MainStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home_Main" component={NavigationMain} />
        {AllScreens.map(screen => (
          <Stack.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
          />
        ))}
        {/* Simulator Screens */}
        <Stack.Screen name="AutoCadPractice" component={AutoCadPractice} />
        <Stack.Screen name="FreehandTurning" component={FreehandTurning} />
        <Stack.Screen name="CncSimulatorPro" component={CncSimulatorPro} />
        <Stack.Screen name="RoboticSimulator" component={RoboticSimulator} />
        <Stack.Screen name="ScientificCalculator" component={ScientificCalculator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Main stack ──
export default MainStack;

// ── Styles ──
const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#F8F9FC' 
  },
  scroll: { 
    flex: 1, 
    backgroundColor: '#F8F9FC' 
  },
  body: { 
    padding: 16, 
    paddingBottom: 32 
  },
  bodyList: { 
    paddingHorizontal: 12 
  },

  // Header Styles with Background Image
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  headerBackground: {
    width: '100%',
    height: 120,
  },
  headerBackgroundImage: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerProfileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0EEF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8E6F0',
  },
  headerProfileEmoji: {
    fontSize: 20,
  },

  // Featured Section Styles
  featuredSection: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  featuredHeaderLeft: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  featuredSubtitle: {
    fontSize: 11,
    color: '#9AA0B5',
  },
  featuredSeeAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F0EEF5',
  },
  featuredSeeAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#534AB7',
  },
  featuredFlatList: {
    flexGrow: 0,
  },
  featuredList: {
    paddingHorizontal: 0, // Remove fixed padding
    gap: 16, // Add gap between items
  },
  featuredCardWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginRight: 0, // Remove marginRight
  },
  featuredCard: {
    flex: 1, // Make card fill the wrapper
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EEF5',
  },
  featuredImage: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  featuredImageStyle: {
    borderRadius: 0,
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 3,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1,
  },
  featuredEmojiContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredEmoji: {
    fontSize: 40,
    zIndex: 2,
  },
  featuredColorBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 2,
  },
  featuredContent: {
    padding: 12,
  },
  featuredName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 3,
  },
  featuredDesc: {
    fontSize: 11,
    color: '#9898AA',
    lineHeight: 14,
    marginBottom: 6,
  },
  featuredTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  featuredTagText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  featuredDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  featuredDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  featuredDotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
  },

  // Simulator Grid Section Styles
  simulatorSection: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  simulatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  simulatorHeaderLeft: {
    flex: 1,
  },
  simulatorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  simulatorSubtitle: {
    fontSize: 11,
    color: '#9AA0B5',
  },
  simulatorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  simulatorGridItem: {
    width: '31.33%',
    marginBottom: 8,
    marginRight: '2%',
  },
  simulatorGridItemLast: {
    marginRight: 0,
  },
  simulatorCardWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  simulatorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0EEF5',
  },
  simulatorImage: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  simulatorImageStyle: {
    borderRadius: 0,
  },
  simulatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  simulatorBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 3,
  },
  simulatorBadgeText: {
    color: '#FFFFFF',
    fontSize: 6,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  simulatorEmoji: {
    fontSize: 28,
    zIndex: 2,
  },
  simulatorColorBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 2,
  },
  simulatorContent: {
    padding: 8,
  },
  simulatorName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  simulatorDesc: {
    fontSize: 9,
    color: '#9898AA',
    lineHeight: 12,
    marginBottom: 4,
  },
  simulatorTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  simulatorTagText: {
    fontSize: 7,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Toolbox Styles
  toolbox: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  toolboxLeft: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  toolboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E6F0',
    backgroundColor: '#F8F7FD',
  },
  toolboxBtnIcon: { 
    fontSize: 14, 
    color: '#534AB7' 
  },
  toolboxBtnText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#534AB7' 
  },
  
  searchWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E8E6F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1A2E',
    backgroundColor: '#FFFFFF',
  },

  sectionLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#B0B0C0', 
    letterSpacing: 1.5, 
    marginBottom: 12, 
    paddingLeft: 4 
  },

  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12, 
    marginBottom: 12 
  },
  list: { 
    flexDirection: 'column' 
  },

  card: { 
    width: width < 768 ? '48%' : '30%',
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#F0EEF5', 
    overflow: 'hidden',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardWide: { 
    width: '100%', 
    flexDirection: 'row', 
    marginBottom: 12,
    borderRadius: 16,
  },
  cardImg: { 
    height: 110, 
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'relative',
    overflow: 'hidden',
  },
  cardImageStyle: {
    borderRadius: 0,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  cardImgWide: { 
    width: 130, 
    height: 130, 
    flexShrink: 0,
    borderRadius: 16,
  },
  cardList: { 
    width: '100%', 
    flexDirection: 'row',
    borderRadius: 16,
  },
  cardListFull: { 
    width: '100%', 
    flexDirection: 'row', 
    marginBottom: 10,
    borderRadius: 16,
  },
  cardImgList: { 
    width: 100, 
    height: 100, 
    flexShrink: 0,
    borderRadius: 16,
  },
  cardEmoji: { 
    fontSize: 34,
    zIndex: 2,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  colorBar: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 4,
    zIndex: 2,
  },
  cardBody: { 
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  cardBodyWide: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  cardBodyList: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  cardContent: { 
    flex: 1,
    marginRight: 8,
  },
  cardName: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1A1A2E', 
    marginBottom: 4 
  },
  cardDesc: { 
    fontSize: 11, 
    color: '#9898AA', 
    lineHeight: 15 
  },
  cardArrow: { 
    fontSize: 20,
    marginTop: 4,
    alignSelf: 'flex-start',
  },

  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60 
  },
  emptyStateEmoji: { 
    fontSize: 32, 
    marginBottom: 12 
  },
  emptyStateTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1A1A2E' 
  },
  emptyStateText: { 
    fontSize: 13, 
    color: '#9AA0B5', 
    marginTop: 4 
  },
});