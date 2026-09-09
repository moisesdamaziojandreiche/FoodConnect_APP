import React, { useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { restaurantes } from "../data/restaurantes";
import Menu from "../components/Menu";
import { ThemeContext } from "../context/ThemeContext";

export default function HomeScreen({
  navigation,
}) {
  const { cores } =
    useContext(ThemeContext);

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
          styles.title,
          {
            color: cores.texto,
          },
        ]}
      >
        Restaurantes
      </Text>

      <FlatList
        data={restaurantes}
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
                  color:
                    cores.texto,
                },
              ]}
            >
              {item.nome}
            </Text>

            <Text
              style={[
                styles.categoria,
                {
                  color:
                    cores.secundario,
                },
              ]}
            >
              {item.categoria}
            </Text>

            <Text
              style={[
                styles.nota,
                {
                  color:
                    cores.principal,
                },
              ]}
            >
              ⭐ {item.nota}
            </Text>
          </TouchableOpacity>
        )}
      />

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

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
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
});