"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';
import { useEffect, useState } from 'react';

function getRandomJoke() {
    const jokes = [
        "It worked on my machine!",
        "404: The page took a coffee break.",
        "Our codebase is a maze, you found a wall!",
        "This page is still in beta. Like everything else.",
        "If you find the page, let us know!",
        "¯\\_(ツ)_/¯",
        "Oops! Looks like the page was garbage collected.",
        "Try turning it off and on again.",
        "This is not the page you are looking for.",
        "Somewhere, a developer is fixing this. Maybe."
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
}

export default function NotFound() {
    const [joke, setJoke] = useState("");
    useEffect(() => {
        setJoke(getRandomJoke());
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
