import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path, Polygon } from "react-native-svg";
import { colors as c } from "@/theme/tokens";
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 112 112" fill="none">
      <Polygon
        points="56,18 88,36 56,54 24,36"
        fill="#2DD4BF"
        fillOpacity={0.15}
      />
      <Polygon
        points="56,54 88,36 88,72 56,90"
        fill="#0D9488"
        fillOpacity={0.25}
      />
      <Polygon
        points="56,18 88,36 88,72 56,90 24,72 24,36"
        stroke="white"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <Path d="M24 36L56 54L88 36M56 54V90" stroke="white" strokeWidth={2.1} />
      <Path d="M16 78L56 100L86 78" stroke={c.bright} strokeWidth={3.2} />
      <Circle cx={86} cy={78} r={5} fill={c.bright} />
    </Svg>
  );
}
export function Brand() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        marginBottom: 26,
      }}
    >
      <View style={{ backgroundColor: c.navy, borderRadius: 7 }}>
        <Logo />
      </View>
      <Text
        style={{
          color: c.navy,
          fontWeight: "700",
          fontSize: 21,
          letterSpacing: -0.6,
        }}
      >
        MaquetaGo
      </Text>
    </View>
  );
}
