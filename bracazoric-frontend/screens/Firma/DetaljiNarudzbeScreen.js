import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Keyboard, ActivityIndicator } from "react-native";
import { createRacun, clearSession } from "../../services/api";

export default function DetaljiNarudzbeScreen({ route, navigation }) {
  const { narudzba } = route.params;
  const [cijene, setCijene] = useState({});
  const [stvarneKolicine, setStvarneKolicine] = useState({});
  const [nemaNaStanju, setNemaNaStanju] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const cijenaRefs = useRef({});

  const toggleNemaNaStanju = (id) => {
    setNemaNaStanju((prev) => ({ ...prev, [id]: !prev[id] }));

    if (!nemaNaStanju[id]) {
      setStvarneKolicine((prev) => ({ ...prev, [id]: "" }));
      setCijene((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const pripremiRacun = () => {
    let ukupno = 0;
    let sveIspunjeno = true;

    const stavke = narudzba.proizvodi.map((p) => {
      if (nemaNaStanju[p.id]) {
        return {
          naziv: p.naziv,
          trazeno: p.naziv,
          kolicina: null,
          jedinica: "kg/kom",
          cijena: null,
          status: "NEMA_NA_STANJU",
        };
      }

      const kolicina = parseFloat((stvarneKolicine[p.id] || "").replace(",", "."));
      const cijena = parseFloat((cijene[p.id] || "").replace(",", "."));

      if (!kolicina || !cijena || kolicina <= 0 || cijena <= 0) {
        sveIspunjeno = false;
      } else {
        ukupno += kolicina * cijena;
      }

      return {
        naziv: p.naziv,
        trazeno: p.naziv,
        kolicina,
        jedinica: "kg/kom",
        cijena,
        status: "ISPORUCENO",
      };
    });

    return { ukupno, sveIspunjeno, stavke };
  };

  const napraviRacun = async () => {
    if (submitting) return;

    const { ukupno, sveIspunjeno, stavke } = pripremiRacun();

    if (!sveIspunjeno) {
      Alert.alert(
        "⚠️ Greška pri unosu",
        "Ili unesite količinu i cijenu za svaku stavku, ili označite 'NEMA NA STANJU'."
      );
      return;
    }

    if (ukupno === 0 && !Object.values(nemaNaStanju).includes(true)) {
      Alert.alert("Greška", "Račun ne može biti 0 KM.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await createRacun({
        narudzbaId: narudzba.id,
        trgovinaId: narudzba.trgovinaId,
        stavke,
      });

      if (data?.success) {
        Alert.alert(
          "✅ Gotovo",
          `Račun od ${Number(data.iznos ?? ukupno).toFixed(2)} KM je proknjižen!`
        );
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

  const renderHeader = () => (
    <View style={styles.headerBox}>
      <Text style={styles.subtitle}>Obrada za trgovinu:</Text>
      <Text style={styles.shopName}>{narudzba.trgovinaIme}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={narudzba.proizvodi}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
        renderItem={({ item }) => {
          const nedostaje = nemaNaStanju[item.id];

          return (
            <View style={[styles.itemCard, nedostaje && styles.itemCardNema]}>
              <View style={styles.itemTopRow}>
                <Text style={[styles.itemName, nedostaje && styles.itemTextNema]}>{item.naziv}</Text>
                <TouchableOpacity
                  style={[styles.nemaBtn, nedostaje && styles.nemaBtnAktivno]}
                  onPress={() => toggleNemaNaStanju(item.id)}
                  disabled={submitting}
                >
                  <Text style={[styles.nemaBtnText, nedostaje && styles.nemaTextAktivno]}>
                    {nedostaje ? "❌ NEMA" : "Nema na stanju?"}
                  </Text>
                </TouchableOpacity>
              </View>

              {!nedostaje && (
                <View style={styles.inputsRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Težina (kg):</Text>
                    <TextInput
                      style={styles.compactInput}
                      placeholder={item.kolicina.toString()}
                      placeholderTextColor="#bbb"
                      keyboardType="numeric"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => cijenaRefs.current[item.id]?.focus()}
                      value={stvarneKolicine[item.id] || ""}
                      onChangeText={(text) =>
                        setStvarneKolicine((prev) => ({ ...prev, [item.id]: text }))
                      }
                      editable={!submitting}
                    />
                  </View>

                  <Text style={styles.xText}>X</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Cijena (KM):</Text>
                    <TextInput
                      style={styles.compactInput}
                      ref={(el) => (cijenaRefs.current[item.id] = el)}
                      placeholder="0.00"
                      placeholderTextColor="#bbb"
                      keyboardType="numeric"
                      returnKeyType="done"
                      value={cijene[item.id] || ""}
                      onChangeText={(text) =>
                        setCijene((prev) => ({ ...prev, [item.id]: text }))
                      }
                      editable={!submitting}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      <View style={styles.bottomBar}>
        <View style={styles.totalBox}>
          <Text style={styles.totalText}>UKUPNO:</Text>
          <Text style={styles.totalAmount}>{pripremiRacun().ukupno.toFixed(2)} KM</Text>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={napraviRacun} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>✔️ IZDAJ RAČUN</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  headerBox: { backgroundColor: "#fff", padding: 15, margin: 10, borderRadius: 10, borderWidth: 1, borderColor: "#ddd" },
  subtitle: { fontSize: 16, color: "#666", textTransform: "uppercase" },
  shopName: { fontSize: 24, fontWeight: "900", color: "#333", marginTop: 2 },
  itemCard: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginHorizontal: 10, marginBottom: 10, borderWidth: 1, borderColor: "#ccc" },
  itemCardNema: { backgroundColor: "#ffebee", borderColor: "#ef9a9a", opacity: 0.8 },
  itemTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  itemName: { fontSize: 22, fontWeight: "bold", color: "#222", flex: 1 },
  itemTextNema: { textDecorationLine: "line-through", color: "#d9534f" },
  nemaBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: "#999", backgroundColor: "#f9f9f9" },
  nemaBtnAktivno: { backgroundColor: "#d9534f", borderColor: "#c9302c" },
  nemaBtnText: { fontSize: 14, fontWeight: "bold", color: "#555" },
  nemaTextAktivno: { color: "#fff" },
  inputsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 5, borderTopWidth: 1, borderTopColor: "#eee" },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 14, fontWeight: "bold", color: "#666", marginBottom: 4 },
  compactInput: { backgroundColor: "#fff", borderWidth: 2, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 22, fontWeight: "bold", color: "#222", textAlign: "center" },
  xText: { fontSize: 20, fontWeight: "900", color: "#888", marginHorizontal: 15, marginTop: 20 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", padding: 15, borderTopWidth: 1, borderTopColor: "#ddd", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalBox: { flex: 1, marginRight: 15 },
  totalText: { fontSize: 14, fontWeight: "bold", color: "#666" },
  totalAmount: { fontSize: 28, fontWeight: "900", color: "#333" },
  submitButton: { backgroundColor: "#4CAF50", paddingVertical: 18, paddingHorizontal: 25, borderRadius: 10, elevation: 3, minWidth: 150, alignItems: "center" },
  submitButtonText: { color: "white", fontSize: 20, fontWeight: "900" },
});
