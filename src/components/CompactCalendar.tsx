import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { dateKey } from "@/utils/dates";
import { s } from "@/components/ui";
import { colors as c } from "@/theme/tokens";
export function CompactCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [month, setMonth] = useState(
    () => new Date(`${value.slice(0, 7)}-01T12:00:00`),
  );
  const start = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = dateKey();
  return (
    <View style={{ gap: 14 }}>
      <View style={s.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
          style={{ padding: 10 }}
        >
          <Text style={s.bold}>‹</Text>
        </Pressable>
        <Text style={[s.bold, { textTransform: "capitalize" }]}>
          {month.toLocaleDateString("es-PE", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
          style={{ padding: 10 }}
        >
          <Text style={s.bold}>›</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row" }}>
        {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((d) => (
          <Text
            key={d}
            style={[s.label, { width: "14.2857%", textAlign: "center" }]}
          >
            {d}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from(
          { length: Math.ceil((days + start) / 7) * 7 },
          (_, index) => {
            const day = index - start + 1;
            const key = dateKey(
              new Date(month.getFullYear(), month.getMonth(), day),
            );
            const blank = day < 1 || day > days;
            const disabled = blank || key < today;
            return (
              <View key={index} style={{ width: "14.2857%", padding: 2 }}>
                <Pressable
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={key}
                  accessibilityState={{ selected: value === key, disabled }}
                  onPress={() => onChange(key)}
                  style={{
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 7,
                    backgroundColor:
                      !blank && key === value ? c.teal : "transparent",
                    borderWidth: key === today ? 1 : 0,
                    borderColor: c.teal,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color:
                        value === key ? c.white : disabled ? c.strong : c.navy,
                    }}
                  >
                    {blank ? "" : day}
                  </Text>
                </Pressable>
              </View>
            );
          },
        )}
      </View>
    </View>
  );
}
