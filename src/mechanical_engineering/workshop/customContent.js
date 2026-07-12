import {CustomScreen} from './customScreens/homeScreen'
//* Custom cards and custom block *//
import {CustomCard} from './customCard/card'


export const CustomScreensList = [
  {
    name: "AutomobileHome",
    component: CustomScreen,
    data: {
      title: 'Automobile Engineering custom data for testing',
    },
  },
];



export const CustomCardsList = {
  custom_card_1: {
    component: CustomCard,
  }
};