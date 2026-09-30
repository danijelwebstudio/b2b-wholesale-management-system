import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Keyboard, ScrollView, ActivityIndicator } from "react-native";
import { getTrgovine, createRacun, clearSession } from "../../services/api";

const BAZA_ARTIKALA = ["Jabuka", "Jagoda", "Kruška", "Banana", "Breskva", "Kajsija", "Paradajz", "Krastavac", "Paprika", "Krompir", "Crni luk", "Bijeli luk", "Kupus", "Mrkva", "Zelena salata", "Limun", "Narandža"];

export default function NoviRacunScreen({ navigation }) {
  const [trgovine, setTrgovine] = useState([]);
  const [trgovinaTekst, setTrgovinaTekst] = useState("");
  const [prijedloziTrgovina, setPrijedloziTrgovina] = useState([]);
  const [odabranaTrgovina, setOdabranaTrgovina] = useState(null);
  const [artikal, setArtikal] = useState("");
  const [prijedloziArtikala, setPrijedloziArtikala] = useState([]);
  const [kolicina, setKolicina] = useState("");
  const [cijena, setCijena] = useState("");
  const [stavke, setStavke] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const kolicinaRef = useRef(null);
  const cijenaRef = useRef(null);

  useEffect(() => {
    const ucitajTrgovine = async () => {
      try {
        const data = await getTrgovine();
        setTrgovine(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Greška kod učitavanja trgovina:", error);

        if (error.status === 401) {
          await clearSession();
          navigation.replace("Login");
          return;
        }

        Alert.alert("Greška", error.message || "Ne mogu učitati trgovine.");
      }
    };

    ucitajTrgovine();
  }, [navigation]);

  const pretraziTrgovine = (text) => {
    setTrgovinaTekst(text);
    setOdabranaTrgovina(null);

    if (!text) {
      setPrijedloziTrgovina([]);
      return;
    }

    setPrijedloziTrgovina(
      trgovine.filter((t) => t.name.toLowerCase().includes(text.toLowerCase()))
    );
  };

  const izaberiTrgovinu = (trgovina) => {
    setOdabranaTrgovina(trgovina);
    setTrgovinaTekst(trgovina.name);
    setPrijedloziTrgovina([]);
    Keyboard.dismiss();
  };

  const pretraziArtikle = (text) => {
    setArtikal(text);

    if (/\d/.test(text) || text.length === 0) {
      setPrijedloziArtikala([]);
      return;
    }

    setPrijedloziArtikala(
      BAZA_ARTIKALA.filter((a) => a.toLowerCase().includes(text.toLowerCase()))
    );
  };

  const izaberiArtikal = (ime) => {
    setArtikal(ime);
    setPrijedloziArtikala([]);
    kolicinaRef.current?.focus();
  };

  const dodajStavku = () => {
    const kol = parseFloat(kolicina.replace(",", "."));
    const cij = parseFloat(cijena.replace(",", "."));

    if (!artikal.trim() || !kol || !cij || kol <= 0 || cij <= 0) {
      Alert.alert("Fale podaci", "Unesite naziv artikla, količinu i cijenu.");
      return;
    }

    const iznos = kol * cij;

    setStavke((prev) => [
      {
        id: Date.now().toString(),
        naziv: artikal.trim(),
        kolicina: kol,
        cijena: cij,
        iznos,
        tekst: `🔸 ${artikal.trim()}: ${kol} x ${cij} KM = ${iznos.toFixed(2)} KM`,
      },
      ...prev,
    ]);

    setArtikal("");
    setKolicina("");
    setCijena("");
    Keyboard.dismiss();
  };

  const obrisiStavku = (id) => {
    setStavke((prev) => prev.filter((s) => s.id !== id));
  };

  const izracunajUkupno = () => stavke.reduce((suma, s) => suma + s.iznos, 0);

  const izdajRacun = async () => {
    if (submitting) return;
    if (!odabranaTrgovina) return Alert.alert("Greška", "Odaberite trgovinu iz padajućeg menija!");
    if (stavke.length === 0) return Alert.alert("Greška", "Dodajte barem jednu stavku na račun.");

    const ukupanIznos = izracunajUkupno();

    setSubmitting(true);

    try {
      const data = await createRacun({
        narudzbaId: null,
        trgovinaId: odabranaTrgovina.id,
        stavke: stavke.map((stavka) => ({
          naziv: stavka.naziv,
          kolicina: stavka.kolicina,
          jedinica: "kg/kom",
          cijena: stavka.cijena,
          status: "ISPORUCENO",
        })),
      });

      if (data?.success) {
        Alert.alert("✅ Proknjiženo", `Račun od ${Number(data.iznos ?? ukupanIznos).toFixed(2)} KM je dodat za ${odabranaTrgovina.name}!`);
        navigation.goBack();
      }
    } catch (error) {
      console.error(error);

      if (error.status === 401) {
        await clearSession();
        navigation.replace("Login");
        return;
      }

      Alert.alert("Greška", error.message || "Nije moguće napraviti račun.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>✍️ Brza Kasa</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>1. Odaberi trgovinu:</Text>
        <TextInput
          style={[styles.inputVeliki, odabranaTrgovina && styles.inputUspjesno]}
          placeholder="Počni kucati (npr. Trgovina Centar)..."
          placeholderTextColor="#999"
          value={trgovinaTekst}
          onChangeText={pretraziTrgovine}
          editable={!submitting}
        />

        {prijedloziTrgovina.length > 0 && (
          <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled">
            {prijedloziTrgovina.map((item) => (
              <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => izaberiTrgovinu(item)}>
                <Text style={styles.dropdownText}>🏢 {item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.label}>2. Šta kupuje?</Text>
        <TextInput
          style={styles.inputVeliki}
          placeholder="Npr. Jabuka..."
          placeholderTextColor="#999"
          value={artikal}
          onChangeText={pretraziArtikle}
          returnKeyType="next"
          onSubmitEditing={() => kolicinaRef.current?.focus()}
          editable={!submitting}
        />

        {prijedloziArtikala.length > 0 && (
          <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled">
            {prijedloziArtikala.map((item) => (
              <TouchableOpacity key={item} style={styles.dropdownItem} onPress={() => izaberiArtikal(item)}>
                <Text style={styles.dropdownText}>🍎 {item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.row}>
          <TextInput
            ref={kolicinaRef}
            style={[styles.inputVeliki, styles.halfInput]}
            placeholder="Količina"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={kolicina}
            onChangeText={setKolicina}
            returnKeyType="next"
            onSubmitEditing={() => cijenaRef.current?.focus()}
            editable={!submitting}
          />

          <Text style={styles.xText}>X</Text>

          <TextInput
            ref={cijenaRef}
            style={[styles.inputVeliki, styles.halfInput]}
            placeholder="Cijena KM"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={cijena}
            onChangeText={setCijena}
            returnKeyType="done"
            editable={!submitting}
          />
        </View>

        <TouchableOpacity style={styles.addButton} onPress={dodajStavku} disabled={submitting}>
          <Text style={styles.addButtonText}>➕ DODAJ STAVKU</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={stavke}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <View style={styles.stavkaCard}>
            <View style={styles.stavkaInfo}>
              <Text style={styles.stavkaIme}>🔸 {item.naziv}</Text>
              <Text style={styles.stavkaDetalji}>
                {item.kolicina} x {item.cijena} KM = <Text style={styles.stavkaIznos}>{item.iznos.toFixed(2)} KM</Text>
              </Text>
            </View>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => obrisiStavku(item.id)} disabled={submitting}>
              <Text style={styles.deleteBtnText}>❌</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {stavke.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.totalBox}>
            <Text style={styles.totalText}>UKUPNO:</Text>
            <Text style={styles.totalAmount}>{izracunajUkupno().toFixed(2)} KM</Text>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={izdajRacun} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>✔️ PROKNJIŽI</Text>}
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
  formContainer: { backgroundColor: "#fff", padding: 20, margin: 15, borderRadius: 15, elevation: 4 },
  label: { fontSize: 20, fontWeight: "bold", color: "#555", marginBottom: 8 },
  inputVeliki: { backgroundColor: "#F5F5F5", borderWidth: 2, borderColor: "#ccc", padding: 16, borderRadius: 12, fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 15 },
  inputUspjesno: { borderColor: "#4CAF50", backgroundColor: "#eafbee" },
  dropdown: { maxHeight: 150, backgroundColor: "#fff", borderWidth: 2, borderColor: "#007AFF", borderRadius: 12, marginBottom: 15, marginTop: -10, elevation: 5 },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
  dropdownText: { fontSize: 22, color: "#333", fontWeight: "bold" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  halfInput: { flex: 1, textAlign: "center" },
  xText: { fontSize: 24, fontWeight: "900", color: "#aaa", marginHorizontal: 10, marginBottom: 15 },
  addButton: { backgroundColor: "#FF9800", padding: 18, borderRadius: 12, alignItems: "center", borderWidth: 2, borderColor: "#E65100" },
  addButtonText: { color: "white", fontSize: 22, fontWeight: "900", textTransform: "uppercase" },
  stavkaCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: 15, borderRadius: 12, marginHorizontal: 15, marginBottom: 10, borderWidth: 1, borderColor: "#ccc" },
  stavkaInfo: { flex: 1 },
  stavkaIme: { fontSize: 22, fontWeight: "bold", color: "#333" },
  stavkaDetalji: { fontSize: 18, color: "#666", marginTop: 5 },
  stavkaIznos: { fontWeight: "900", color: "#d9534f" },
  deleteBtn: { backgroundColor: "#ffebee", paddingVertical: 15, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: "#ffcdd2" },
  deleteBtnText: { fontSize: 20, color: "#d9534f", fontWeight: "bold" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", padding: 15, borderTopWidth: 2, borderTopColor: "#ccc", flexDirection: "row", alignItems: "center" },
  totalBox: { flex: 1, marginRight: 15 },
  totalText: { fontSize: 16, fontWeight: "bold", color: "#666" },
  totalAmount: { fontSize: 28, fontWeight: "900", color: "#d9534f" },
  submitButton: { backgroundColor: "#4CAF50", paddingVertical: 18, paddingHorizontal: 25, borderRadius: 12, elevation: 3, minWidth: 145, alignItems: "center" },
  submitButtonText: { color: "white", fontSize: 20, fontWeight: "900" },
});
