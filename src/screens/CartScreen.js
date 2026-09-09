import React, { useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import * as WebBrowser from "expo-web-browser";

import { carrinho } from "../data/carrinho";
import { supabase } from "../lib/supabase";
import Menu from "../components/Menu";
import { ThemeContext } from "../context/ThemeContext";

export default function CartScreen({
  navigation,
}) {
  const { cores } =
    useContext(ThemeContext);

  const total = carrinho.reduce(
    (soma, item) =>
      soma +
      item.preco *
        item.quantidade,
    0
  );

  async function finalizarPedido() {
    if (carrinho.length === 0) {
      Alert.alert(
        "Carrinho vazio",
        "Nenhum pedido encontrado."
      );
      return;
    }

    const { data, error } = await supabase.functions.invoke("create-payment", {
      body: {
        items: carrinho.map((item) => ({
          id: item.id,
          nome: item.nome,
          preco: item.preco,
          quantidade: item.quantidade,
          restauranteId: item.restauranteId,
        })),
      },
    });

    if (error || !data?.initPoint) {
      Alert.alert("Pagamento indisponível", error?.message || "Tente novamente.");
      return;
    }

    await WebBrowser.openBrowserAsync(data.initPoint);
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
        Meu Carrinho
      </Text>

      <FlatList
        data={carrinho}
        keyExtractor={(item) =>
          item.id.toString()
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.item,
              {
                  borderBottomColor:
                  cores.secundario,
              },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.nomeProduto,
                  {
                    color:
                      cores.texto,
                  },
                ]}
              >
                {item.nome} x
                {item.quantidade}
              </Text>

              <Text
                style={[
                  styles.preco,
                  {
                    color:
                      cores.secundario,
                  },
                ]}
              >
                R${" "}
                {(
                  item.preco *
                  item.quantidade
                ).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      />

      <Text
        style={[
          styles.total,
          {
            color:
              cores.texto,
          },
        ]}
      >
        Total: R$ {total.toFixed(2)}
      </Text>

      <View
        style={styles.botaoContainer}
      >
        <TouchableOpacity
          style={[
            styles.botao,
            {
              backgroundColor:
                cores.principal,
            },
            carrinho.length ===
              0 &&
              styles.botaoDesabilitado,
          ]}
          onPress={
            finalizarPedido
          }
          disabled={
            carrinho.length ===
            0
          }
        >
          <Text
            style={
              styles.botaoTexto
            }
          >
            Finalizar Pedido
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
    paddingBottom: 120,
  },

  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  item: {
    paddingVertical: 15,
    borderBottomWidth: 1,
  },

  nomeProduto: {
    fontSize: 18,
    fontWeight: "bold",
  },

  preco: {
    marginTop: 5,
  },

  total: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 20,
    textAlign: "right",
  },

  botaoContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 80,
  },

  botao: {
    padding: 15,
    borderRadius: 10,
  },

  botaoDesabilitado: {
    backgroundColor: "#999",
  },

  botaoTexto: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
  },
});