import React, { useState, useContext} from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import { useRestaurantes, textoHorario } from "../data/restaurantes";
import Menu from "../components/Menu";
import { ThemeContext } from "../context/ThemeContext";

export default function SearchScreen({
  navigation,
}) {
  const [busca, setBusca] = useState("");
  const { cores } = useContext(ThemeContext);
  const { restaurantes, carregando, erro } = useRestaurantes();

  const resultado = restaurantes.filter((r) =>
    r.nome
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  return (
    <View style={[styles.container,
      {
        backgroundColor: cores.fundo,
      },
    ]}>

      <TextInput
        style={[ styles.input,
          {
            backgroundColor: cores.card,
            color: cores.texto,
            borderColor: cores.secundario,
          },
        ]}
        placeholder="Buscar restaurante..."
        value={busca}
        onChangeText={setBusca}
      />

      <FlatList
        data={resultado}
        ListEmptyComponent={
          <Text style={{ color: cores.secundario }}>
            {carregando
              ? "Carregando restaurantes..."
              : erro
              ? `Erro ao carregar restaurantes: ${erro}`
              : busca
              ? "Nenhum restaurante encontrado."
              : "Nenhum restaurante disponível."}
          </Text>
        }
        keyExtractor={(item) =>
          item.id.toString()
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[ styles.card,
              {
                backgroundColor: cores.card,
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
            <Text style={[styles.nome,
              {
                color: cores.texto,
              },
            ]}>
              {item.nome}
            </Text>

            {!!item.descricao && (
              <Text style={[styles.categoria,
                {
                  color: cores.secundario,
                },
              ]}
              numberOfLines={2}>
                {item.descricao}
              </Text>
            )}

            {!!textoHorario(item) && (
              <Text style={[styles.nota,
                {
                  color: cores.principal,
                },
              ]}>
                🕒 {textoHorario(item)}
              </Text>
            )}
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

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },

  card: {
    backgroundColor: "#fff",
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
    color: "#666",
    marginTop: 5,
  },

  nota: {
    marginTop: 5,
    color: "#e63946",
    fontWeight: "bold",
  },
});