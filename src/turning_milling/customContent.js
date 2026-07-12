import CncTurningScreen from './customScreens/cnc/CncSimulatorPro'
import FreehandTurning from './customScreens/mannualTurning/freehandTurning'
import {CustomCard} from './customCard/card'

export const CustomScreensList = [   
  {
    name: "TurningOperations",
    component:CncTurningScreen,
  },
  {
    name:"FreehandTurning",
    component:FreehandTurning
  }
];

export const CustomCardsList = {
  custom_card_1: {
    component: CustomCard,
  }
};