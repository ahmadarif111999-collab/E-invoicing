export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    ok: true,
    service: 'fbr-invoicing-platform',
    mode: process.env.FBR_MODE || 'mock',
    timestamp: new Date().toISOString()
  });
}
