import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 192,
                    height: 192,
                    background: "#0D1B4B",
                    borderRadius: 42,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                }}
            >
                <div
                    style={{
                        color: "#C8960A",
                        fontSize: 108,
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
                        fontSize: 24,
                        fontWeight: 700,
                        fontFamily: "sans-serif",
                        letterSpacing: 4,
                        lineHeight: 1,
                        marginTop: -8,
                    }}
                >
                    PAY
                </div>
            </div>
        ),
        {
            width: 192,
            height: 192,
            headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
        }
    );
}
