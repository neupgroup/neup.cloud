'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NotFound() {
    const [joke, setJoke] = useState("");

    useEffect(() => {
        const jokes = [
            "It works on my machine.",
            "I swear I pushed that commit.",
            "It must be a caching issue.",
            "The user is holding it wrong.",
            "It was working 5 minutes ago.",
            "That's a hardware problem.",
            "We'll fix it in post-production.",
            "Have you tried refreshing?",
            "This feature is coming soon™.",
            "Git blame says it was you.",
            "Unexpected token: You.",
            "A 404 is just a page playing hide and seek.",
            "Task failed successfully."
        ];
        setJoke(jokes[Math.floor(Math.random() * jokes.length)]);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
            <div className="bg-muted/30 p-6 rounded-full mb-6">
                <FileQuestion className="h-16 w-16 text-muted-foreground" />
            </div>
            <h1 className="text-4xl font-bold font-headline tracking-tight mb-2">
                404, Page Not Found
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mb-8">
                {joke && (
                    <span className="block mt-2 italic text-foreground/80">
                        One of our developers said &quot;{joke}&quot;
                    </span>
                )}
            </p>

            <div className="flex gap-4">
                <Button asChild size="lg">
                    <Link href="/">
                        Return Home
                    </Link>
                </Button>
            </div>
        </div>
    );
}
