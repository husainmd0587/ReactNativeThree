import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {COMMANDS} from '../engine/commands';

/**
 * Command reference.
 *
 * The list is generated from the registry rather than written out by hand, so
 * a command that exists is documented and a command that is renamed cannot
 * leave a page behind that describes something else. The prompts come from the
 * same objects the runner uses, which means the wording here is the wording the
 * user will actually see.
 */
export default function CommandReferenceScreen() {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    return COMMANDS.filter(c => {
      if (!q) return true;
      return (
        c.name.includes(q) || c.aliases.some(a => a.toUpperCase().includes(q))
      );
    }).map(c => ({
      key: c.name,
      name: c.name,
      // Only the prompts the first pass asks for: a repeating command's later
      // passes reuse the same list.
      prompts: c.prompts.length
        ? c.prompts.map(p => p.text).join(' ')
        : 'runs immediately',
      aliases: c.aliases,
    }));
  }, [query]);

  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Filter commands"
          placeholderTextColor="#5c6b80"
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.search}
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={r => r.key}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            {item.aliases.length ? (
              <Text style={styles.aliases}>{item.aliases.join('  ')}</Text>
            ) : null}
            <Text style={styles.prompts}>{item.prompts}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.row}>
            <Text style={styles.aliases}>No command matches that.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0b1017'},
  searchRow: {padding: 10, borderBottomWidth: 1, borderBottomColor: '#1b2432'},
  search: {color: '#e8eef7', fontSize: 15, paddingVertical: 8},
  list: {padding: 10},
  row: {paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#141c27'},
  name: {color: '#8fd3ff', fontSize: 14},
  aliases: {color: '#5c6b80', fontSize: 11, marginTop: 1},
  prompts: {color: '#cfe0f2', fontSize: 12, marginTop: 3},
});
