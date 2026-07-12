import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const ItemCard = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Thumbnail */}

      {item.thumbnail ? (
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.image}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.icon}>
            {item.icon || "📚"}
          </Text>
        </View>
      )}

      {/* Body */}

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>

        {!!item.description && (
          <Text numberOfLines={2} style={styles.description}>
            {item.description}
          </Text>
        )}

        {/* Meta */}

        <View style={styles.metaRow}>

          {!!item.difficulty && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {item.difficulty}
              </Text>
            </View>
          )}

          {!!item.duration && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                ⏱ {item.duration}
              </Text>
            </View>
          )}

          {!!item.totalTopics && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                📖 {item.totalTopics} Topics
              </Text>
            </View>
          )}

        </View>
      </View>

      {/* Arrow */}

      <Text style={styles.arrow}>›</Text>

    </TouchableOpacity>
  );
};

export default ItemCard;

const styles = StyleSheet.create({

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  image: {
    width: 90,
    height: 90,
  },

  placeholder: {
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F3F3",
  },

  icon: {
    fontSize: 34,
  },

  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },

  description: {
    fontSize: 13,
    color: "#777",
    marginTop: 5,
    lineHeight: 18,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },

  chip: {
    backgroundColor: "#F2F2F2",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 6,
  },

  chipText: {
    fontSize: 11,
    color: "#555",
    fontWeight: "600",
  },

  arrow: {
    fontSize: 28,
    color: "#999",
    paddingHorizontal: 15,
  },

});