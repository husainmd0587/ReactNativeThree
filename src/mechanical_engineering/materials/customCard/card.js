import {View,Text,TouchableOpacity} from 'react-native'

export const CustomCard = ({ navigation, block }) => {
  const title = block?.data?.title;

  return (
    <View
      style={{
        height: 250,
        width: '100%',
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: '#222',
        }}
      >
        Automobile Engineering
      </Text>

      <TouchableOpacity
        style={{
          marginTop: 20,
          backgroundColor: '#FFD54F',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
        }}
        onPress={() => navigation.navigate('WorkshopHome')}
      >
        <Text
          style={{
            color: '#222',
            fontSize: 16,
            fontWeight: '700',
          }}
        >
          This is Custom Card
        </Text>

        <Text
          style={{
            color: '#222',
            marginTop: 5,
          }}
        >
          {title}
        </Text>
      </TouchableOpacity>
    </View>
  );
};