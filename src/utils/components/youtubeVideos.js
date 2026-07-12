import React, { useMemo } from 'react';
import { View, StyleSheet,useWindowDimensions } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

const getYoutubeVideoId = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();

  const directMatch = trimmedUrl.match(/(?:youtube\.com\/shorts\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (directMatch?.[1]) {
    return directMatch[1];
  }

  const queryMatch = trimmedUrl.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (queryMatch?.[1]) {
    return queryMatch[1];
  }

  const shortMatch = trimmedUrl.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch?.[1]) {
    return shortMatch[1];
  }

  return null;
};

const YouTubeVideo = ({
  videoId,
  url,
  autoPlay = false,
  onChangeState,
  mute = false,
  horizontalPadding = 0,
  fullWidth = true,
  initialPlayerParams = {},
}) => {
    
  const { width } = useWindowDimensions();
  const playerWidth = fullWidth ? width : Math.max(width - horizontalPadding * 2, 200);
  const playerHeight = playerWidth * 9 / 16;
  const finalVideoId = useMemo(() => {
    // Prefer provided ID
    if (
      typeof videoId === 'string' &&
      videoId.trim().length === 11
    ) {
      return videoId.trim();
    }

    // Fallback to URL extraction
    return getYoutubeVideoId(url);
  }, [videoId, url]);

  if (!finalVideoId) {
    return null;
  }

  return (
    <View style={styles.container}>
      <YoutubePlayer
        width={playerWidth}
        height={playerHeight}
        play={autoPlay}
        videoId={finalVideoId}
        onChangeState={onChangeState}
        mute={mute}
        initialPlayerParams={initialPlayerParams }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical:10,
  },
});

export default YouTubeVideo;