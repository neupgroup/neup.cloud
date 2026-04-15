'use server';

import { revalidatePath } from 'next/cache';

import { executeCommand } from '@/services/saved-commands/command-execution-service';

import { getApplication } from './application-crud';
import { getSelectedServerId } from './application-session';

export async function deployConfiguration(applicationId: string) {
  const app = await getApplication(applicationId);
  if (!app) throw new Error('Application not found');

  const serverId = await getSelectedServerId();
  if (!serverId) throw new Error('No server selected. Please select a server first.');

  const location = app.location;
  if (!location) throw new Error('Application location not defined');

  let envContent = '';
  if (app.environments) {
    envContent = Object.entries(app.environments)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }

  const envCommand = `cat <<'EOF' > "${location}/.env"
${envContent}
EOF
`;

  await executeCommand(serverId, envCommand, `Deploying .env for ${app.name}`, envCommand);

  if (app.files && Object.keys(app.files).length > 0) {
    let fileOpsScript = 'echo "Starting Custom File Deployment..."\\n';

    for (const [filePath, content] of Object.entries(app.files)) {
      const delimiter = `EOF_${Math.random().toString(36).substring(7).toUpperCase()}`;
      const targetPath = `${location}/${filePath}`;

      fileOpsScript += `
mkdir -p "$(dirname "${targetPath}")"
cat <<'${delimiter}' > "${targetPath}"
${content}
${delimiter}
echo "Deployed ${filePath}"
`;
    }

    await executeCommand(
      serverId,
      fileOpsScript,
      `Deploying ${Object.keys(app.files).length} custom files for ${app.name}`,
      fileOpsScript
    );
  }

  revalidatePath(`/server/applications/${applicationId}`);
  return { success: true };
}
