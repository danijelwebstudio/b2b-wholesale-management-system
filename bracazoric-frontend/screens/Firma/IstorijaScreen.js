import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { getTransakcije, clearSession } from "../../services/api";

export default function IstorijaScreen({ navigation }) {
  const [transakcije, setTransakcije] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIstorija = async () => {
      setLoading(true);

      try {
        const data = await getTransakcije();
        setTransakcije(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Greška pri učitavanju istorije:", error);

        if (error.status === 401) {
          await clearSession();
          navigation.replace("Login");
          return;
        }

        Alert.alert("Greška", error.message || "Nije moguće učitati istoriju.");
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = navigation.addListener("focus", fetchIstorija);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📜 Istorija Transakcija</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : transakcije.length === 0 ? (
        <Text style={styles.emptyText}>Nema zapisa. Prvo proknjižite uplatu ili ambalažu.</Text>
      ) : (
        <FlatList
          data={transakcije}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isUplata = item.tip === "UPLATA";

            return (
              <View style={[styles.card, isUplata ? styles.cardUplata : styles.cardAmbalaza]}>
                <View style={styles.row}>
                  <Text style={styles.shopName}>🏢 {item.trgovinaIme}</Text>
                  <Text style={styles.date}>{item.datum}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.typeText}>{isUplata ? "💵 Uplata gotovine" : "♻️ Povrat ambalaže"}</Text>
                  <Text style={[styles.amount, isUplata ? styles.amountGreen : styles.amountOrange]}>
                    +{Number(item.iznos).toFixed(2)} KM
                  </Text>
                </View>

                {!isUplata && item.opis ? (
                  <Text style={styles.detailsText}>Detalji: {item.opis}</Text>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#333" },
  emptyText: { fontSize: 18, textAlign: "center", marginTop: 50, color: "#666" },
  card: { padding: 15, marginBottom: 15, borderWidth: 2, borderRadius: 10 },
  cardUplata: { borderColor: "#5cb85c", backgroundColor: "#f4fdf4" },
  cardAmbalaza: { borderColor: "#f0ad4e", backgroundColor: "#fffcf5" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  shopName: { fontSize: 20, fontWeight: "bold", flex: 1, marginRight: 10 },
  date: { fontSize: 14, color: "#666" },
  typeText: { fontSize: 18, fontWeight: "bold", color: "#333", flex: 1 },
  amount: { fontSize: 20, fontWeight: "bold" },
  amountGreen: { color: "#5cb85c" },
  amountOrange: { color: "#f0ad4e" },
  detailsText: { fontSize: 16, color: "#555", marginTop: 5, fontStyle: "italic" },
});
