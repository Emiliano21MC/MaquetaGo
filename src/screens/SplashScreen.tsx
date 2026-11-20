import React, { forwardRef, useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Path,
  Pattern,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors as c } from "@/theme/tokens";
import { useApp } from "@/context/AppContext";
const AnimationPath = forwardRef<
  React.ComponentRef<typeof Path>,
  React.ComponentProps<typeof Path> & { collapsable?: boolean }
>((props, ref) => {
  const svgProps = { ...props };
  delete svgProps.collapsable;
  return <Path ref={ref} {...svgProps} />;
});
AnimationPath.displayName = "AnimationPath";
const AnimatedPath = Animated.createAnimatedComponent(AnimationPath);
export default function SplashScreen() {
  const { state } = useApp();
  const [progress] = useState(() => new Animated.Value(0));
  const [done, setDone] = useState(false);
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 2600,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) setDone(true);
    });
    return () => animation.stop();
  }, [progress]);
  useEffect(() => {
    if (done && state.ready) router.replace(state.user ? "/(tabs)" : "/signin");
  }, [done, state.ready, state.user]);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.navy,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StatusBar style="light" />
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="grid"
            width={32}
            height={32}
            patternUnits="userSpaceOnUse"
          >
            <Path
              d="M32 0H0V32"
              fill="none"
              stroke="white"
              strokeOpacity={0.04}
            />
          </Pattern>
          <RadialGradient id="vignette">
            <Stop offset="0" stopColor="#0F2537" stopOpacity={0} />
            <Stop offset="1" stopColor="#091724" stopOpacity={0.9} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grid)" />
        <Rect width="100%" height="100%" fill="url(#vignette)" />
      </Svg>
      <Svg width={126} height={126} viewBox="0 0 112 112" fill="none">
        <Polygon
          points="56,18 88,36 56,54 24,36"
          fill={c.bright}
          fillOpacity={0.15}
        />
        <Polygon
          points="56,54 88,36 88,72 56,90"
          fill={c.teal}
          fillOpacity={0.25}
        />
        <AnimatedPath
          d="M56 18L88 36V72L56 90L24 72V36Z M24 36L56 54L88 36 M56 54V90"
          stroke="white"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeDasharray="400"
          strokeDashoffset={progress.interpolate({
            inputRange: [0, 0.65, 1],
            outputRange: [400, 0, 0],
          })}
        />
        <AnimatedPath
          d="M16 78L56 100L86 78"
          stroke={c.bright}
          strokeWidth={3.2}
          strokeDasharray="100"
          strokeDashoffset={progress.interpolate({
            inputRange: [0, 0.4, 0.85, 1],
            outputRange: [100, 100, 0, 0],
          })}
        />
        <Circle cx={86} cy={78} r={5} fill={c.bright} />
      </Svg>
      <Text
        style={{
          fontSize: 38,
          color: c.white,
          fontWeight: "700",
          letterSpacing: -1.4,
          marginTop: 18,
        }}
      >
        Maqueta<Text style={{ color: c.bright }}>Go</Text>
      </Text>
      <Text
        style={{
          color: "#CBD5E1",
          fontSize: 10,
          letterSpacing: 2,
          marginTop: 12,
        }}
      >
        MOVILIDAD PARA ARQUITECTURA
      </Text>
      <View
        style={{
          width: 140,
          height: 3,
          backgroundColor: "#FFFFFF22",
          marginTop: 38,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            height: 3,
            backgroundColor: c.bright,
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          }}
        />
      </View>
      <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 18 }}>
        Traslado seguro de maquetas
      </Text>
    </View>
  );
}
