import { ImageResponse } from "next/og";

// Next.js serves this at /icon.png and auto-adds <link rel="icon"> in <head>.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
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
          top: 2,
          left: 4,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#f5b3ca",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 2,
          right: 4,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#f5b3ca",
        }}
      />
      {/* Face */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff7fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Snout */}
        <div
          style={{
            width: 14,
            height: 10,
            borderRadius: "50%",
            background: "#fad4e1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
          }}
        >
          <div
            style={{
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "#c25c7d",
            }}
          />
          <div
            style={{
              width: 3,
              height: 3,
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
