import Svg, { Circle, Path } from "react-native-svg";
export function Icon({
  name,
  color = "#0F2537",
  size = 22,
}: {
  name: "home" | "trips" | "profile" | "lock" | "unlock";
  color?: string;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "home" && <Path d="M3 10L12 3L21 10V20H15V14H9V20H3Z" />}
      {name === "trips" && (
        <>
          <Path d="M7 4H20V21H4V7M8 3V8H17M8 12H16M8 16H14" />
          <Circle cx={5} cy={4} r={2} />
        </>
      )}
      {name === "profile" && (
        <>
          <Circle cx={12} cy={7} r={4} />
          <Path d="M4 21V19A8 8 0 0 1 20 19V21Z" />
        </>
      )}
      {(name === "lock" || name === "unlock") && (
        <>
          <Path d="M7 11V7A5 5 0 0 1 17 7" />
          <Path
            d={
              name === "lock"
                ? "M17 7V11M5 11H19V21H5ZM12 15V17"
                : "M5 11H19V21H5ZM12 15V17"
            }
          />
        </>
      )}
    </Svg>
  );
}
