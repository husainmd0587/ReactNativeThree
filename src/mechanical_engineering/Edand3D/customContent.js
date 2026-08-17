
import CadNavigator  from './customScreens/SolidCad/cad/CadNavigator'
import AutoCadPractice from './customScreens/AutoCad/index'
import {CustomCard} from './customCard/card'


export const CustomScreensList = [
  {
    name: "CAD",
    component:AutoCadPractice,
  },

];



export const CustomCardsList = {
  custom_card_1: {
    component: CustomCard,
  }
};