import { Metadata } from "next";
import ClientPage from "./client-page";

export const metadata: Metadata = {
    title: "Add Domain, Neup.Cloud",
};

export default function Page() {
    return <ClientPage />;
}
