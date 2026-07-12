

import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';

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
      style={[
        styles.card,
        { borderColor: item.id % 2 ? '#fcbd93' : '#66fd66' },
      ]}
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
                (difficultyColor[item.difficulty] || COLORS.subText) + '15',
            },
          ]}
        >
          <Text
            style={[
              styles.difficultyText,
              { color: difficultyColor[item.difficulty] || COLORS.subText },
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
          <Text style={styles.answerLabel}>Answer</Text>
          <Text style={styles.answer}>{item.answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

/**
 * block: the CMS block object (type === 'qa_list')
 * Called from BlockRenderer's switch like:
 *   case 'qa_list':
 *     return <QuestionAnswerBlock key={block._id} block={block} />;
 */
export default function QuestionAnswerBlock({ block }) {
  const data = block?.data || {};
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const PAGE_SIZE = data.pageSize || 50;

  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  const listRef = useRef(null);

  const filteredData = useMemo(() => {
    return questions.filter(item => {
      const q = (item.question || '').toLowerCase();
      const t = (item.topic || '').toLowerCase();
      const s = search.toLowerCase();
      const matchSearch = q.includes(s) || t.includes(s);
      const matchDifficulty =
        difficulty === 'All' || item.difficulty === difficulty;
      return matchSearch && matchDifficulty;
    });
  }, [questions, search, difficulty]);

  // reset to page 1 whenever filters actually change the result set
  const filterKey = `${search}|${difficulty}`;
  const prevFilterKey = useRef(filterKey);
  if (prevFilterKey.current !== filterKey) {
    prevFilterKey.current = filterKey;
    if (currentPage !== 1) setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage, PAGE_SIZE]);

  const goToPage = useCallback(page => {
    setCurrentPage(page);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const difficultyTabs = ['All', 'Easy', 'Medium', 'Hard'];

  const startQ = filteredData.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endQ = Math.min(currentPage * PAGE_SIZE, filteredData.length);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>{data.title || 'Q&A'}</Text>
        {!!data.subtitle && (
          <Text style={styles.subHeading}>{data.subtitle}</Text>
        )}
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
              difficulty === item && styles.activeFilter,
            ]}
            onPress={() => setDifficulty(item)}
          >
            <Text
              style={[
                styles.filterText,
                difficulty === item && { color: '#fff' },
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>
          Showing Q{startQ}–{endQ} of {filteredData.length}
        </Text>
        <Text style={styles.statsNumber}>{filteredData.length}</Text>
      </View>

      {/* Non-scrolling: parent ScrollView/BlockRenderer list owns scroll.
          Swap to a scrolling FlatList only if this block is rendered standalone. */}
      <FlatList
        ref={listRef}
        data={pagedData}
        keyExtractor={item => item.id.toString()}
        scrollEnabled={false}
        contentContainerStyle={{ paddingBottom: 10, paddingTop: 10 }}
        renderItem={({ item }) => <QuestionCard item={item} />}
      />

      {totalPages > 1 && (
        <View style={styles.pageIndexWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pageIndexRow}
          >
            <TouchableOpacity
              style={[
                styles.pageBtn,
                styles.pageBtnArrow,
                currentPage === 1 && styles.pageBtnDisabled,
              ]}
              onPress={() => currentPage > 1 && goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Text style={styles.pageArrowText}>‹</Text>
            </TouchableOpacity>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              const pageStart = (page - 1) * PAGE_SIZE + 1;
              const pageEnd = Math.min(page * PAGE_SIZE, filteredData.length);
              const isActive = page === currentPage;
              return (
                <TouchableOpacity
                  key={page}
                  style={[styles.pageBtn, isActive && styles.pageBtnActive]}
                  onPress={() => goToPage(page)}
                >
                  <Text
                    style={[
                      styles.pageBtnLabel,
                      isActive && styles.pageBtnLabelActive,
                    ]}
                  >
                    {pageStart}–{pageEnd}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.pageBtn,
                styles.pageBtnArrow,
                currentPage === totalPages && styles.pageBtnDisabled,
              ]}
              onPress={() =>
                currentPage < totalPages && goToPage(currentPage + 1)
              }
              disabled={currentPage === totalPages}
            >
              <Text style={styles.pageArrowText}>›</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  subHeading: {
    fontSize: 14,
    color: COLORS.subText,
    marginTop: -2,
  },
  searchContainer: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    paddingHorizontal: 18,
    height: 40,
    fontSize: 15,
    color: COLORS.text,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
  },
  statsCard: {
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: '#EEF4FF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsTitle: {
    color: '#5B6475',
    fontSize: 13,
    fontWeight: '500',
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 22,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
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
    paddingVertical: 6,
    borderRadius: 20,
  },
  topicText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  difficultyText: {
    fontWeight: '700',
    fontSize: 12,
  },
  question: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 20,
  },
  answerBox: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 2,
  },
  answerLabel: {
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
    fontSize: 13,
  },
  answer: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 24,
  },
  pageIndexWrapper: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
  },
  pageIndexRow: {
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  pageBtnArrow: {
    minWidth: 36,
    paddingHorizontal: 8,
  },
  pageBtnActive: {
    backgroundColor: COLORS.primary,
  },
  pageBtnDisabled: {
    opacity: 0.35,
  },
  pageBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.subText,
  },
  pageBtnLabelActive: {
    color: '#fff',
  },
  pageArrowText: {
    fontSize: 20,
    color: COLORS.primary,
    lineHeight: 22,
    fontWeight: '700',
  },
});