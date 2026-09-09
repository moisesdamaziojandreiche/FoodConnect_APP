import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function ForgotPasswordScreen({
  navigation,
}) {
  const [email, setEmail] = useState("");
  async function alterarSenha() {
    if (!email) {
      Alert.alert("Erro", "Digite seu e-mail");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

    if (error) {
      Alert.alert("Erro", error.message);
      return;
    }

  Alert.alert(
    "Sucesso",
    "Verifique seu e-mail para criar uma nova senha."
  );

  navigation.navigate("Login");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Recuperar Senha
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Digite seu e-mail"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={alterarSenha}
      >
        <Text style={styles.buttonText}>
          Alterar Senha
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
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },

  button: {
    backgroundColor: "#e63946",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});