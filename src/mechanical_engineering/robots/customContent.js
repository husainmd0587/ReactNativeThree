import {RoboticsNavigator} from './customScreens/robotics/navigation/RoboticsNavigator'
import RobotTestScreen from './customScreens/robotTestScreen';

import {CustomCard} from './customCard/card'


export const CustomScreensList = [
  {
    name: "RoboticsSimulations",
    component: RobotTestScreen,
  },
];



export const CustomCardsList = {
  custom_card_1: {
    component: CustomCard,
  }
};