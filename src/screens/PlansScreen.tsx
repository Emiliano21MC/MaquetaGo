import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Badge, Button, Card, Page, s } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { money } from "@/utils/pricing";
export default function PlansScreen() {
  const { unlocked } = useLocalSearchParams<{ unlocked?: string }>();
  const { catalogPlans, account } = useApp();
  return (
    <Page
      title="Planes de suscripción"
      footer={
        <Button
          secondary
          title="Continuar sin plan (tarifa regular)"
          onPress={() => router.replace("/(tabs)")}
        />
      }
    >
      {unlocked === "1" && (
        <Card>
          <Badge>Planes desbloqueados</Badge>
          <Text style={s.bold}>Gracias por confiar tu primera maqueta</Text>
          <Text style={s.subtitle}>
            Suscribirte es opcional. Puedes seguir programando traslados a
            tarifa estándar.
          </Text>
        </Card>
      )}
      <Text style={s.title}>Ahorra en cada entrega</Text>
      <Text style={s.subtitle}>
        Elige un descuento recurrente y habilita las Alertas de Calendario
        Académico. Puedes omitir esta oferta y volver cuando quieras.
      </Text>
      {!account?.plansUnlocked && (
        <Text style={s.subtitle}>
          Completa y califica tu primer traslado para contratar un plan.
        </Text>
      )}
      {catalogPlans.map((plan) => (
        <Card key={plan.id}>
          <View style={s.row}>
            <Text style={[s.bold, { flex: 1 }]}>{plan.name}</Text>
            {plan.badge && <Badge>{plan.badge}</Badge>}
          </View>
          <Text style={s.title}>{plan.discountPercent}% de descuento</Text>
          <Text style={[s.title, s.numeric]}>
            {money(plan.price)}
            <Text style={s.subtitle}> / {plan.period}</Text>
          </Text>
          <Text style={s.subtitle}>
            Descuento automático en cada viaje durante {plan.validityDays} días.
          </Text>
          <View style={s.divider} />
          <Text style={s.text}>✓ Alertas de Calendario Académico</Text>
          <Text style={s.subtitle}>
            ✓ Avisos 48 horas antes y acceso para agendar entregas
          </Text>
          <Text style={s.subtitle}>
            ✓ MaquetaSegura opcional hasta {money(plan.insuranceLimit)}
          </Text>
          <Text style={s.subtitle}>
            Los traslados se pagan por separado con el descuento del plan.
          </Text>
          <Button
            title="Suscribirme"
            disabled={!account?.plansUnlocked}
            onPress={() =>
              router.push({ pathname: "/payment", params: { planId: plan.id } })
            }
          />
        </Card>
      ))}
    </Page>
  );
}
