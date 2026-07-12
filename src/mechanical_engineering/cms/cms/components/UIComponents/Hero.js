// Hero/Hero.js
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import YouTubeVideo from '../../../../../utils/components/youtubeVideos';
import Modal3D from '../../../../../utils/components/Modal3D';
import Model3D from '../../../../../utils/components/glbPreview';

const Hero = ({ thumbnail, title, subtitle, videoUrl, modal3D, modelUrl }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  if (thumbnail) {
    return (
      <View style={styles.hero}>
        <Image source={{ uri: thumbnail }} style={styles.heroImage} />
        <Text style={styles.heroTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.heroSub}>{subtitle}</Text>}
      </View>
    );
  }

  if (videoUrl) {
    return <YouTubeVideo url={videoUrl} autoPlay={true} fullWidth={true} />;
  }

  if (modelUrl) {
    return (
      <View style={styles.hero}>
        <View style={styles.previewCard}>
          <View style={styles.previewFrame}>
            <Model3D style={styles.previewModel} modelUrl={modelUrl} />
            <TouchableOpacity
              style={styles.previewOverlayButton}
              activeOpacity={0.9}
              onPress={() => setIsModalVisible(true)}
            >
              <Text style={styles.previewButtonText}>Show Model Preview</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.heroTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.heroSub}>{subtitle}</Text>}

        <Modal3D
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          title={title}
          modelUrl={modelUrl}
          height="90%"
        />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  // hero: { marginBottom: 20 },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop:5,
    color: '#222',
    marginHorizontal: 5,
    backgroundColor:'#d4c5c5ed',
    paddingHorizontal:10,
    borderRadius:5
  },
  heroSub: {
    color: '#777',
    fontSize: 14,
    marginHorizontal: 5,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#a6bef7',
    padding: 2,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  previewFrame: {
    height: 260,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
    alignSelf: 'center',
  },
  previewModel: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  previewOverlayButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(25,255,255,0.55)',
  },
  previewButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default Hero;