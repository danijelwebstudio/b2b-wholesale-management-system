import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Keyboard,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { createOrder, clearSession } from "../../services/api";

const BAZA_ARTIKALA = [
  "Jabuka", "Jagoda", "Kruška", "Banana", "Breskva", "Kajsija",
  "Paradajz", "Krastavac", "Paprika", "Krompir", "Crni luk",
  "Bijeli luk", "Kupus", "Mrkva", "Zelena salata", "Limun", "Narandža",
];

export default function NovaNarudzbaScreen({ navigation }) {
  const [artikal, setArtikal] = useState("");
  const [prijedlozi, setPrijedlozi] = useState([]);
  const [korpa, setKorpa] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const pretraziArtikle = (text) => {
    setArtikal(text);

    if (/\d/.test(text) || text.length === 0) {
      setPrijedlozi([]);
      return;
    }

    setPrijedlozi(
      BAZA_ARTIKALA.filter((a) =>
        a.toLowerCase().includes(text.toLowerCase())
      )
    );
  };

  const izaberiArtikal = (ime) => {
    setArtikal(`${ime} `);
    setPrijedlozi([]);
  };

  const dodajUKorpu = () => {
    const vrijednost = artikal.trim();

    if (!vrijednost) {
      Alert.alert("Fale podaci!", "Niste unijeli šta naručujete.");
      return;
    }

    setKorpa((trenutnaKorpa) => [
      {
        localId: `${Date.now()}-${Math.random()}`,
        naziv: vrijednost,
        kolicina: "1",
        jedinica: "",
      },
      ...trenutnaKorpa,
    ]);

    setArtikal("");
    setPrijedlozi([]);
    Keyboard.dismiss();
  };

  const obrisiIzKorpe = (localId) => {
    setKorpa((trenutnaKorpa) =>
      trenutnaKorpa.filter((item) => item.localId !== localId)
    );
  };

  const posaljiNarudzbu = async () => {
    if (submitting) return;

    if (korpa.length === 0) {
      Alert.alert("Prazno!", "Dodajte bar jedan artikal prije slanja.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await createOrder({
        proizvodi: korpa.map(({ naziv, kolicina, jedinica }) => ({
          naziv,
          kolicina,
          jedinica,
        })),
      });

      if (data?.success) {
        Alert.alert(
          "✅ Uspješno poslan!",
          "Vaša narudžba je stigla u veleprodaju."
        );
        setKorpa([]);
        navigation.goBack();
      }
    } catch (error) {
      console.error("Greška pri slanju narudžbe:", error);

      if (error.status === 401) {
        await clearSession();
        navigation.replace("Login");
        return;
      }

      Alert.alert("Greška", error.message || "Nije moguće poslati narudžbu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Narudžbenica</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Šta naručujete i koliko?</Text>

        <TextInput
          style={styles.inputVeliki}
          placeholder="Npr. Banana 2 gajbe ili Limun pola kartona"
          placeholderTextColor="#aaa"
          value={artikal}
          onChangeText={pretraziArtikle}
          editable={!submitting}
        />

        {prijedlozi.length > 0 && (
          <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled">
            {prijedlozi.map((item) => (
              <TouchableOpacity key={item} style={styles.dropdownItem} onPress={() => izaberiArtikal(item)}>
                <Text style={styles.dropdownText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity style={styles.addButton} onPress={dodajUKorpu} disabled={submitting}>
          <Text style={styles.addButtonText}>➕ DODAJ STAVKU</Text>
        </TouchableOpacity>

        {korpa.length > 0 && (
          <Text style={styles.korpaNaslov}>Ubačeno u korpu ({korpa.length}):</Text>
        )}
      </View>

      <FlatList
        data={korpa}
        keyExtractor={(item) => item.localId}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <View style={styles.korpaKartica}>
            <Text style={styles.korpaIme}>🔸 {item.naziv}</Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => obrisiIzKorpe(item.localId)} disabled={submitting}>
              <Text style={styles.deleteBtnText}>❌</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {korpa.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={posaljiNarudzbu}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>🚀 ZAVRŠI I POŠALJI</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8ECEF" },
  header: { backgroundColor: "#fff", padding: 20, paddingTop: 40, borderBottomWidth: 2, borderBottomColor: "#ccc" },
  title: { fontSize: 32, fontWeight: "900", color: "#333", textAlign: "center" },
  inputContainer: { backgroundColor: "#fff", padding: 20, borderRadius: 15, margin: 15, elevation: 4 },
  label: { fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 12 },
  inputVeliki: { backgroundColor: "#F5F5F5", borderWidth: 2, borderColor: "#007AFF", padding: 20, borderRadius: 12, fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 15 },
  dropdown: { maxHeight: 180, backgroundColor: "#fff", borderWidth: 2, borderColor: "#007AFF", borderRadius: 12, marginBottom: 15 },
  dropdownItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: "#eee" },
  dropdownText: { fontSize: 24, color: "#333", fontWeight: "bold" },
  addButton: { backgroundColor: "#FF9800", padding: 20, borderRadius: 12, alignItems: "center", marginTop: 5, borderWidth: 2, borderColor: "#E65100", marginBottom: 5 },
  addButtonText: { color: "#fff", fontSize: 22, fontWeight: "900", textTransform: "uppercase" },
  korpaNaslov: { fontSize: 20, fontWeight: "bold", color: "#555", marginTop: 15 },
  korpaKartica: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: 20, borderRadius: 12, marginHorizontal: 15, marginBottom: 10, borderWidth: 2, borderColor: "#4CAF50" },
  korpaIme: { fontSize: 24, fontWeight: "bold", color: "#333", flex: 1, paddingRight: 10 },
  deleteBtn: { backgroundColor: "#ffebee", paddingVertical: 15, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: "#ffcdd2" },
  deleteBtnText: { fontSize: 20, color: "#d9534f", fontWeight: "bold" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#E8ECEF", padding: 15 },
  submitButton: { backgroundColor: "#4CAF50", padding: 20, minHeight: 70, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#2E7D32", elevation: 5 },
  submitButtonDisabled: { opacity: 0.65 },
  submitButtonText: { color: "#fff", fontSize: 24, fontWeight: "900", textTransform: "uppercase" },
});
