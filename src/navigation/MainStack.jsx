import React, { useState, useMemo, useCallback,useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  StatusBar, ScrollView, TextInput, FlatList, Dimensions 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import storage from '../utils/store/localStorage/asynStorage.js';
import ProgressRing from '../utils/components/common/progressBar.js';

import HomeCad from  '../mechanical_engineering/Edand3D/index.js'
import HomeTurningMilling from '../turning_milling/index.js';
import AllMeasuringTools from '../mechanical_engineering/measurings/allmeasuringTools';
import MetalWeightCalculator from '../mechanical_engineering/calculator/home';
import MachineElements from '../mechanical_engineering/machine_elements/index.js';
import Robots from '../mechanical_engineering/robots/index.js';
import Workshop from '../mechanical_engineering/workshop/index.js';
import AutomobileHome from '../mechanical_engineering/automobile/index.js';
import MaterialsHome from '../mechanical_engineering/materials/index.js';
import ProductionManagement from '../mechanical_engineering/management/management';
import MCQ from '../mechanical_engineering/management/mcq/index.js';
import Testing,{SliderExample} from '../mechanical_engineering/testing/testing2.js'

import { Header } from '../components/common';

const Stack = createNativeStackNavigator();
const { width } = Dimensions.get('window');

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
      <View style={[imageStyles, { backgroundColor: screen.accentBg }]}>
        <Text style={styles.cardEmoji}>{screen.emoji}</Text>
        <View style={[styles.colorBar, { backgroundColor: screen.accent }]} />
      </View>

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

  const handleNavigate = useCallback((screen) => {
    navigation.navigate(screen);
  }, [navigation]);

  const renderModuleItem = useCallback(({ item: screen }) => (
    <ModuleCard
      screen={screen}
      onPress={() => handleNavigate(screen.name)}
      listView={listView}
    />
  ), [listView, handleNavigate]);

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

      <Header
        title="ME Studio"
        subtitle="Mechanical Engineering · Learn Easily"
        drawerItems={drawerItems}
        onDrawerItemPress={(item) => handleNavigate(item.route)}
      />

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
    accent: '#FFA500', 
    accentBg: '#FFF5E6',
    slogan: ['Quick calculations.', 'Material weight & more.'],
  },
  {
    name:'AllWorkShops',
    label:'All WorkShops',
    component: Workshop,
    emoji: '🔧',
    accent: '#5CB85C', 
    accentBg: '#EAFDEB',
    slogan: ['Welding, smithy & more.', 'Your workshop reference.'],
  },
  {
    name:'Automobile',
    label:'Automobile Engineering',
    component: AutomobileHome,
    emoji: '🚗',
    accent: '#FF5733', 
    accentBg: '#FFEDE8',
    slogan: ['Engines, systems & design.', 'Explore automobile engineering.'],
  },
  {
    name:'Materials',
    label:'Materials Science',
    component: MaterialsHome,
    emoji: '🧱',
    accent: '#6A5ACD', 
    accentBg: '#F0E8FF',
    slogan: ['Metals, polymers & ceramics.', 'Discover material properties.'],
  },
  {
    name: 'Management',
    label: 'Production Management',
    component: ProductionManagement,
    emoji: '📋',
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
    accent: '#3B82F6', 
    accentBg: '#DBEAFE',
    slogan: ['Test your knowledge.', 'Practice makes perfect.'],
  },
    {
    name: 'Testing',
    label: 'Testing',
    component: Testing,
    emoji: '📝',
    accent: '#3B82F6', 
    accentBg: '#ec138b',
  },{
    name: 'SliderExample',
    label: 'Slider Example',
    component: SliderExample,
    emoji: '🔽',
    accent: '#3B82F6', 
    accentBg: '#35b3ee',
  }
];

// ── Navigation Content ──
function MainStackContent() {
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ── Main stack ──
export default function MainStack() {
  return <MainStackContent />;
}

// ── Styles ──
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, backgroundColor: '#F4F3F8' },
  body: { padding: 14, paddingBottom: 32 },

  toolbox: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EBEBEB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolboxLeft: { flexDirection: 'row', alignItems: 'center' },
  toolboxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D9D6EA',
    backgroundColor: '#F7F6FD',
  },
  toolboxBtnIcon: { fontSize: 14, color: '#534AB7' },
  toolboxBtnText: { fontSize: 12, fontWeight: '700', color: '#534AB7' },
  searchWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EBEBEB',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#DADDE4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A2E',
    backgroundColor: '#FFFFFF',
  },

  sectionLabel: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: '#AAAAAA', 
    letterSpacing: 1.4, 
    marginBottom: 10, 
    paddingLeft: 2 
  },

  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginBottom: 10 
  },
  list: { 
    flexDirection: 'column' 
  },
  bodyList: { 
    paddingHorizontal: 12 
  },

  card: { 
    width: width < 768 ? '48%' : '30%',
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    borderWidth: 0.5, 
    borderColor: '#E8E6F0', 
    overflow: 'hidden',
    minWidth: 140,
  },
  cardWide: { 
    width: '100%', 
    flexDirection: 'row', 
    marginBottom: 20 
  },
  cardImg: { 
    height: 90, 
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'relative' 
  },
  cardImgWide: { 
    width: 110, 
    height: 'auto', 
    flexShrink: 0 
  },
  cardList: { 
    width: '100%', 
    flexDirection: 'row' 
  },
  cardListFull: { 
    width: '100%', 
    flexDirection: 'row', 
    marginBottom: 10 
  },
  cardImgList: { 
    width: 92, 
    height: 92, 
    flexShrink: 0 
  },
  cardEmoji: { 
    fontSize: 30 
  },
  colorBar: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 3 
  },
  cardBody: { 
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  cardBodyWide: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 14 
  },
  cardBodyList: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 14, 
    paddingVertical: 12 
  },
  cardContent: { 
    flex: 1,
    marginRight: 8,
  },
  cardName: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#1A1A2E', 
    marginBottom: 3 
  },
  cardDesc: { 
    fontSize: 10, 
    color: '#9898AA', 
    lineHeight: 14 
  },
  cardArrow: { 
    fontSize: 18,
    marginTop: 6,
    alignSelf: 'flex-start',
  },

  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 40 
  },
  emptyStateEmoji: { 
    fontSize: 28, 
    marginBottom: 8 
  },
  emptyStateTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#1A1A2E' 
  },
  emptyStateText: { 
    fontSize: 12, 
    color: '#9AA0B5', 
    marginTop: 4 
  },
});