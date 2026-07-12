import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
  View,
} from "react-native";

import { useBlock } from "../../../utils/api/hooks/useContent";
import ProgressRing from "../../../utils/components/common/progressBar";
import BlockRenderer from "./components/BlockRenderer";

const ItemScreen = ({ navigation, route }) => {
  const {
    item,
    rootBlocks,
    accent,
    rootId,
    needToFetchBlock = false,
  } = route.params;

  const {
    data,
    error,
    isLoading,
    isSuccess,
  } = useBlock(rootId, item.id, {
    enabled: needToFetchBlock,
  });

  // Use fetched item if available, otherwise use route item
  const currentItem = needToFetchBlock && isSuccess && data ? data : item;

  if (needToFetchBlock && isLoading) return <ProgressRing/>

  if (needToFetchBlock && error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>
          Failed to load content.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{currentItem.title}</Text>

        {!!currentItem.description && (
          <Text style={styles.description}>
            {currentItem.description}
          </Text>
        )}

        <BlockRenderer
          blocks={currentItem.blocks || []}
          navigation={navigation}
          accent={accent || "#D9534F"}
          rootBlocks={rootBlocks}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ItemScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F7' },
  content: { padding: 5, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#222' },
  description: { marginTop: 8, color: '#666', lineHeight: 22, marginBottom: 20 },
});