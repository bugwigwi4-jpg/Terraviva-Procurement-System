import { ImageResponse } from 'next/og';
import { LOGO_SVG } from '@/lib/logo-svg';

const SIZES = [180, 192, 512];

export const dynamicParams = false;
export function generateStaticParams() {
  return SIZES.map((s) => ({ size: String(s) }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const n = SIZES.includes(Number(size)) ? Number(size) : 512;
  const inner = Math.round(n * 0.68); // keeps the logo inside the "safe zone" of round app icons
  const src = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fefef0' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={inner} height={inner} alt="" />
      </div>
    ),
    { width: n, height: n, headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  );
}
