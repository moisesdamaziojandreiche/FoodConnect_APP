import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase";

const logo = require("../../assets/FoodConnectImage.png");


export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function fazerLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      Alert.alert("Erro", "E-mail ou senha incorretos");
      return;
    }

    navigation.replace("Home");
  }

  return (

  <View style={styles.container}>
    <Image
      source={logo}
      style={styles.logo}
    />

    <TextInput
      style={styles.input}
      placeholder="E-mail"
      keyboardType="email-address"
      value={email}
      onChangeText={setEmail}
    />

    <TextInput
      style={styles.input}
      placeholder="Senha"
      secureTextEntry
      value={senha}
      onChangeText={setSenha}
    />

    <TouchableOpacity
      style={styles.button}
      onPress={fazerLogin}
    >
      <Text style={styles.buttonText}>
        Entrar
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() =>
        navigation.navigate("RecuperarSenha")
      }
    >
      <Text style={styles.link}>
        Esqueceu sua senha?
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() =>
        navigation.navigate("Cadastro")
      }
    >
      <Text style={styles.link}>
        Cadastre-se
      </Text>
    </TouchableOpacity>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 25,
    backgroundColor: "#f5f5f5",
  },

  logo: {
    width: 300,
    height: 300,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 30,
  },

  input: {
    borderWidth: 1,
    borderColor: "#FFB366",
    backgroundColor: "#FFF8F2",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },

  button: {
    backgroundColor: "#FF6B00",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  link: {
    textAlign: "center",
    color: "#FF6B00",
    marginTop: 15,
    textDecorationLine: "underline",
  },
});