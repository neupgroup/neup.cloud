'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';
import { useEffect, useState } from 'react';

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
