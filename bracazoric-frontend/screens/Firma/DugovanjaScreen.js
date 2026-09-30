import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import {
  getSviRacuni,
  primijeniTransakciju,
  clearSession,
} from "../../services/api";

export default function DugovanjaScreen({ navigation }) {
  const [dugovanja, setDugovanja] = useState([]);
  const [uplate, setUplate] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", ucitajDugovanja);
    return unsubscribe;
  }, [navigation]);

  const handleApiError = async (error, fallback) => {
    console.error(error);

    if (error.status === 401) {
      await clearSession();
      navigation.replace("Login");
      return;
    }

    Alert.alert("Greška", error.message || fallback);
  };

  const ucitajDugovanja = async () => {
    setLoading(true);

    try {
      const data = await getSviRacuni();
      const lista = Array.isArray(data) ? data : [];
      const neplaceniRacuni = lista.filter(
        (r) => !r.placen && Number(r.iznos) > Number(r.uplaceno || 0)
      );

      const sabrano = {};

      neplaceniRacuni.forEach((racun) => {
        if (!sabrano[racun.trgovina_id]) {
          sabrano[racun.trgovina_id] = {
            trgovinaIme: racun.trgovinaIme,
            trgovinaId: racun.trgovina_id,
            ukupanDug: 0,
          };
        }

        const iznos = Number(racun.iznos) || 0;
        const uplaceno = Number(racun.uplaceno) || 0;
        sabrano[racun.trgovina_id].ukupanDug += Math.max(iznos - uplaceno, 0);
      });

      setDugovanja(Object.values(sabrano));
    } catch (error) {
      await handleApiError(error, "Ne mogu učitati dugovanja sa servera.");
    } finally {
      setLoading(false);
    }
  };

  const proknjiziUplatu = async (trgovina) => {
    if (submittingId) return;

    const originalnaUplata = parseFloat(
      String(uplate[trgovina.trgovinaId] || "").replace(",", ".")
    );

    if (!originalnaUplata || originalnaUplata <= 0) {
      return Alert.alert("Greška", "Unesite ispravan iznos.");
    }

    if (originalnaUplata > trgovina.ukupanDug) {
      return Alert.alert("Pažnja", "Uplata je veća od duga!");
    }

    setSubmittingId(trgovina.trgovinaId);

    try {
      const rezultat = await primijeniTransakciju({
        trgovinaId: trgovina.trgovinaId,
        tip: "UPLATA",
        iznos: originalnaUplata,
        opis: "Uplata gotovine",
      });

      setUplate((prev) => ({ ...prev, [trgovina.trgovinaId]: "" }));

      Alert.alert(
        "✅ Uspješno",
        `Uplata je proknjižena. Preostali dug: ${rezultat.preostaliDug} KM`
      );

      await ucitajDugovanja();
    } catch (error) {
      await handleApiError(error, "Nije moguće proknjižiti uplatu.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💰 Praćenje naplate</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#d9534f" />
      ) : dugovanja.length === 0 ? (
        <Text style={styles.emptyText}>Bravo! Svi računi su naplaćeni.</Text>
      ) : (
        <FlatList
          data={dugovanja}
          keyExtractor={(item) => item.trgovinaId.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.shopName}>🏢 {item.trgovinaIme}</Text>
              <Text style={styles.debtAmount}>
                Ukupni dug: {item.ukupanDug.toFixed(2)} KM
              </Text>

              <View style={styles.paymentRow}>
                <TextInput
                  style={styles.paymentInput}
                  placeholder="Iznos u KM"
                  keyboardType="numeric"
                  value={uplate[item.trgovinaId] || ""}
                  onChangeText={(text) =>
                    setUplate((prev) => ({ ...prev, [item.trgovinaId]: text }))
                  }
                  editable={!submittingId}
                />

                <TouchableOpacity
                  style={[
                    styles.payButton,
                    submittingId === item.trgovinaId && styles.disabledButton,
                  ]}
                  onPress={() => proknjiziUplatu(item)}
                  disabled={Boolean(submittingId)}
                >
                  {submittingId === item.trgovinaId ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.payButtonText}>✔️ Skini dug</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f4f4f4" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#333" },
  emptyText: { fontSize: 20, textAlign: "center", marginTop: 50, color: "#5cb85c", fontWeight: "bold" },
  card: { padding: 20, marginBottom: 15, borderWidth: 2, borderColor: "#d9534f", borderRadius: 12, backgroundColor: "#fff" },
  shopName: { fontSize: 24, fontWeight: "bold", marginBottom: 5, color: "#333" },
  debtAmount: { fontSize: 26, fontWeight: "bold", color: "#d9534f", marginBottom: 20 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  paymentInput: { flex: 1, borderWidth: 2, borderColor: "#ccc", borderRadius: 10, padding: 15, fontSize: 20, backgroundColor: "#fff", marginRight: 15 },
  payButton: { backgroundColor: "#5cb85c", paddingVertical: 18, paddingHorizontal: 20, borderRadius: 10, alignItems: "center", minWidth: 140 },
  disabledButton: { opacity: 0.65 },
  payButtonText: { color: "white", fontSize: 18, fontWeight: "bold" },
});
