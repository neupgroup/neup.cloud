import { cookies } from 'next/headers';

export async function getSelectedServerId() {
  const cookieStore = await cookies();
  return cookieStore.get('selected_server')?.value;
}

export async function getSelectedServerName() {
  const cookieStore = await cookies();
  return cookieStore.get('selected_server_name')?.value;
}
