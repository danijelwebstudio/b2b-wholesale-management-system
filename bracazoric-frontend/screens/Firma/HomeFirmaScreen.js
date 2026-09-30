import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { clearSession } from "../../services/api";

export default function HomeFirmaScreen({ navigation }) {
  const odjaviSe = async () => {
    try {
      await clearSession();
    } finally {
      navigation.replace("Login");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Glavni Meni - Veleprodaja</Text>

      <TouchableOpacity style={styles.buttonBlue} onPress={() => navigation.navigate("Narudžbe")}>
        <Text style={styles.buttonText}>📦 Pregled Narudžbi</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonBlue} onPress={() => navigation.navigate("Novi račun")}>
        <Text style={styles.buttonText}>🧾 Novi račun (Ručno)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonGreen} onPress={() => navigation.navigate("Povrat ambalaže")}>
        <Text style={styles.buttonText}>♻️ Otkup Ambalaže</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonRed} onPress={() => navigation.navigate("Dugovanja")}>
        <Text style={styles.buttonText}>💰 Praćenje Dugovanja</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonOrange} onPress={() => navigation.navigate("Istorija")}>
        <Text style={styles.buttonText}>📜 Istorija Transakcija</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonDark} onPress={odjaviSe}>
        <Text style={styles.buttonText}>🚪 Odjavi se</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "center", marginBottom: 30, marginTop: 20 },
  buttonBlue: { backgroundColor: "#007AFF", padding: 20, borderRadius: 12, marginBottom: 15, alignItems: "center" },
  buttonGreen: { backgroundColor: "#5cb85c", padding: 20, borderRadius: 12, marginBottom: 15, alignItems: "center" },
  buttonRed: { backgroundColor: "#d9534f", padding: 20, borderRadius: 12, marginBottom: 15, alignItems: "center" },
  buttonOrange: { backgroundColor: "#f0ad4e", padding: 20, borderRadius: 12, marginBottom: 15, alignItems: "center" },
  buttonDark: { backgroundColor: "#333", padding: 20, borderRadius: 12, marginTop: 10, alignItems: "center" },
  buttonText: { color: "white", fontSize: 20, fontWeight: "bold" },
});
