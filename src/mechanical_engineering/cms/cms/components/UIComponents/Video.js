import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import YouTubeVideo from '../../../../../utils/components/youtubeVideos'

const Video = ({url,title=""}) => {
  return (
     <View>
         <YouTubeVideo
    url={url}
   />
       <Text style={styles.title}>{title}</Text>
     </View>
  )
}

export default Video

const styles = StyleSheet.create({
  title:{
    marginBottom:5,
    color:'#8dabfd99',
    fontWeight:'bold',
    fontSize:18
  }
})