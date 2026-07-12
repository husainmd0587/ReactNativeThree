import {CustomScreen} from './customScreens/screen'
//* Custom cards and custom block *//
import {CustomCard} from './customCard/card'




//{id:"custom screen",navigation:"AutomobileHome",title:"Custom Component",subtitle:"Custom Component",thumbnail:"https:....image.jpg"
//navigation:"screenNavigationName" name should ba same that use in CustomScrdenList
export const CustomScreensList = [   
  {
    name: "AutomobileHome",
    component: CustomScreen,
    data: {
      title: 'Automobile Engineering custom data for testing',
    },
  },
];


  //use in data
   // {
    //   type:"custom_card",
    //   id:"custom_card_1",  name should be same as use in CustomCardList
    //   data:{title:'custom card title...'}
    // },

export const CustomCardsList = {
  custom_card_1: {
    component: CustomCard,
  }
};