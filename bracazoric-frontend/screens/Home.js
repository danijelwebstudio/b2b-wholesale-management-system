import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function Home({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Braca Zorić</Text>
      <Text style={styles.subtitle}>Dobrodošli 👋</Text>

      <TouchableOpacity
        style={styles.button}
        // 🔥 Promijenjeno ime iz "Narudzbe" u "Narudžbe" jer se tako zove u App.js
        onPress={() => navigation.navigate("Narudžbe")}
      >
        <Text style={styles.buttonText}>➕ Nova narudžba</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        // 🔥 Bilo je "NoviRacunSrceen" (tipfeler), sada "Novi račun" da se poklapa sa App.js
        onPress={() => navigation.navigate("Novi račun")}
      >
        <Text style={styles.buttonText}>📜 Novi Račun</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        // 🔥 Bilo je "Dugovi", sada "Dugovanja" da se poklapa sa App.js
        onPress={() => navigation.navigate("Dugovanja")}
      >
        <Text style={styles.buttonText}>📜 Neplaćeni Računi</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    color: "#555",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: "80%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
