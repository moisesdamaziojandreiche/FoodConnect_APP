import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";

export default function Menu({
  navigation,
}) {
  return (
    <View style={styles.menu}>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("Home")
        }
      >
        <Text style={styles.icone}>
          🏠
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          navigation.navigate("Buscar")
        }
      >
        <Text style={styles.icone}>
          🔍
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          navigation.navigate("Carrinho")
        }
      >
        <Text style={styles.icone}>
          🛒
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          navigation.navigate("Perfil")
        }
      >
        <Text style={styles.icone}>
          👤
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,

    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",

    paddingVertical: 15,

    backgroundColor: "#fff",

    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },

  icone: {
    fontSize: 28,
  },
});