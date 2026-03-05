import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #0f2a4a 0%, #1d4ed8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Accent line — surveying horizon motif */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 4,
            right: 4,
            height: 1,
            background: 'rgba(96, 165, 250, 0.5)',
          }}
        />
        {/* R lettermark */}
        <span
          style={{
            color: 'white',
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'serif',
            lineHeight: 1,
            marginBottom: 2,
            letterSpacing: '-0.5px',
          }}
        >
          R
        </span>
      </div>
    ),
    { ...size }
  );
}
