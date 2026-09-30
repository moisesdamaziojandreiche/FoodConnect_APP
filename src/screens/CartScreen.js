import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
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

// Quando a função responde 4xx/5xx, o texto útil está no corpo da resposta.
async function mensagemDeErro(error) {
  try {
    const corpo = await error.context.json();
    if (corpo?.error) return corpo.error;
  } catch (e) {
    // corpo ilegível: usa a mensagem genérica
  }
  return error.message;
}

export default function CartScreen({ navigation }) {
  const { cores } = useContext(ThemeContext);

  const [, atualizarTela] = useState(0);
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);

  const subtotal = carrinho.reduce(
    (soma, item) => soma + item.preco * item.quantidade,
    0
  );
  const total = subtotal;

  function alterarQuantidade(item, delta) {
    item.quantidade += delta;

    if (item.quantidade <= 0) {
      carrinho.splice(carrinho.indexOf(item), 1);
    }

    atualizarTela((n) => n + 1);
  }

  async function finalizarPedido() {
    if (carrinho.length === 0) {
      Alert.alert("Carrinho vazio", "Nenhum pedido encontrado.");
      return;
    }

    setEnviando(true);

    // Só ids e quantidades: o servidor consulta os preços no banco.
    const { data, error } = await supabase.functions.invoke("create-payment", {
      body: {
        restauranteId: carrinho[0].restauranteId,
        items: carrinho.map((item) => ({
          produtoId: item.id,
          quantidade: item.quantidade,
        })),
        observacao: observacao.trim(),
      },
    });

    setEnviando(false);

    if (error || !data?.initPoint) {
      Alert.alert(
        "Pagamento indisponível",
        error ? await mensagemDeErro(error) : "Tente novamente."
      );
      return;
    }

    // Pedido criado: esvazia o carrinho e abre o checkout.
    carrinho.length = 0;
    setObservacao("");
    atualizarTela((n) => n + 1);

    await WebBrowser.openBrowserAsync(data.initPoint);

    // Depois do checkout, mostra o status do pedido (atualiza em tempo real).
    navigation.navigate("Pedidos");
  }

  return (
    <View style={[styles.container, { backgroundColor: cores.fundo }]}>
      <Text style={[styles.titulo, { color: cores.texto }]}>
        Meu Carrinho
      </Text>

      {carrinho.length > 0 && (
        <Text style={{ color: cores.secundario, marginBottom: 10 }}>
          {carrinho[0].restauranteNome}
        </Text>
      )}

      <FlatList
        data={carrinho}
        keyExtractor={(item) => item.chaveProduto}
        ListEmptyComponent={
          <Text style={{ color: cores.secundario }}>
            Seu carrinho está vazio.
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.item,
              { borderBottomColor: cores.secundario },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.nomeProduto, { color: cores.texto }]}>
                {item.nome}
              </Text>

              <Text style={[styles.preco, { color: cores.secundario }]}>
                R$ {(item.preco * item.quantidade).toFixed(2)}
              </Text>
            </View>

            <View style={styles.quantidade}>
              <TouchableOpacity
                style={[styles.botaoQtd, { backgroundColor: cores.principal }]}
                onPress={() => alterarQuantidade(item, -1)}
              >
                <Text style={styles.botaoQtdTexto}>−</Text>
              </TouchableOpacity>

              <Text style={[styles.qtdTexto, { color: cores.texto }]}>
                {item.quantidade}
              </Text>

              <TouchableOpacity
                style={[styles.botaoQtd, { backgroundColor: cores.principal }]}
                onPress={() => alterarQuantidade(item, 1)}
              >
                <Text style={styles.botaoQtdTexto}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {carrinho.length > 0 && (
        <>
          <Text style={{ color: cores.secundario, marginTop: 10 }}>
            Retirada no restaurante
            {carrinho[0].restauranteEndereco
              ? `: ${carrinho[0].restauranteEndereco}`
              : ""}
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: cores.card,
                color: cores.texto,
                borderColor: cores.secundario,
              },
            ]}
            placeholder="Observação (opcional)"
            placeholderTextColor={cores.secundario}
            value={observacao}
            onChangeText={setObservacao}
            maxLength={300}
          />

        </>
      )}

      <Text style={[styles.total, { color: cores.texto }]}>
        Total: R$ {total.toFixed(2)}
      </Text>

      <View style={styles.botaoContainer}>
        <TouchableOpacity
          style={[
            styles.botao,
            { backgroundColor: cores.principal },
            (carrinho.length === 0 || enviando) && styles.botaoDesabilitado,
          ]}
          onPress={finalizarPedido}
          disabled={carrinho.length === 0 || enviando}
        >
          <Text style={styles.botaoTexto}>
            {enviando ? "Enviando..." : "Finalizar Pedido"}
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
    marginBottom: 10,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
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

  quantidade: {
    flexDirection: "row",
    alignItems: "center",
  },

  botaoQtd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  botaoQtdTexto: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  qtdTexto: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: "bold",
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },

  total: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 10,
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