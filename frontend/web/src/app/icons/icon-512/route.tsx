import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 512,
                    height: 512,
                    background: "#0D1B4B",
                    borderRadius: 112,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                }}
            >
                <div
                    style={{
                        color: "#C8960A",
                        fontSize: 288,
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
                        fontSize: 64,
                        fontWeight: 700,
                        fontFamily: "sans-serif",
                        letterSpacing: 12,
                        lineHeight: 1,
                        marginTop: -24,
                    }}
                >
                    PAY
                </div>
            </div>
        ),
        {
            width: 512,
            height: 512,
            headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
        }
    );
}
