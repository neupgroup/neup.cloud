
'use client';

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyButton({ textToCopy }: { textToCopy: string }) {
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            setIsCopied(true);
            toast({ title: "Copied!", description: `"${textToCopy}" copied to clipboard.`});
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            toast({ variant: 'destructive', title: "Failed to copy"});
        }
    };

    return (
        <Button variant="ghost" size="icon" onClick={handleCopy}>
            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">Copy</span>
        </Button>
    );
}
