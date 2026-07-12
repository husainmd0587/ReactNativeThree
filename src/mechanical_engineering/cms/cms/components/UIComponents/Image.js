// ResourceList/Image.js

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image as RNImage,
  Modal,
  StyleSheet,
  StatusBar,
} from "react-native";

const Image = ({ title, size, url, imageUrl }) => {
  const [visible, setVisible] = useState(false);

  const source = { uri: imageUrl || url };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => setVisible(true)}
      >
        <RNImage
          source={source}
          style={styles.preview}
          resizeMode="cover"
        />

        <View style={styles.badge}>
          <Text style={styles.badgeText}>🖼</Text>
        </View>

        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            <Text style={styles.meta}>🖼 Image • {size}</Text>
          </View>

          <View style={styles.previewButton}>
            <Text style={styles.previewButtonText}>Show Full Preview</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Full Preview */}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <StatusBar hidden />

        <TouchableOpacity
          activeOpacity={1}
          style={styles.modal}
          onPress={() => setVisible(false)}
        >
          <RNImage
            source={source}
            style={styles.fullImage}
            resizeMode="contain"
          />

          <View style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 10,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ECECEC",
    elevation: 2,
  },

  preview: {
    width: "100%",
    height: 190,
    backgroundColor: "#F4F4F4",
  },
  previewButton: {
  backgroundColor: "#2563EB",
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 8,
  marginLeft: 12,
},
previewButtonText: {
  color: "#fff",
  fontSize: 12,
  fontWeight: "700",
},
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },

  badgeText: {
    color: "#fff",
    fontSize: 13,
  },

overlay: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: "rgba(0, 0, 0, 0.55)",
},

overlayContent: {
  flex: 1,
  marginRight: 10,
},

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  meta: {
    fontSize: 15,
    color: "#777",
  },

  zoomButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EDF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },

  zoomIcon: {
    fontSize: 18,
    color: "#2563EB",
  },

  modal: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  fullImage: {
    width: "100%",
    height: "85%",
  },

  close: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  closeText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
});

export default Image;