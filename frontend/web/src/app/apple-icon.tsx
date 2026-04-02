import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 180,
                    height: 180,
                    background: "#0D1B4B",
                    borderRadius: 40,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                }}
            >
                {/* Otter wave mark */}
                <div
                    style={{
                        color: "#C8960A",
                        fontSize: 96,
                        fontWeight: 900,
                        fontFamily: "serif",
                        lineHeight: 1,
                    }}
                >
                    O
                </div>
                <div
                    style={{
                        color: "#4A9EB5",
                        fontSize: 22,
                        fontWeight: 700,
                        fontFamily: "sans-serif",
                        letterSpacing: 3,
                        lineHeight: 1,
                    }}
                >
                    PAY
                </div>
            </div>
        ),
        { ...size }
    );
}
