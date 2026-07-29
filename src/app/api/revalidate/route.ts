import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.REVALIDATION_SECRET || 'betech_secret_token_2026';

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  try {
    // Purge the entire layout tree to clear all page caches
    revalidatePath('/', 'layout');
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
