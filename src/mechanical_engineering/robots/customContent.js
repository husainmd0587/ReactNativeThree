import {RoboticsNavigator} from './customScreens/robotics/navigation/RoboticsNavigator'
import RoboticSimulator from './customScreens/robotics/mannualRobot/robotTestScreen';

import {CustomCard} from './customCard/card'


export const CustomScreensList = [
  {
    name: "RoboticsSimulations",
    component: RoboticsNavigator,
  },
];



export const CustomCardsList = {
  custom_card_1: {
    component: CustomCard,
  }
};