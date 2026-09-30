import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import LoginScreen from "./screens/LoginScreen";

// Firma screens
import HomeFirmaScreen from "./screens/Firma/HomeFirmaScreen";
import NarudzbeScreen from "./screens/Firma/NarudzbeScreen";
import NoviRacunScreen from "./screens/Firma/NoviRacunScreen";
import DugovanjaScreen from "./screens/Firma/DugovanjaScreen";
import DetaljiNarudzbeScreen from "./screens/Firma/DetaljiNarudzbeScreen"; 
import PovratAmbalazeScreen from "./screens/Firma/PovratAmbalazeScreen";
import IstorijaScreen from "./screens/Firma/IstorijaScreen";

// Trgovina screens
import HomeTrgovinaScreen from "./screens/Trgovina/HomeTrgovinaScreen";
import NovaNarudzbaScreen from "./screens/Trgovina/NovaNarudzbaScreen";
import MojiRacuniScreen from "./screens/Trgovina/MojiRacuniScreen";

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: true }}>
        
        {/* Login */}
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />

        {/* Firma */}
        <Stack.Screen name="FirmaHome" component={HomeFirmaScreen}options={{ title: "🏢 Firma" }} />
        <Stack.Screen name="Narudžbe" component={NarudzbeScreen} />
        <Stack.Screen name="Novi račun" component={NoviRacunScreen} />
        <Stack.Screen name="Dugovanja" component={DugovanjaScreen} />
        <Stack.Screen name="DetaljiNarudzbe" component={DetaljiNarudzbeScreen} />
        <Stack.Screen name="Povrat ambalaže" component={PovratAmbalazeScreen} />
        <Stack.Screen name="Istorija" component={IstorijaScreen} />

        {/* Trgovina */}
        <Stack.Screen name="TrgovinaHome" component={HomeTrgovinaScreen}options={{ title: "🏪 Trgovina" }} />
        <Stack.Screen name="Nova narudžba" component={NovaNarudzbaScreen} />
        <Stack.Screen name="Moji računi" component={MojiRacuniScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
