import { promisify } from 'util';
import { exec } from 'child_process';
import { readFile, unlink } from 'fs/promises';

const execAsync = promisify(exec);

export async function generateRepositoryKeys() {
  const keyPath = `/tmp/key_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  try {
    await execAsync(`ssh-keygen -t ed25519 -C "neup.cloud-deploy" -f "${keyPath}" -N ""`);
    const privateKey = await readFile(keyPath, 'utf8');
    const publicKey = await readFile(`${keyPath}.pub`, 'utf8');
    await unlink(keyPath).catch(() => {});
    await unlink(`${keyPath}.pub`).catch(() => {});
    return { privateKey, publicKey };
  } catch (error) {
    await unlink(keyPath).catch(() => {});
    await unlink(`${keyPath}.pub`).catch(() => {});
    throw new Error('Failed to generate repository keys');
  }
}
