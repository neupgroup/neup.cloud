import { getApplication } from "@/app/(main)/server/applications/actions";
import { Application } from "@/app/(main)/server/applications/types";

export async function getApplicationFilesPageData(params: Promise<{ id: string }>) {
    const { id } = await params;
    const application = (await getApplication(id)) as Application | null;
    return { id, application };
}
