import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import YouTubeVideo from './youtubeVideos';

const YoutubeVideoScreen = ({ navigation, route }) => {
  const { videoId, url, title = 'Video Player',moreVideos=[{}] } = route?.params || {};


  return (
    <SafeAreaView style={styles.container}>
      <YouTubeVideo
        videoId={videoId}
        url={url}
        autoPlay={true}
        fullWidth={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default YoutubeVideoScreen;