import { isSubscriptionActive } from "../../shared/subscriptions";
import { useNow } from "@/hooks/use-now";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Badge, Button, Card, Chip, Field, Page, s } from "@/components/ui";
import { CompactCalendar } from "@/components/CompactCalendar";
import { materials, sizes, timeSlots } from "@/data/limaLocations";
import { useApp } from "@/context/AppContext";
import { peakHour, money } from "@/utils/pricing";
import { isFutureSlot } from "@/utils/dates";
import { useQuote } from "@/hooks/use-quote";
export default function TripDetailsScreen() {
    const { state, account, dispatch } = useApp();
    const now = useNow();
    const { fare, estimated, km, error: quoteError } = useQuote(state.draft);
    const [custom, setCustom] = useState(false);
    const [error, setError] = useState("");
    const d = state.draft;
    if (!account)
        return null;
    const patch = (value: Partial<typeof d>) => dispatch({ type: "DRAFT", patch: value });
    return (<Page title="Programar traslado" footer={<>
          <View style={s.row}>
            <View>
              <Text style={s.subtitle}>
                {fare.discountKind === "PLAN"
                ? fare.discountPercent + "% de descuento con tu plan"
                : fare.promotional
                    ? "Primer traslado · 80% de descuento"
                    : "Tarifa estándar"}
              </Text>
              <Text style={[s.title, s.numeric]}>{money(fare.total)}</Text>
            </View>
            <Text style={s.subtitle}>{estimated ? "—" : km.toFixed(1)} km</Text>
          </View>
          {!!quoteError && <Text accessibilityRole="alert" style={s.subtitle}>{quoteError}</Text>}
          {!!error && (<Text accessibilityRole="alert" style={s.subtitle}>
              {error}
            </Text>)}
          <Button title="Continuar al pago" disabled={estimated} onPress={() => {
                if (!isFutureSlot(d.date, d.time))
                    return setError("Elige una fecha y hora futuras. Para otra hora usa el formato 24 h, por ejemplo 14:30.");
                setError("");
                router.push("/payment");
            }}/>
        </>}>
      <Pressable accessibilityRole="button" onPress={() => router.push("/map")}>
        <Card>
          <Text style={s.label}>{d.pickup.district} → Arquitectura PUCP</Text>
          <Text style={s.bold}>{d.pickup.address}</Text>
        </Card>
      </Pressable>
      <Card>
        <Text style={s.label}>Fecha del traslado</Text>
        <CompactCalendar value={d.date} onChange={(date) => patch({ date })}/>
      </Card>
      <Card>
        <Text style={s.label}>Hora de recojo</Text>
        <View style={s.wrap}>
          {timeSlots.map((time) => (<Chip key={time} title={time + " · " + (peakHour(time) ? "Hora punta" : "Fluido")} selected={!custom && d.time === time} disabled={!isFutureSlot(d.date, time)} onPress={() => {
                setCustom(false);
                patch({ time });
            }}/>))}
          <Chip title="Otra" selected={custom} onPress={() => {
            setCustom(true);
            patch({ time: "" });
        }}/>
        </View>
        {custom && (<Field label="Hora personalizada (24 h)" placeholder="14:30" keyboardType="numbers-and-punctuation" value={d.time} maxLength={5} onChangeText={(time) => patch({ time })}/>)}
      </Card>
      <Card>
        <Text style={s.label}>Tamaño de la maqueta</Text>
        {sizes.map((size) => (<Pressable key={size.id} accessibilityRole="button" accessibilityState={{ selected: d.size === size.id }} onPress={() => patch({ size: size.id })} style={[s.card, { padding: 12 }, d.size === size.id && s.selected]}>
            <View style={s.row}>
              <Text style={s.bold}>{size.name}</Text>
              <Text style={[s.bold, s.numeric, { fontSize: 12 }]}>
                +{money(size.fee)}
              </Text>
            </View>
            <Text style={[s.text, { fontSize: 12 }]}>{size.dimensions}</Text>
            <Text style={[s.subtitle, { fontSize: 11 }]}>{size.detail}</Text>
          </Pressable>))}
      </Card>
      <Card>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: d.insuranceSelected }} onPress={() => patch({ insuranceSelected: !d.insuranceSelected })} style={{ gap: 10, minHeight: 48 }}>
          <Text style={s.bold}>
            {d.insuranceSelected ? "☑" : "☐"} MaquetaSegura opcional ·{" "}
            {money(account.pricing?.microInsuranceFee ?? 2)}
          </Text>
          <Text style={s.subtitle}>
            Protección hasta{" "}
            {money(isSubscriptionActive(account.subscription, now)
            ? account.subscription.insuranceLimit
            : 150)}
            . Se añade después de aplicar el descuento.
          </Text>
        </Pressable>
      </Card>
      <Card>
        <Text style={s.label}>
          Desglose de tarifa {estimated ? "estimada" : ""}
        </Text>
        {[
            ["Base", fare.baseRate],
            ["Distancia", fare.distanceRate],
            ["Tráfico · " + fare.trafficMinutes + " min", fare.trafficRate],
            ["Tamaño", fare.sizeFee],
            ["Descuento · " + fare.discountPercent + "%", -fare.discount],
            ["MaquetaSegura opcional", fare.insuranceFee],
        ].map(([label, value]) => (<View key={String(label)} style={s.row}>
            <Text style={s.subtitle}>{label}</Text>
            <Text style={s.text}>{money(Number(value))}</Text>
          </View>))}
        <Badge>{fare.peak ? "Hora punta" : "Fluido"}</Badge>
      </Card>
      <Card>
        <Text style={s.label}>Material predominante</Text>
        <View style={s.wrap}>
          {materials.map((material) => (<Chip key={material} title={material} selected={d.material === material} onPress={() => patch({ material })}/>))}
        </View>
        <Field label="Indicaciones adicionales (opcional)" placeholder="Cuéntanos qué debemos cuidar de tu maqueta" value={d.notes} onChangeText={(notes) => patch({ notes })} multiline maxLength={600} style={{ minHeight: 90, textAlignVertical: "top" }}/>
        <Badge>Acondicionamiento incluido</Badge>
      </Card>
    </Page>);
}
