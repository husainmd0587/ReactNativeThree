import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// One command tile. Unimplemented commands render disabled with a
// "Coming soon" badge instead of pretending to work (spec: never fake it).
const CommandCard = React.memo(({ command, onPress }) => {
  const disabled = !command.implemented;

  return (
    <TouchableOpacity
      style={[styles.card, disabled && styles.cardDisabled]}
      onPress={() => !disabled && onPress(command)}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.cardName, disabled && styles.cardNameDisabled]}>
          {command.name}
        </Text>
        {disabled && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Coming soon</Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.cardDesc, disabled && styles.cardDescDisabled]}
        numberOfLines={2}
      >
        {command.description}
      </Text>
    </TouchableOpacity>
  );
});

// A labeled section of command cards.
const CategorySection = React.memo(({ category, onSelectCommand }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{category.label.toUpperCase()}</Text>
    <View style={styles.grid}>
      {category.commands.map((command) => (
        <CommandCard key={command.id} command={command} onPress={onSelectCommand} />
      ))}
    </View>
  </View>
));

export default function CommandList({ categories, onSelectCommand }) {
  return (
    <>
      {categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          onSelectCommand={onSelectCommand}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingLeft: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48%',
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#E8E6F0',
    padding: 14,
    gap: 6,
  },
  cardDisabled: {
    backgroundColor: '#F7F7F9',
    borderColor: '#EDEDF1',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  cardNameDisabled: {
    color: '#A6A6B2',
  },
  cardDesc: {
    fontSize: 11,
    color: '#8A8A9A',
    lineHeight: 15,
  },
  cardDescDisabled: {
    color: '#B7B7C0',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#EFEFF3',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9A9AA6',
  },
});
