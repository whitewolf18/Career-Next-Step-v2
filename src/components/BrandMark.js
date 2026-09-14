import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { Brand } from "../theme/brand";

export default function BrandMark({ size = 44 }) {
  const radius = Math.round(size * 0.34);
  const dot = Math.max(10, Math.round(size * 0.3));

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={Brand.gradientPurple}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[
          styles.mark,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
        ]}
      >
        <Text
          style={[
            styles.letter,
            { fontSize: Math.round(size * 0.5) },
          ]}
        >
          C
        </Text>

        <View
          style={[
            styles.accent,
            {
              width: dot,
              height: dot,
              borderRadius: Math.round(dot / 2),
            },
          ]}
        >
          <Text
            style={[
              styles.accentText,
              { fontSize: Math.round(dot * 0.6) },
            ]}
          >
            {"\u2191"}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Brand.surfaceRaised,
    ...Brand.shadow.lift,
  },
  letter: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  accent: {
    position: "absolute",
    right: 1,
    bottom: 1,
    backgroundColor: Brand.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  accentText: {
    color: "#0D0D0F",
    fontWeight: "800",
  },
});
