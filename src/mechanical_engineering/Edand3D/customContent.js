
import CadNavigator  from './customScreens/SolidCad/cad/CadNavigator'

import {CustomCard} from './customCard/card'


export const CustomScreensList = [
  {
    name: "CAD",
    component:CadNavigator,
  },

];



export const CustomCardsList = {
  custom_card_1: {
    component: CustomCard,
  }
};