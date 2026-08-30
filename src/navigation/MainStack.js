import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ImageBackground, 
  StatusBar, ScrollView, TextInput, FlatList, Dimensions, Animated 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import storage from '../utils/store/localStorage/asynStorage.js';
import ProgressRing from '../utils/components/common/progressBar.js';
import Profile from '../components/screens/profile.js';
import Notification from '../components/screens/notification.js'

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
import FreehandTurning from '../turning_milling/customScreens/freehandTurning/FreehandTurning.js';
import CncSimulatorPro from '../turning_milling/customScreens/cnc/CncSimulatorPro.js';
import {RoboticsNavigator} from '../mechanical_engineering/robots/customScreens/robotics/navigation/RoboticsNavigator.jsx';
import ScientificCalculator from '../mechanical_engineering/calculator/allCalculators/ScientificCalculator.js';

import Header from '../components/common/Header.jsx'

const Stack = createNativeStackNavigator();
const { width } = Dimensions.get('window');

// ── Welcome Banner Component ──
const WelcomeBanner = React.memo(() => (
  <View style={styles.welcomeBanner}>
    <View style={styles.welcomeTextWrap}>
      <Text style={styles.welcomeTitle}>Welcome back, Engineer! 👋</Text>
      <Text style={styles.welcomeSubtitle}>
        Learn, practice and master mechanical{'\n'}engineering with 3D & simulations.
      </Text>
    </View>
    <View style={styles.welcomeImageWrap}>
      <ImageBackground
        source={require('../assets/images/icons/banner.png')}
        style={styles.welcomeImage}
        imageStyle={styles.welcomeImageStyle}
        resizeMode="contain"
      />
    </View>
  </View>
));

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
        style={[styles.featuredCard, { backgroundColor: simulator.accent }]}
        onPress={() => onPress(simulator.route)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.featuredTextWrap}>
          <Text style={styles.featuredName} numberOfLines={2}>{simulator.label}</Text>
          <Text style={styles.featuredDesc} numberOfLines={2}>{simulator.desc}</Text>
        </View>
        <Image
          source={simulator.bgImage}
          style={styles.featuredImage}
          resizeMode="cover"
        />
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
          <Text style={styles.featuredBadgeIcon}>⭐</Text>
          <Text style={styles.featuredTitle}>Special Simulators</Text>
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

// ── Simulator Grid Component (3-per-row, full-bleed image cards) ──
const SimulatorGrid = React.memo(({ simulators, onSimulatorPress }) => {
  if (simulators.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionLabel}>SIMULATORS</Text>
      <View style={styles.grid}>
        {simulators.map((simulator) => (
          <SimulatorCard
            key={simulator.route}
            simulator={simulator}
            onPress={onSimulatorPress}
          />
        ))}
      </View>
    </>
  );
});

