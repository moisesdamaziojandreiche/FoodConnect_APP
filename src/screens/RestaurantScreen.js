import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";

import { carrinho } from "../data/carrinho";
import { favoritos } from "../data/favoritos";
import { listarProdutos, textoHorario } from "../data/restaurantes";
import { ThemeContext } from "../context/ThemeContext";


export default function RestaurantScreen({
  route,
  navigation,
}) {
  const { restaurante } = route.params;

  const { cores } = useContext(ThemeContext);

  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Cardápio vem do banco: os mesmos produtos que o restaurante cadastra no painel.
  useEffect(() => {
    let ativo = true;

    listarProdutos(restaurante.id).then(({ data, error }) => {
      if (!ativo) return;

      if (error) {
        setErro(error.message);
      } else {
        setProdutos(data || []);
      }

      setCarregando(false);
    });

    return () => {
      ativo = false;
    };
  }, [restaurante.id]);

  function inserirNoCarrinho(produto) {
    const chaveProduto = `${restaurante.id}-${produto.id}`;

    const itemExistente = carrinho.find(
      (item) => item.chaveProduto === chaveProduto
    );

    if (itemExistente) {
      itemExistente.quantidade += 1;
    } else {
      carrinho.push({
        id: produto.id,
        nome: produto.nome,
        preco: Number(produto.preco),
        chaveProduto,
        restauranteId: restaurante.id,
        restauranteNome: restaurante.nome,
        restauranteEndereco: restaurante.endereco || "",
        quantidade: 1,
      });
    }

    Alert.alert(
      "Sucesso",
      `${produto.nome} adicionado ao carrinho`
    );
  }

  // Um pedido pertence a um único restaurante.
  function adicionarCarrinho(produto) {
    if (
      carrinho.length > 0 &&
      carrinho[0].restauranteId !== restaurante.id
    ) {
      Alert.alert(
        "Carrinho de outro restaurante",
        `Seu carrinho tem itens de ${carrinho[0].restauranteNome}. Deseja esvaziá-lo e começar um novo pedido aqui?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Esvaziar e adicionar",
            style: "destructive",
            onPress: () => {
              carrinho.length = 0;
              inserirNoCarrinho(produto);
            },
          },
        ]
      );
      return;
    }

    inserirNoCarrinho(produto);
  }

  function favoritarRestaurante() {
    const existe = favoritos.find(
      (item) => item.id === restaurante.id
    );

    if (existe) {
      Alert.alert("Aviso", "Restaurante já favoritado");
      return;
    }

    favoritos.push(restaurante);

    Alert.alert(
      "Sucesso",
      "Restaurante adicionado aos favoritos"
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: cores.fundo }]}>
      <Text style={[styles.nome, { color: cores.texto }]}>
        {restaurante.nome}
      </Text>

      <TouchableOpacity
        style={[styles.botaoFavorito, { backgroundColor: cores.principal }]}
        onPress={favoritarRestaurante}
      >
        <Text style={styles.textoFavorito}>Favoritar</Text>
      </TouchableOpacity>

      {!!restaurante.descricao && (
        <Text style={[styles.info, { color: cores.secundario }]}>
          {restaurante.descricao}
        </Text>
      )}

      {!!textoHorario(restaurante) && (
        <Text style={[styles.info, { color: cores.secundario }]}>
          Funcionamento: {textoHorario(restaurante)}
        </Text>
      )}

      <Text style={[styles.info, { color: cores.secundario }]}>
        Retirada no local
        {restaurante.endereco ? `: ${restaurante.endereco}` : ""}
      </Text>

      <Text style={[styles.tituloProdutos, { color: cores.texto }]}>
        Cardápio
        </Text>
      <FlatList
        style={{ flex: 1 }}
        data={produtos}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <Text style={{ color: cores.secundario }}>
            {erro
              ? `Erro ao carregar: ${erro}`
              : carregando
              ? "Carregando..."
              : "Este restaurante ainda não cadastrou produtos."}
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.produto,
              { borderBottomColor: cores.secundario },
            ]}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.produtoNome, { color: cores.texto }]}>
                {item.nome}
              </Text>

              {!!item.descricao && (
                <Text style={{ color: cores.secundario, marginTop: 2 }}>
                  {item.descricao}
                </Text>
              )}

              <Text style={[styles.preco, { color: cores.secundario }]}>
                R$ {Number(item.preco).toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.botao, { backgroundColor: cores.principal }]}
              onPress={() => adicionarCarrinho(item)}
            >
              <Text style={styles.botaoTexto}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.botaoCarrinho, { backgroundColor: cores.principal }]}
        onPress={() => navigation.navigate("Carrinho")}
      >
        <Text style={styles.botaoCarrinhoTexto}>Ver Carrinho</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#fff",
  },

  nome: {
    fontSize: 28,
    fontWeight: "bold",
  },

  info: {
    marginTop: 5,
    color: "#666",
    fontSize: 15,
  },

  tituloProdutos: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 15,
  },

  botaoCarrinho: {
    backgroundColor: "#e63946",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },

  botaoCarrinhoTexto: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },

  botaoFavorito: {
    backgroundColor: "#ff9800",
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
    alignSelf: "flex-start",
  },

  textoFavorito: {
    color: "#fff",
    fontWeight: "bold",
  },

  produto: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  produtoNome: {
    fontSize: 18,
    fontWeight: "bold",
  },

  preco: {
    marginTop: 5,
    color: "#666",
  },

  botao: {
    backgroundColor: "#e63946",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  botaoTexto: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
});