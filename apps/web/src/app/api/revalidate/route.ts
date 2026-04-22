import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-revalidate-token');
  if (token !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, citySlug, slug } = await req.json() as {
    type: string;
    citySlug?: string;
    slug?: string;
  };

  switch (type) {
    case 'listing':
      if (citySlug && slug) {
        revalidatePath(`/${citySlug}/places/${slug}`);
        revalidatePath(`/${citySlug}/eat`);
        revalidatePath(`/${citySlug}/go-out`);
        revalidatePath(`/${citySlug}/connect`);
        revalidatePath(`/${citySlug}`);
      }
      break;
    case 'event':
      if (citySlug && slug) {
        revalidatePath(`/${citySlug}/events/${slug}`);
        revalidatePath(`/${citySlug}/go-out`);
        revalidatePath(`/${citySlug}/tonight`);
        revalidatePath(`/${citySlug}`);
      }
      break;
    case 'guide':
      if (slug) {
        revalidatePath(`/guides/${slug}`);
      }
      break;
    case 'city':
      if (citySlug) {
        revalidatePath(`/${citySlug}`);
        revalidateTag(`city-${citySlug}`);
      }
      break;
  }

  return NextResponse.json({ revalidated: true, type, citySlug, slug });
}
