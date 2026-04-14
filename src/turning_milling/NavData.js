import {NavigationMain} from "./home";
import G0 from "./gcodes/code/g0/g0";
import G0_sim from "./gcodes/code/g0/g0_sim";

export const AllScreens = [
  { name:'Main', component: NavigationMain ,showInMenu:false},
  { name:'G0', component: G0 ,showInMenu:false},
  { name:'G0_Sim', component: G0_sim ,showInMenu:false},
]