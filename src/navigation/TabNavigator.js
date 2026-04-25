import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Platform } from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

// Importar las pantallas principales
import {
  HomeScreen,
  SearchScreen,
  ScheduleScreen,
  WatchingScreen,
  ProfileScreen,
} from "../screens";

const Tab = createBottomTabNavigator();

// Componente personalizado para iconos de tabs
const TabIcon = ({ name, color, size = 24 }) => {
  const getIcon = (tabName) => {
    const iconProps = {
      size: size,
      color: color,
    };

    switch (tabName) {
      case "Home":
        return <MaterialIcons name="home" {...iconProps} />;
      case "Search":
        return <MaterialIcons name="search" {...iconProps} />;
      case "Schedule":
        return <MaterialIcons name="schedule" {...iconProps} />;
      case "Watching":
        return <MaterialIcons name="tv" {...iconProps} />;
      case "Profile":
        return <MaterialIcons name="account-circle" {...iconProps} />;
      default:
        return <MaterialIcons name="smartphone" {...iconProps} />;
    }
  };

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      {getIcon(name)}
    </View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <TabIcon name={route.name} color={color} size={size} />
        ),
        tabBarActiveTintColor: "#007bff",
        tabBarInactiveTintColor: "#888888",
        tabBarStyle: {
          backgroundColor: "#1a1a1a",
          borderTopColor: "#333333",
          borderTopWidth: 1,
          paddingBottom: Platform.OS === "ios" ? 20 : 5,
          paddingTop: 8,
          height: Platform.OS === "ios" ? 85 : 65,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 2,
        },
        headerShown: false, // Ocultar headers por defecto
      })}
      initialRouteName="Home"
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Inicio",
          title: "Inicio",
        }}
      />

      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: "Buscar",
          title: "Buscar",
        }}
      />

      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          tabBarLabel: "Horario",
          title: "Horario",
        }}
      />

      <Tab.Screen
        name="Watching"
        component={WatchingScreen}
        options={{
          tabBarLabel: "Viendo",
          title: "Viendo",
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Perfil",
          title: "Perfil",
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
