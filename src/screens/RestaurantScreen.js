import React, {useContext} from "react";
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
import { ThemeContext } from "../context/ThemeContext";


export default function RestaurantScreen({
  route,
  navigation,
}) {
  const { restaurante } = route.params;

  const { cores } = useContext(ThemeContext);

  function adicionarCarrinho(produto) {
  const chaveProduto =
    `${restaurante.id}-${produto.id}`;

  const itemExistente =
    carrinho.find(
      (item) =>
        item.chaveProduto ===
        chaveProduto
    );

  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    carrinho.push({
      ...produto,
      chaveProduto,
      restauranteId: restaurante.id,
      restauranteNome: restaurante.nome,
      quantidade: 1,
    });
  }

  Alert.alert(
    "Sucesso",
    `${produto.nome} adicionado ao carrinho`
  );

  console.log(carrinho);
}

  
  

function favoritarRestaurante() {
  const existe = favoritos.find(
    (item) =>
      item.id === restaurante.id
  );

  if (existe) {
    Alert.alert(
      "Aviso",
      "Restaurante já favoritado"
    );
    return;
  }

  favoritos.push(restaurante);

  Alert.alert(
    "Sucesso",
    "Restaurante adicionado aos favoritos"
  );

  console.log(favoritos);
}

  return (
    <View style={[styles.container,
    {
      backgroundColor:  cores.fundo,
    },]}
>
      <Text style={[styles.nome,
        {
          color: cores.texto,
        },
      ]}>
        {restaurante.nome}
      </Text>

      <TouchableOpacity
        style={[styles.botaoFavorito,
          {
            backgroundColor:
            cores.principal,
          },
        ]}
          onPress={favoritarRestaurante}>
        <Text style={styles.textoFavorito}>
          Favoritar
        </Text>
      </TouchableOpacity>

      <Text style={[styles.info,
        {
          color:
          cores.secundario,
        },
      ]}>
        {restaurante.categoria}
      </Text>

      <Text style={[styles.info,
        {
          color:
          cores.secundario,
        },
      ]}>
         {restaurante.nota}
      </Text>

      <Text style={[styles.info,
        {
          color:
          cores.secundario,
        },
      ]}>
         {restaurante.tempoEntrega}
      </Text>

      <Text style={[styles.info,
        {
          color:
          cores.secundario,
        },
      ]}>
        Taxa: {restaurante.taxaEntrega}
      </Text>

      <Text style={[styles.tituloProdutos,
        {
          color: cores.texto,
        },
      ]}>
        Cardápio
      </Text>

      <TouchableOpacity
        style={[styles.botaoCarrinho,
          {
            backgroundColor: cores.principal,
          },
        ]}
        onPress={() =>
          navigation.navigate("Carrinho")
        }
      >

      <FlatList
        data={restaurante.produtos}
        keyExtractor={(item) =>
          item.id.toString()
        }
        renderItem={({ item }) => (
          <View style={[styles.produto,
            {
              borderBottomColor:
              cores.secundario,
            },
          ]}>

          <View>
            <Text style={[styles.produtoNome,
              {
                color: cores.texto,
              },
            ]}>
              {item.nome}
            </Text>

            <Text style={[styles.preco,
              {
                color: cores.secundario,
              },
            ]}>
              R$ {item.preco.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.botao,
              {
                backgroundColor: cores.principal,
              },
            ]}
            onPress={() =>
            adicionarCarrinho(item)
            }
          >

          <Text style={styles.botaoTexto}>
            +
          </Text>
            </TouchableOpacity>
          </View>
        )}
      />


      <Text style={styles.botaoCarrinhoTexto}>
           Ver Carrinho
        </Text>
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