import {StyleSheet} from 'react-native';
const styles = StyleSheet.create({

  mainConatainer: {
    height: 200,
    width: '100%',
    position: 'absolute',
    zIndex: 1,
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
    xyzPlaneContainer: {
    position: 'absolute',
    paddingHorizontal:10,
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'center',
    gap:15
  },
  xyzPlanebtn: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding:5,
    borderRadius:5,
  },
  xyzPlanetxt: {
    fontSize:14,
    paddingHorizontal:4,
    fontStyle:'italic'
  },
});

export default styles;
