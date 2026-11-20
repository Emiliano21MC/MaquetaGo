import React, { useEffect, useState } from "react";
import { Image, Text } from "react-native";
import { api } from "@/services/api";
import { s } from "@/components/ui";
export function PhotoPreview({ uri, label, revision = "" }: { uri: string; label: string; revision?: string }) {
  const versionedPath=uri+"#"+revision;
  const [result, setResult] = useState<{ path: string; uri: string } | null>(
    null,
  );
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .image(uri)
      .then((data) => {
        if (active) {
          setResult({ path: versionedPath, uri: data.uri });
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [uri, versionedPath]);
  return result?.path === versionedPath ? (
    <Image
      accessibilityLabel={label}
      source={{ uri: result.uri }}
      style={{ height: 160, width: "100%", borderRadius: 8 }}
      resizeMode="cover"
    />
  ) : (
    <Text style={s.subtitle}>
      {error
        ? "No se pudo cargar la foto. Revisa tu conexión."
        : "Cargando fotografía…"}
    </Text>
  );
}
