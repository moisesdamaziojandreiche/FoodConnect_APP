import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import HomeScreen from "./src/screens/HomeScreen";
import RestaurantScreen from "./src/screens/RestaurantScreen";
import CartScreen from "./src/screens/CartScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SearchScreen from "./src/screens/SearchScreen";
import {ThemeProvider} from "./src/context/ThemeContext";
import FavoriteScreen from "./src/screens/FavoriteScreen";
import OrdersScreen from "./src/screens/OrdersScreen";



const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />

          <Stack.Screen
            name="Cadastro"
           component={RegisterScreen}
          />

         <Stack.Screen
            name="RecuperarSenha"
            component={ForgotPasswordScreen}
            options={{
              title: "Recuperar Senha",
            }}
          />

          <Stack.Screen
            name="Home"
            component={HomeScreen}
          />

          <Stack.Screen
            name="Restaurant"
            component={RestaurantScreen}
         />

          <Stack.Screen
            name="Carrinho"
            component={CartScreen}
          />
        
          <Stack.Screen
            name="Perfil"
            component={ProfileScreen}
          />

          <Stack.Screen
            name="Buscar"
            component={SearchScreen}
          />

          <Stack.Screen
            name="Favoritos"
            component={FavoriteScreen}
          />

          <Stack.Screen
            name="Pedidos"
            component={OrdersScreen}
            options={{
              title: "Meus Pedidos",
            }}
          />

        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}