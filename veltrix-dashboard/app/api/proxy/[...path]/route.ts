import { NextRequest, NextResponse } from 'next/server';

function backendBaseUrl() {
  const base = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '')
    .trim()
    .replace(/\/$/, '');

  if (!base) {
    throw new Error('Missing API_BASE_URL (or NEXT_PUBLIC_API_BASE_URL) in veltrix-dashboard/.env.local');
  }

  return base;
}

async function proxy(request: NextRequest, path: string[]) {
  try {
    const base = backendBaseUrl();
    const upstreamUrl = new URL(`${base}/${path.join('/')}`);

    request.nextUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const body = hasBody ? await request.text() : undefined;

    const res = await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
      },
      body,
      cache: 'no-store',
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || 'Proxy request failed',
      },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(request, params.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(request, params.path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(request, params.path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(request, params.path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(request, params.path);
}