// ── Simulator Card Component (Grid, full-cover image) ──
const SimulatorCard = React.memo(({ simulator, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  return (
    <Animated.View style={[styles.simCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.simCardTouchable}
        onPress={() => onPress(simulator.route)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={simulator.bgImage}
          style={styles.simCardImage}
          imageStyle={styles.simCardImageStyle}
          resizeMode="cover"
        >
          <View style={styles.simCardBadge}>
            <Text style={styles.simCardBadgeText}>{simulator.emoji}</Text>
          </View>

          <View style={styles.simCardTextWrap}>
            <Text style={styles.simCardName} numberOfLines={2}>{simulator.label}</Text>
            <Text style={styles.simCardDesc} numberOfLines={2}>{simulator.desc}</Text>
          </View>

          <View style={[styles.simCardColorBar, { backgroundColor: simulator.accent }]} />
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── Module card component ──
const ModuleCard = React.memo(({ screen, onPress, wide = false, listView = false }) => {
  const horizontal = wide || listView;

  if (horizontal) {
    return (
      <TouchableOpacity
        style={[
          styles.cardHorizontal,
          { borderColor: screen.accent, backgroundColor: screen.accentBg || '#FFFFFF' },
          wide && styles.cardWide,
          listView && styles.cardListItem,
        ]}
        onPress={onPress}
        activeOpacity={0.82}
      >
        <ImageBackground
          source={screen.bgImage}
          style={styles.cardIconWrapHorizontal}
          imageStyle={styles.cardIconImage}
          resizeMode="cover"
        >
          <View style={styles.cardEmojiBadgeSmall}>
            <Text style={styles.cardEmojiBadgeTextSmall}>{screen.emoji}</Text>
          </View>
        </ImageBackground>

        <View style={styles.cardBodyHorizontal}>
          <Text style={styles.cardNameHorizontal} numberOfLines={1}>{screen.label}</Text>
          <Text style={styles.cardDescHorizontal} numberOfLines={2}>{screen.desc}</Text>
        </View>

        <View style={[styles.colorBarVertical, { backgroundColor: screen.accent }]} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: screen.accent, backgroundColor: screen.accentBg || '#FFFFFF' }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <ImageBackground
        source={screen.bgImage}
        style={styles.cardIconWrap}
        imageStyle={styles.cardIconImage}
        resizeMode="cover"
      >
        <View style={styles.cardEmojiBadge}>
          <Text style={styles.cardEmojiBadgeText}>{screen.emoji}</Text>
        </View>
      </ImageBackground>

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{screen.label}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{screen.desc}</Text>
      </View>

      <View style={[styles.colorBar, { backgroundColor: screen.accent }]} />
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
      bgImage: require('../assets/images/icons/cadSim.png'),
      accent: '#7F77DD',
    },
    {
      route: 'FreehandTurning',
      label: 'Freehand Turning',
      desc: 'Manual lathe operation simulation',
      emoji: '🔧',
      bgImage: require('../assets/images/icons/lathSim.png'),
      accent: '#1D9E75',
    },
    {
      route: 'CncSimulatorPro',
      label: 'CNC Simulator Pro',
      desc: 'Professional CNC programming simulation',
      emoji: '⚙️',
      bgImage: require('../assets/images/icons/cncSim.png'),
      accent: '#378ADD',
    },
    {
      route: 'RoboticSimulator',
      label: 'Robotics Simulator',
      desc: 'Program and simulate robot arms',
      emoji: '🤖',
      bgImage: require('../assets/images/icons/robotSim.png'),
      accent: '#D4537E',
    },
    {
      route: 'ScientificCalculator',
      label: 'Scientific Calculator',
      desc: 'Advanced calculations for engineers',
      emoji: '🧮',
      bgImage: require('../assets/images/icons/calculatorSim.png'),
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
      <StatusBar barStyle="dark-content" backgroundColor="#ffff" />

        {/* Header */}
      <View style={styles.headerContainer}>
        <Header
          title="ME Studio"
          subtitle="Mechanical Engineering · Learn Easily"
          showViewToggle={true}
          viewMode={listView ? 'list' : 'grid'}
          onToggleViewMode={handleToggleListView}
          drawerItems={drawerItems}
          onDrawerItemPress={(item) => {
            if (item.route) navigation.navigate(item.route);
          }}
          drawerBottomItem={{
            key: 'settings',
            label: 'Settings',
            emoji: '⚙️',
          }}
          onDrawerBottomPress={(item) => {
            console.log('Bottom item pressed:', item);
          }}
          navigation={navigation}
        />
      </View>
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={[styles.body, listView && styles.bodyList]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* Welcome Banner */}
      <WelcomeBanner />

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
      
            {/* Simulators Section - 3-per-row grid, same layout as Modules */}
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

   

        {/* Special Simulators Section */}
        {/* <FeaturedSimulatorScroll 
          simulators={simulators}
          onSimulatorPress={handleSimulatorPress}
        /> */}
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
    bgImage: require('../assets/images/icons/cad.png'),
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
    bgImage: require('../assets/images/icons/cnc.png'),
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
    bgImage: require('../assets/images/icons/vernier.png'),
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
    bgImage: require('../assets/images/icons/gear.png'),
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
    bgImage: require('../assets/images/icons/robot.png'),
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
    bgImage: require('../assets/images/icons/calculator.png'),
    accent: '#FFA500', 
    accentBg: '#FFF5E6',
    slogan: ['Quick calculations.', 'Material weight & more.'],
  },
  {
    name:'AllWorkShops',
    label:'All WorkShops',
    component: Workshop,
    emoji: '🔧',
    bgImage: require('../assets/images/icons/workshop.png'),
    accent: '#5CB85C', 
    accentBg: '#EAFDEB',
    slogan: ['Welding, smithy & more.', 'Your workshop reference.'],
  },
  {
    name:'Automobile',
    label:'Automobile Engineering',
    component: AutomobileHome,
    emoji: '🚗',
    bgImage: require('../assets/images/icons/automobile.png'),
    accent: '#FF5733', 
    accentBg: '#FFEDE8',
    slogan: ['Engines, systems & design.', 'Explore automobile engineering.'],
  },
  {
    name:'Materials',
    label:'Materials Science',
    component: MaterialsHome,
    emoji: '🧱',
    bgImage: require('../assets/images/icons/materials.png'),
    accent: '#6A5ACD', 
    accentBg: '#F0E8FF',
    slogan: ['Metals, polymers & ceramics.', 'Discover material properties.'],
  },
  {
    name: 'Management',
    label: 'Production Management',
    component: ProductionManagement,
    emoji: '📋',
    bgImage: require('../assets/images/icons/production.png'),
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
    bgImage: require('../assets/images/icons/mcq.png'),
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
        {/* app utility screens that not show in ui*/}
          <Stack.Screen name="Profile" component={Profile} />
          <Stack.Screen name="Notification" component={Notification} />
        {/* related core engineering topic  */}
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
        <Stack.Screen name="RoboticSimulator" component={RoboticsNavigator} />
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

  // Welcome Banner Styles
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F2657',
    borderRadius: 20,
    paddingVertical: 20,
    paddingLeft: 20,
    paddingRight: 16,
    marginBottom: 16,
    minHeight: 150,
  },
  welcomeTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#B9C4DE',
    lineHeight: 19,
    fontWeight: '500',
  },
  welcomeImageWrap: {
    width: 130,
    height: 110,
    borderRadius: 14,
    // overflow: 'hidden',
    flexShrink: 0,
  },
  welcomeImage: {
    width: '100%',
    height: '100%',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredBadgeIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
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
    borderRadius: 16,
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
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 140,
    padding: 16,
    justifyContent: 'space-between',
  },
  featuredTextWrap: {
    zIndex: 2,
  },
  featuredName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featuredDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 15,
  },
  featuredImage: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 78,
    height: 78,
    borderRadius: 10,
    opacity: 0.95,
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
    width: width < 768 ? '31%' : '18.4%',
    height: 172,
    backgroundColor: '#FFFFFF', 
    borderRadius: 14, 
    borderWidth: 1.5, 
    overflow: 'hidden',
    minWidth: 100,
    alignItems: 'center',
  },
  cardIconWrap: {
    width: '100%',
    height: 78,
    flexShrink: 0,
  },
  cardIconImage: {
    borderRadius: 0,
  },
  cardEmojiBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  cardEmojiBadgeText: {
    fontSize: 13,
  },
  colorBar: { 
    width: '100%',
    height: 4,
    flexShrink: 0,
  },
  cardBody: { 
    flex: 1,
    width: '100%',
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#1A1A2E', 
    marginBottom: 3,
    textAlign: 'center',
  },
  cardDesc: { 
    fontSize: 10, 
    color: '#9898AA', 
    lineHeight: 13,
    textAlign: 'center',
  },

  // Horizontal card variant (used for wide modules and list view)
  cardHorizontal: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  cardWide: {
    marginBottom: 12,
  },
  cardListItem: {
    marginBottom: 10,
  },
  cardIconWrapHorizontal: {
    width: 70,
    height: 70,
    flexShrink: 0,
  },
  cardEmojiBadgeSmall: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  cardEmojiBadgeTextSmall: {
    fontSize: 10,
  },
  cardBodyHorizontal: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardNameHorizontal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 3,
  },
  cardDescHorizontal: {
    fontSize: 11,
    color: '#9898AA',
    lineHeight: 15,
  },
  colorBarVertical: {
    width: 4,
    alignSelf: 'stretch',
  },

  // Simulator grid card (full-bleed image, same slot size as module cards)
  simCard: {
    width: width < 768 ? '48%' : '31%',
    height: 120,
    minWidth: 100,
  },
  simCardTouchable: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  simCardImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  simCardImageStyle: {
    borderRadius: 0,
  },
  simCardBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  simCardBadgeText: {
    fontSize: 12,
  },
  simCardTextWrap: {
    height:'100%',
    justifyContent:'space-between',
    paddingHorizontal: 5,
    paddingBottom: 5,
    zIndex: 2,
  },
  simCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    maxWidth:'60%'
  },
  simCardDesc: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 12,
  },
  simCardColorBar: {
    height: 3,
    width: '100%',
    zIndex: 2,
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