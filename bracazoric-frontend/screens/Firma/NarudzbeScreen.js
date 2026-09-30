import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { getOrders, clearSession } from "../../services/api";

export default function NarudzbeScreen({ navigation }) {
  const [narudzbe, setNarudzbe] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", fetchNarudzbe);
    return unsubscribe;
  }, [navigation]);

  const fetchNarudzbe = async () => {
    setLoading(true);

    try {
      const data = await getOrders();
      const lista = Array.isArray(data) ? data : [];
      setNarudzbe(lista.filter((narudzba) => narudzba.status === "Poslata"));
    } catch (error) {
      console.error("Greška pri dohvatanju narudžbi:", error);

      if (error.status === 401) {
        await clearSession();
        navigation.replace("Login");
        return;
      }

      Alert.alert("Greška", error.message || "Ne mogu učitati narudžbe.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.shopName}>🏢 {item.trgovinaIme}</Text>
      <Text style={styles.date}>📅 {item.datum}</Text>
      <Text style={[styles.status, styles.statusPoslata]}>Status: {item.status}</Text>

      <Text style={styles.productTitle}>Stavke:</Text>
      {item.proizvodi?.map((p) => (
        <Text key={p.id} style={styles.productItem}>
          🔸 {p.naziv} - {p.kolicina} {p.jedinica}
        </Text>
      ))}

      <TouchableOpacity
        style={styles.obradiButton}
        onPress={() => navigation.navigate("DetaljiNarudzbe", { narudzba: item })}
      >
        <Text style={styles.obradiButtonText}>📝 Obradi i napravi račun</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 Pristigle Narudžbe</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : narudzbe.length === 0 ? (
        <Text style={styles.emptyText}>Trenutno nema novih narudžbi.</Text>
      ) : (
        <FlatList
          data={narudzbe}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f4f4f4" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20, textAlign: "center", color: "#333" },
  emptyText: { fontSize: 18, textAlign: "center", color: "#666", marginTop: 50 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: "#ddd" },
  shopName: { fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 5 },
  date: { fontSize: 14, color: "#666", marginBottom: 15 },
  status: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  statusPoslata: { color: "#f0ad4e" },
  productTitle: { fontSize: 16, fontWeight: "bold", color: "#555", marginBottom: 5 },
  productItem: { fontSize: 18, color: "#333", marginLeft: 10, marginBottom: 5 },
  obradiButton: { backgroundColor: "#007AFF", padding: 15, borderRadius: 10, marginTop: 15, alignItems: "center" },
  obradiButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
