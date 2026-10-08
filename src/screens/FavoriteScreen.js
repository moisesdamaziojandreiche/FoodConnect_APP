import React, { useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { favoritos } from "../data/favoritos";
import { textoHorario } from "../data/restaurantes";
import Menu from "../components/Menu";
import { ThemeContext } from "../context/ThemeContext";

export default function FavoriteScreen({
  navigation,
}) {
  const { cores } =
    useContext(ThemeContext);

  function removerFavorito(id) {
    const index = favoritos.findIndex(
      (item) => item.id === id
    );

    if (index !== -1) {
      favoritos.splice(index, 1);

      Alert.alert(
        "Sucesso",
        "Restaurante removido dos favoritos"
      );

      navigation.replace(
        "Favoritos"
      );
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            cores.fundo,
        },
      ]}
    >
      <Text
        style={[
          styles.titulo,
          {
            color:
              cores.texto,
          },
        ]}
      >
        Favoritos
      </Text>

      {favoritos.length === 0 ? (
        <Text
          style={[
            styles.vazio,
            {
              color:
                cores.secundario,
            },
          ]}
        >
          Nenhum restaurante favoritado.
        </Text>
      ) : (
        <FlatList
          data={favoritos}
          keyExtractor={(item) =>
            item.id.toString()
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor:
                    cores.card,
                },
              ]}
              onPress={() =>
                navigation.navigate(
                  "Restaurant",
                  {
                    restaurante: item,
                  }
                )
              }
            >
              <Text
                style={[
                  styles.nome,
                  {
                    color: cores.texto,
                  },
                ]}
              >
                {item.nome}
              </Text>

              {!!item.descricao && (
                <Text
                  style={[
                    styles.categoria,
                    {
                      color: cores.secundario,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {item.descricao}
                </Text>
              )}

              {!!textoHorario(item) && (
                <Text
                  style={[
                    styles.nota,
                    {
                      color: cores.principal,
                    },
                  ]}
                >
                  🕒 {textoHorario(item)}
                </Text>
              )}

              <TouchableOpacity
                style={
                  styles.botaoRemover
                }
                onPress={() =>
                  removerFavorito(
                    item.id
                  )
                }
              >
                <Text
                  style={
                    styles.botaoTexto
                  }
                >
                  Remover
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      <Menu navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    paddingBottom: 80,
  },

  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  vazio: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 18,
  },

  card: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
  },

  nome: {
    fontSize: 18,
    fontWeight: "bold",
  },

  categoria: {
    marginTop: 5,
  },

  nota: {
    marginTop: 5,
    fontWeight: "bold",
  },

  botaoRemover: {
    marginTop: 10,
    backgroundColor: "#FF6B00",
    padding: 10,
    borderRadius: 8,
  },

  botaoTexto: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});