import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from "react-native";

import { usuarioLogado } from "../data/user";
import Menu from "../components/Menu";
import { ThemeContext } from "../context/ThemeContext";

export default function ProfileScreen({
  navigation,
}) {
  const {
    temaEscuro,
    setTemaEscuro,
    cores,
  } = useContext(ThemeContext);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: cores.fundo,
        },
      ]}
    >
      <Text
        style={[
          styles.titulo,
          {
            color: cores.texto,
          },
        ]}
      >
        Conta
      </Text>

      <View
        style={[
          styles.avatar,
          {
            backgroundColor:
              cores.comida,
          },
        ]}
      >
        <Text style={styles.avatarIcone}>
          🍔
        </Text>
      </View>

      <Text
        style={[
          styles.nome,
          {
            color: cores.texto,
          },
        ]}
      >
        Olá, {usuarioLogado?.nome}
      </Text>

      <Text
        style={[
          styles.email,
          {
            color:
              cores.secundario,
          },
        ]}
      >
        {usuarioLogado?.email}
      </Text>

      <View
        style={[
          styles.menuCard,
          {
            backgroundColor:
              cores.card,
          },
        ]}
      >
        <View style={styles.item}>
          <Text
            style={[
              styles.itemTexto,
              {
                color:
                  cores.texto,
              },
            ]}
          >
            {temaEscuro
              ? " Tema Escuro"
              : " Tema Claro"}
          </Text>

          <Switch
            value={temaEscuro}
            onValueChange={
              setTemaEscuro
            }
          />
        </View>

        <TouchableOpacity
          style={[
            styles.item, 
            {
              color: cores.texto,
            },
          ]}
          onPress={() =>
            navigation.navigate(
              "Favoritos"
            )
          }
        >
          <Text
            style={[
              styles.itemTexto,
              {
                color:
                  cores.favorito,
              },
            ]}
          >
            Favoritos
          </Text>

          <Text
            style={{
              color:
                cores.secundario,
            }}
          >
            Restaurantes
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.botao}
          onPress={() =>
            navigation.replace(
              "Login"
            )
          }
        >
          <Text
            style={
              styles.botaoTexto
            }
          >
            Encerrar Sessão
          </Text>
        </TouchableOpacity>
      </View>

      <Menu navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 90,
  },

  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },

  avatarIcone: {
    fontSize: 45,
  },

  nome: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
  },

  email: {
    textAlign: "center",
    marginTop: 5,
    marginBottom: 30,
    fontSize: 16,
  },

  menuCard: {
    borderRadius: 15,
    padding: 10,
  },

  item: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor:
      "#33333320",
  },

  itemTexto: {
    fontSize: 16,
    fontWeight: "600",
  },

  footer: {
    flex: 1,
    justifyContent: "flex-end",
    marginBottom: 80,
  },

  botao: {
    backgroundColor: "#FF6B00",
    padding: 15,
    borderRadius: 10,
  },

  botaoTexto: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
});