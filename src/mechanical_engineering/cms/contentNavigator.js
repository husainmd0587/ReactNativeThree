import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ImageBackground,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// import { workshopData } from "./data/allWorkshopData";
import WorkshopHome from "./cms/cmsHome";
import ItemScreen from "./cms/ItemScreen";
import PdfViewer from "../../utils/components/PdfViewer";
import YoutubeVideoScreen from "../../utils/components/YoutubeVideoScreen";
import Modal3DScreen from "../../utils/components/Modal3DScreen";

const Stack = createNativeStackNavigator();

const NavList = [
  {
    name: "ItemScreen",
    component: ItemScreen,
  },
  {
    name: "PdfViewer",
    component: PdfViewer,
  },
  {
    name: "Video",
    component: YoutubeVideoScreen,
  },
  {
    name: "Modal3DScreen",
    component: Modal3DScreen,
  },
];

const ContentNavigator = ({
  content,
  rootId,
  customComponents = [],
  customCards = {},
}) => {


  return (
    <Stack.Navigator
      initialRouteName="WorkshopHome"
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: "#F7FBFF",
        },
      }}
    >
      {/* Workshop Home */}
      <Stack.Screen name="WorkshopHome">
        {(props) => (
          <WorkshopHome
            {...props}
            workshop={content}
            rootId={rootId}
            customCards={customCards}
            customComponents={customComponents}
          />
        )}
      </Stack.Screen>

      {/* Default Screens */}
      {NavList.map((screen) => {
        const ScreenComponent = screen.component;

        return (
          <Stack.Screen key={screen.name} name={screen.name}>
            {(props) => (
              <ScreenComponent
                {...props}
                workshop={content}
                customCards={customCards}
                customComponents={customComponents}
              />
            )}
          </Stack.Screen>
        );
      })}

      {/* Custom Screens */}
      {customComponents.map((screen, index) => {
        const ScreenComponent = screen.component;
        return (
          <Stack.Screen
            key={screen.name ?? `CustomComponent-${index}`}
            name={screen.name ?? `CustomComponent${index}`}
          >
            {(props) => (
              <ScreenComponent
                {...props}
                {...screen.data}
                workshop={content}
                customCards={customCards}
                customComponents={customComponents}
              />
            )}
          </Stack.Screen>
        );
      })}
    </Stack.Navigator>
  );
};

export default ContentNavigator;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7FBFF",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },

  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0B3A66",
  },

  grid: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },

  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },

  card: {
    width: "48%",
    height: 240,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#fff",
    marginBottom: 16,
    elevation: 6,
  },

  image: {
    flex: 1,
    justifyContent: "space-between",
  },

  imageStyle: {
    borderRadius: 18,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },

  typeBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  typeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },

  bottom: {
    padding: 14,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },

  startBtn: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
  },

  startText: {
    color: "#222",
    fontWeight: "700",
    fontSize: 13,
  },
});