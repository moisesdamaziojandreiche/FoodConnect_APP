import React, { useContext } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Menu from "../components/Menu";
import { useRestaurantes, textoHorario } from "../data/restaurantes";
import { ThemeContext } from "../context/ThemeContext";

export default function HomeScreen({ navigation }) {
  const { cores } = useContext(ThemeContext);
  const { restaurantes, carregando, erro } = useRestaurantes();

  return (
    <View style={[styles.container, { backgroundColor: cores.fundo }]}>
      <Text style={[styles.titulo, { color: cores.texto }]}>Restaurantes</Text>
      <FlatList
        data={restaurantes}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={{ color: cores.secundario }}>
            {carregando
              ? "Carregando restaurantes..."
              : erro
              ? `Erro ao carregar restaurantes: ${erro}`
              : "Nenhum restaurante disponível."}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: cores.card }]}
            onPress={() =>
              navigation.navigate("Restaurant", { restaurante: item })
            }
          >
            <Text style={[styles.nome, { color: cores.texto }]}>
              {item.nome}
            </Text>
            {!!item.descricao && (
              <Text style={[styles.descricao, { color: cores.secundario }]}>
                {item.descricao}
              </Text>
            )}
            {!!textoHorario(item) && (
              <Text style={[styles.horario, { color: cores.principal }]}>
                {textoHorario(item)}
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
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
  },
  lista: {
    flexGrow: 1,
  },
  card: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
  },
  nome: {
    fontSize: 18,
    fontWeight: "bold",
  },
  descricao: {
    marginTop: 5,
  },
  horario: {
    marginTop: 6,
    fontWeight: "600",
  },
});