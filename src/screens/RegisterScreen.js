import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image
} from "react-native";
import { supabase } from "../lib/supabase";
import { cpfValido, somenteDigitos } from "../../Cpf";

const logo = require("../../assets/FoodConnectImage.png");

export default function RegisterScreen({
  navigation,
}) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] =
    useState("");

  async function cadastrar() {
    if (
      !nome ||
      !email ||
      !senha ||
      !confirmarSenha
    ) {
      Alert.alert(
        "Erro",
        "Preencha todos os campos"
      );
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert(
        "Erro",
        "As senhas não coincidem"
      );
      return;
    }

    // CPF é opcional aqui (o carrinho pede de novo se faltar), mas se vier
    // preenchido precisa ser válido: a coluna clientes.cpf tem CHECK no banco.
    if (cpf && !cpfValido(cpf)) {
      Alert.alert("Erro", "CPF inválido");
      return;
    }

    // Metadados lidos pelo trigger criar_conta_no_cadastro() do banco,
    // que cria a linha em public.clientes.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: {
          tipo_cadastro: "cliente",
          nome: nome.trim(),
          cpf: somenteDigitos(cpf),
          telefone: telefone.trim(),
        },
      },
    });

    if (error) {
      Alert.alert("Erro", error.message);
      return;
    }

    if (!data.session) {
      Alert.alert("Cadastro realizado", "Confirme seu e-mail para entrar.");
      navigation.replace("Login");
      return;
    }

    Alert.alert("Sucesso", "Cadastro realizado!");
    navigation.replace("Home");
  }

  return (
    <View style={styles.container}>
      <Image
        source={logo}
        style={styles.logo}
      />

      <Text style={styles.title}>
        Criar Conta
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="CPF (opcional)"
        keyboardType="numeric"
        maxLength={14}
        value={cpf}
        onChangeText={setCpf}
      />

      <TextInput
        style={styles.input}
        placeholder="Telefone (opcional)"
        keyboardType="phone-pad"
        value={telefone}
        onChangeText={setTelefone}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirmar Senha"
        secureTextEntry
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={cadastrar}
      >
        <Text style={styles.buttonText}>
          Cadastrar
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
  
  logo: {
    width: 300,
    height: 300,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 30,
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
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
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
});