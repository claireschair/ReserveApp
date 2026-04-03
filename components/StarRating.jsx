import { View, TouchableOpacity, StyleSheet } from "react-native";
import ThemedText from "./ThemedText";

export default function StarRating({
  rating = 0,
  count,
  maxStars = 5,
  size = 16,
  interactive = false,
  onRate,
}) {
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  function handlePress(value) {
    if (interactive && onRate) onRate(value);
  }

  return (
    <View style={styles.row}>
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => handlePress(star)}
          disabled={!interactive}
          activeOpacity={interactive ? 0.7 : 1}
          style={{ padding: interactive ? 4 : 1 }}
        >
          <ThemedText
            style={[
              styles.star,
              { fontSize: size },
              star <= Math.round(rating) ? styles.starFilled : styles.starEmpty,
            ]}
          >
            {star <= Math.round(rating) ? "\u2605" : "\u2606"}
          </ThemedText>
        </TouchableOpacity>
      ))}
      {count !== undefined && (
        <ThemedText style={[styles.count, { fontSize: size - 2 }]}>
          {rating > 0 ? `${rating.toFixed(1)} (${count})` : `No ratings yet`}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  star: {
    lineHeight: undefined,
  },
  starFilled: {
    color: "#F5A623",
  },
  starEmpty: {
    color: "#ccc",
  },
  count: {
    color: "#888",
    marginLeft: 4,
  },
});