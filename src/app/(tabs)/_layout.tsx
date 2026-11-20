import { Tabs } from "expo-router";
import { Icon } from "@/components/Icon";
import { colors as c } from "@/theme/tokens";
import { useApp } from "@/context/AppContext";
export default function TabLayout() {
  const { account } = useApp();
  const count = account?.trips.filter((t) => !t.completed).length ?? 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.teal,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.white,
          borderTopColor: c.border,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ focused }) => <Icon name="home" color={focused ? c.teal : c.muted} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Mis viajes",
          tabBarBadge: count || undefined,
          tabBarBadgeStyle: { backgroundColor: c.teal },
          tabBarIcon: ({ focused }) => <Icon name="trips" color={focused ? c.teal : c.muted} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ focused }) => <Icon name="profile" color={focused ? c.teal : c.muted} />,
        }}
      />
    </Tabs>
  );
}
