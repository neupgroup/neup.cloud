import { handleDownloadPost } from '@/services/server/download-route';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return handleDownloadPost(request);
}
