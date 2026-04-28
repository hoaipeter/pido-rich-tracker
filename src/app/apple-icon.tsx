import { ImageResponse } from "next/og";

// Next.js serves this at /apple-icon.png and auto-adds <link rel="apple-touch-icon">.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        borderRadius: 40,
        background: "linear-gradient(135deg, #fad4e1 0%, #df7396 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Ears */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 22,
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "#f5b3ca",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 18,
          right: 22,
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "#f5b3ca",
        }}
      />
      {/* Inner ear */}
      <div
        style={{
          position: "absolute",
          top: 25,
          left: 29,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#ec8eae",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 25,
          right: 29,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#ec8eae",
        }}
      />
      {/* Face */}
      <div
        style={{
          width: 130,
          height: 130,
          borderRadius: "50%",
          background: "#fff7fa",
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {/* Eyes */}
        <div style={{ display: "flex", gap: 28 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#5a2c3e",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#5a2c3e",
            }}
          />
        </div>
        {/* Snout */}
        <div
          style={{
            width: 70,
            height: 52,
            borderRadius: "50%",
            background: "#fad4e1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 16,
              height: 13,
              borderRadius: "50%",
              background: "#c25c7d",
            }}
          />
          <div
            style={{
              width: 16,
              height: 13,
              borderRadius: "50%",
              background: "#c25c7d",
            }}
          />
        </div>
      </div>
    </div>,
    { ...size },
  );
}
