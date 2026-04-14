import { cookies } from 'next/headers';
import { getApplication, getProcessDetails, getSupervisorProcesses } from "@/app/(main)/server/applications/actions";
import * as NextJs from '@/core/nextjs';
import * as NodeJs from '@/core/nodejs';
import * as Python from '@/core/python';
import * as Go from '@/core/go';

export async function getApplicationDetailPageData(params: Promise<{ id: string }>) {
    const { id } = await params;
    const cookieStore = await cookies();
    const serverName = cookieStore.get('selected_server_name')?.value;

    if (id.startsWith('supervisor_')) {
        const processName = id.slice('supervisor_'.length);
        const [processDetails, supervisorProcesses] = await Promise.all([
            getProcessDetails('supervisor', processName),
            getSupervisorProcesses(),
        ]);
        const summary = Array.isArray(supervisorProcesses)
            ? supervisorProcesses.find((process: any) => process.name === processName)
            : null;
        return { supervisor: true, processName, processDetails, summary, serverName };
    }

    const application = await getApplication(id) as any;
    if (!application) return { notFound: true };
    const appLanguage = application.language === 'next' ? 'Next.js' :
        application.language === 'node' ? 'Node.js' :
            application.language === 'python' ? 'Python' :
                application.language === 'go' ? 'Go' : 'Custom';
    if (!application.commands) {
        application.commands = {};
    }
    const uniquePorts = application.networkAccess?.map(Number).filter((p: number) => !isNaN(p) && p > 0) || [];
    const context = {
        applicationId: application.id,
        appName: application.name,
        appLocation: application.location,
        preferredPorts: uniquePorts,
        entryFile: application.information?.entryFile,
        supervisorServiceName: application.information?.supervisorServiceName,
    };
    let commandsArray: any[] = [];
    if (application.language === 'next') {
        commandsArray = NextJs.getCommands(context);
    } else if (application.language === 'node') {
        commandsArray = NodeJs.getCommands(context);
    } else if (application.language === 'python') {
        commandsArray = Python.getCommands(context);
    } else if (application.language === 'go') {
        commandsArray = Go.getCommands(context);
    }
    commandsArray.forEach((cmdDef: any) => {
        const name = cmdDef.title.toLowerCase();
        const parts = [];
        if (cmdDef.command.preCommand) parts.push(cmdDef.command.preCommand);
        parts.push(cmdDef.command.mainCommand);
        if (cmdDef.command.postCommand) parts.push(cmdDef.command.postCommand);
        application.commands[name] = parts.join('\n');
    });
    application.commandDefinitions = commandsArray;
    return { supervisor: false, application, appLanguage, serverName };
}
