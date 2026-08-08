// ResourceList/ResourceList.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Modal,
  StatusBar,
  Image as RNImage,
} from 'react-native';

const ResourceList = ({ title, items = [], viewAllItem, accent, navigation }) => {
  const renderResourceItem = (resource, index) => {
    const commonProps = {
      url: resource.url,
      title: resource.title,
      size: resource.size,
      navigation,
      accent,
      thumbnail: resource.thumbnail,
      soundUrl:resource.soundUrl,
      modelConfig:resource.modelConfig
    };

    switch (resource.type) {
      case 'pdf':
        return <PDFResource key={index} {...commonProps} />;
      case 'video':
        return <VideoResource key={index} {...commonProps} />;
      case 'image':
        return <ImageResource key={index} {...commonProps} />;
      case 'mp3':
        return <AudioResource key={index} {...commonProps} />;
      case 'modal3D':
        return <ThreeDResource key={index} {...commonProps} />;
      default:
        return <DefaultResource key={index} {...commonProps} />;
    }
  };

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <Text style={styles.sectionCardTitle}>{title}</Text>
        {viewAllItem && (
          <TouchableOpacity onPress={() => navigation.push('ItemScreen', { item: viewAllItem })}>
            <Text style={[styles.viewAll, { color: accent }]}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      {items.map((res, i) => renderResourceItem(res, i))}
    </View>
  );
};

const PDFResource = ({ url, title, size, navigation }) => (
  <TouchableOpacity
    style={styles.resourceRow}
    onPress={() => navigation.navigate('PdfViewer', { pdfUrl: url, title })}
  >
    <View style={[styles.resourceIconWrap, { backgroundColor: '#FDECEA' }]}> 
      <Text style={styles.resourceIcon}>📄</Text>
    </View>
    <View style={styles.resourceContent}>
      <Text style={styles.resourceTitle}>{title}</Text>
      <Text style={styles.resourceMeta}>Open PDF • {size}</Text>
    </View>
    <Text style={styles.downloadIcon}>➥</Text>
  </TouchableOpacity>
);

const VideoResource = ({ url, title, size, navigation, thumbnail }) => (
  <TouchableOpacity
    style={styles.resourceRow}
    onPress={() => navigation.navigate('Video', { url, title })}
  >
    <View style={[styles.resourceIconWrap, { backgroundColor: '#E8F0FE' }]}> 
      <Text style={styles.resourceIcon}>▶️</Text>
    </View>
    <View style={styles.resourceContent}>
      <Text style={styles.resourceTitle}>{title}</Text>
      <Text style={styles.resourceMeta}>Video • {size}</Text>
    </View>
    <Text style={styles.downloadIcon}>➜</Text>
  </TouchableOpacity>
);

const ImageResource = ({ url, title, size }) => {
  const [visible, setVisible] = useState(false);
  const imageUri = url;

  return (
    <>
      <TouchableOpacity activeOpacity={0.9} style={styles.imageCard} onPress={() => setVisible(true)}>
        <RNImage source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
        <View style={styles.imageOverlay}>
          <View style={styles.imageOverlayContent}>
            <Text numberOfLines={1} style={styles.imageTitle}>{title}</Text>
            <Text style={styles.imageMeta}>🖼 Image • {size}</Text>
          </View>
          <View style={styles.imageButton}>
            <Text style={styles.imageButtonText}>Preview</Text>
          </View>
        </View>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <StatusBar hidden />
        <TouchableOpacity activeOpacity={1} style={styles.modal} onPress={() => setVisible(false)}>
          <RNImage source={{ uri: imageUri }} style={styles.fullImage} resizeMode="contain" />
          <View style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const AudioResource = ({ url, title, size, navigation }) => (
  <TouchableOpacity
    style={styles.resourceRow}
    onPress={() => navigation.navigate('AudioPlayer', { url, title })}
  >
    <View style={[styles.resourceIconWrap, { backgroundColor: '#F3E8FF' }]}> 
      <Text style={styles.resourceIcon}>🎵</Text>
    </View>
    <View style={styles.resourceContent}>
      <Text style={styles.resourceTitle}>{title}</Text>
      <Text style={styles.resourceMeta}>Audio • {size}</Text>
    </View>
    <Text style={styles.downloadIcon}>➜</Text>
  </TouchableOpacity>
);

const ThreeDResource = ({ url, title, size,soundUrl,thumbnail,modelConfig, navigation }) => (
  <TouchableOpacity
    style={styles.resourceRow}
    onPress={() => navigation.navigate('Modal3DScreen', { modelUrl: url,soundUrl, title, modelConfig })}
  >
    <View style={[styles.resourceIconWrap, { backgroundColor: '#E3F2FD' }]}> 
      {
        thumbnail ? (
          <RNImage source={{ uri: thumbnail }} style={styles.resourceThumbnail} />
        ) : (
          <Text style={styles.resourceIcon}>🧊</Text>
        ) 
      }
    </View>
    <View style={styles.resourceContent}>
      <Text style={styles.resourceTitle}>{title}</Text>
      <Text style={styles.resourceMeta}>3D Model • {size}</Text>
    </View>
    <RNImage
     source={require('../../../../../assets/images/icons/arrow.gif')}
     style={styles.gif}
    />
    {/* <Text style={styles.downloadIcon}>

    </Text> */}
  </TouchableOpacity>
);

const DefaultResource = ({ url, title, size }) => {
  return (
    <TouchableOpacity style={styles.resourceRow} onPress={() => url && Linking.openURL(url)}>
      <View style={styles.resourceIconWrap}>
        <Text style={styles.resourceIcon}>📎</Text>
      </View>
      <View style={styles.resourceContent}>
        <Text style={styles.resourceTitle}>{title}</Text>
        <Text style={styles.resourceMeta}>Unknown • {size}</Text>
      </View>
      <Text style={styles.downloadIcon}>➜</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
    paddingTop: 14,
    elevation: 2,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resourceIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resourceIcon: { fontSize: 18 },
  resourceContent: { flex: 1 },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  resourceMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  resourceThumbnail: {
  width: 30,
  height: 30,
  borderRadius: 6,
},
  downloadIcon: {
    fontSize: 16,
    color: '#ff8c7d',
    marginRight:10
  },
  imageCard: {
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ECECEC',
    elevation: 2,
  },
  imagePreview: {
    width: '100%',
    height: 190,
    backgroundColor: '#F4F4F4',
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  imageOverlayContent: {
    flex: 1,
    marginRight: 10,
  },
  imageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  imageMeta: {
    fontSize: 12,
    color: '#F5F5F5',
    marginTop: 2,
  },
  imageButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '85%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  gif:{
     width: 35,
    height: 20,
  }
});

export default ResourceList;