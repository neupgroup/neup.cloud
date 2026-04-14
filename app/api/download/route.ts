import { handleDownloadPost } from '@/services/api/download';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return handleDownloadPost(request);
}
