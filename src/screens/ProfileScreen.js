import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from "react-native";

import { supabase } from "../lib/supabase";
import Menu from "../components/Menu";
import { ThemeContext } from "../context/ThemeContext";

export default function ProfileScreen({
  navigation,
}) {
  const [userName, setUserName] = React.useState(null);
  const [userEmail, setUserEmail] = React.useState(null);
  const {
    temaEscuro,
    setTemaEscuro,
    cores,
  } = useContext(ThemeContext);

  React.useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        if (!supabase?.auth?.getUser) return;

        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user || !mounted) return;

        setUserEmail(user.email);
        setUserName(user.user_metadata?.nome || user.email);

        // O nome oficial fica em public.clientes
        if (supabase.from) {
          const { data: cliente } = await supabase
            .from("clientes")
            .select("nome")
            .eq("id", user.id)
            .maybeSingle();

          if (cliente?.nome && mounted) setUserName(cliente.nome);
        }
      } catch (e) {
        console.warn("Erro ao obter usuário do Supabase:", e);
      }
    }

    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  async function encerrarSessao() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Erro ao sair:", e);
    }

    navigation.replace("Login");
  }

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
        Olá, {userName ?? "Usuário"}
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
        {userEmail ?? ""}
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
          style={styles.item}
          onPress={() =>
            navigation.navigate(
              "Pedidos"
            )
          }
        >
          <Text
            style={[
              styles.itemTexto,
              {
                color: cores.texto,
              },
            ]}
          >
            Meus Pedidos
          </Text>

          <Text
            style={{
              color:
                cores.secundario,
            }}
          >
            Acompanhar
          </Text>
        </TouchableOpacity>

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
          onPress={encerrarSessao}
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