// QuestionAnswerScreen.jsx

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';

import { MCQ } from './mcqData'

const COLORS = {
  bg: '#FFFFFF',
  card: '#F8FAFC',
  primary: '#2563EB',
  text: '#111827',
  subText: '#6B7280',
  border: '#E5E7EB',
  easy: '#22C55E',
  medium: '#F59E0B',
  hard: '#EF4444',
};

const difficultyColor = {
  Easy: COLORS.easy,
  Medium: COLORS.medium,
  Hard: COLORS.hard,
};

const QuestionCard = ({ item }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
    >
      <View style={styles.topRow}>
        <View style={styles.topicChip}>
          <Text style={styles.topicText}>{item.topic}</Text>
        </View>

        <View
          style={[
            styles.difficultyBadge,
            {
              backgroundColor:
                difficultyColor[item.difficulty] + '15',
            },
          ]}
        >
          <Text
            style={[
              styles.difficultyText,
              {
                color: difficultyColor[item.difficulty],
              },
            ]}
          >
            {item.difficulty}
          </Text>
        </View>
      </View>

      <Text style={styles.question}>
        Q{item.id}. {item.question}
      </Text>

      {expanded && (
        <View style={styles.answerBox}>
          <Text style={styles.answerLabel}>
            Answer
          </Text>

          <Text style={styles.answer}>
            {item.answer}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function QuestionAnswerScreen() {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('All');



  const filteredData = useMemo(() => {
    return MCQ.filter(item => {
      const matchSearch =
        item.question
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.topic
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchDifficulty =
        difficulty === 'All' ||
        item.difficulty === difficulty;

      return matchSearch && matchDifficulty;
    });
  }, [search, difficulty]);

  const difficultyTabs = [
    'All',
    'Easy',
    'Medium',
    'Hard',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 50,
        }}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.heading}>
                Mechanical Q&A
              </Text>

              <Text style={styles.subHeading}>
                Learn 500 important questions
              </Text>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                placeholder="Search question or topic..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
            </View>

            <View style={styles.filterRow}>
              {difficultyTabs.map(item => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.filterButton,
                    difficulty === item &&
                      styles.activeFilter,
                  ]}
                  onPress={() =>
                    setDifficulty(item)
                  }
                >
                  <Text
                    style={[
                      styles.filterText,
                      difficulty === item && {
                        color: '#fff',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>
                Total Questions
              </Text>

              <Text style={styles.statsNumber}>
                {filteredData.length}
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <QuestionCard item={item} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
  },

  subHeading: {
    fontSize: 14,
    color: COLORS.subText,
    marginTop: 6,
  },

  searchContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },

  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    paddingHorizontal: 18,
    height: 56,
    fontSize: 16,
    color: COLORS.text,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 18,
  },

  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 10,
  },

  activeFilter: {
    backgroundColor: COLORS.primary,
  },

  filterText: {
    color: COLORS.text,
    fontWeight: '600',
  },

  statsCard: {
    margin: 20,
    backgroundColor: '#EEF4FF',
    borderRadius: 22,
    padding: 20,
  },

  statsTitle: {
    color: '#5B6475',
    fontSize: 14,
  },

  statsNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 4,
  },

  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  topicChip: {
    backgroundColor: '#E0EAFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  topicText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 12,
  },

  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },

  difficultyText: {
    fontWeight: '700',
    fontSize: 12,
  },

  question: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 26,
  },

  answerBox: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 14,
  },

  answerLabel: {
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },

  answer: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 24,
  },
});