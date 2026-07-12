import {CustomScreen} from './customScreens/homeScreen'
import Sketching2D from './customScreens/Sketching2D/main'
import Main3D from './customScreens/Sketching2D/3d/main'
//* Custom cards and custom block *//
import {CustomCard} from './customCard/card'


export const CustomScreensList = [
  {
    name: "Sketching2D",
    component:Sketching2D,
    data: {
      title: 'test your 2d sketching skills',
    },
  },
  {
    name:"Main3D",
    component:Main3D
  }
];



export const CustomCardsList = {
  custom_card_1: {
    component: CustomCard,
  }
};