import {View,Text,TouchableOpacity,Image} from 'react-native'

export const CustomScreen = ({ navigation, route, title }) => {
  console.log('CustomComp Props:', { route, title });

  const item = route?.params?.item;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: '#222',
          marginBottom: 20,
        }}
      >
        Automobile Engineering
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: '#2563EB',
          paddingHorizontal: 20,
          paddingVertical: 15,
          borderRadius: 10,
          alignItems: 'center',
        }}
        onPress={()=>{navigation.navigate("WorkshopHome")}}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 16,
            fontWeight: '700',
          }}
        >
          Explore Workshop
        </Text>

        <Text
          style={{
            color: '#fff',
            marginTop: 8,
          }}
        >
          Component Data: {title}
        </Text>

        <Text
          style={{
            color: '#fff',
            marginTop: 4,
          }}
        >
          Carousel Title: {item?.title}
        </Text>

        {item?.thumbnail && (
          <Image
            source={{ uri: item.thumbnail }}
            style={{
              width: 120,
              height: 120,
              borderRadius: 10,
              marginTop: 15,
            }}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};
