export function getRandomJoke() {
    const jokes = [
        "It works on my machine.",
        "I swear I pushed that commit.",
        "It must be a caching issue.",
        "The user is holding it wrong.",
        "It was working 5 minutes ago.",
        "That's a hardware problem.",
        "We'll fix it in post-production.",
        "Have you tried refreshing?",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
}
