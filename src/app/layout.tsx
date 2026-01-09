
'use client';

import Link from 'next/link';
import {
  Home,
  Menu,
  X,
  Server,
  AppWindow,
  Lightbulb,
  CreditCard,
  CircleUser,
  HeartPulse,
  HardDrive,
  FileCode,
  Terminal,
  FileText,
  Wind,
  ShieldAlert,
  FolderKanban,
  History,
  Link2,
  Network,
  Settings,
  Globe,
  Plus,
  Layers
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState, useEffect, Suspense } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { ProgressBar } from '@/components/progress-bar';
import NProgress from 'nprogress';
import Cookies from 'universal-cookie';

function NavLink({ href, children, currentPath, onClick }: { href: string; children: React.ReactNode; currentPath: string, onClick?: () => void }) {
  const isActive = href === '/' ? currentPath === href : currentPath.startsWith(href);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (currentPath !== href) {
      NProgress.start();
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-muted hover:text-primary',
        isActive && 'bg-muted text-primary'
      )}
    >
      {children}
    </Link>
  );
}

function MainNavContent({ currentPath, onLinkClick, isServerSelected }: { currentPath: string, onLinkClick?: () => void, isServerSelected: boolean }) {
  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/recommendations", label: "Recommendations", icon: Lightbulb },
  ];

  const domainLinks = [
    { href: "/domains", label: "Domains", icon: Globe },
    { href: "/domains/find", label: "Add Domain", icon: Plus },
  ];

  const accountLinks = [
    { href: "/servers", label: "Servers", icon: Server },
    { href: "/environments", label: "Environments", icon: Layers },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/billing", label: "Billing", icon: CreditCard },
    { href: "/linked-accounts", label: "Linked Accounts", icon: Link2 },
  ]

  const serverLinks = [
    { href: "/status", label: "Status", icon: HeartPulse },
    { href: "/applications", label: "Applications", icon: AppWindow },
    { href: "/balancers", label: "Balancers", icon: Wind },
    { href: "/storage", label: "Storage", icon: HardDrive },
    { href: "/processes", label: "Processes", icon: FileCode },
    { href: "/network", label: "Network", icon: Network },
    { href: "/webservices", label: "Web Services", icon: Globe },
    { href: "/commands", label: "Commands", icon: Terminal },
    { href: "/history", label: "History", icon: History },
    { href: "/files", label: "File Manager", icon: FolderKanban },
  ]

  const rootLinks = [
    { href: "/root/servers", label: "Manage Servers", icon: Settings },
    { href: "/errors", label: "Errors", icon: ShieldAlert },
  ]
  return (
    <nav className="flex flex-col gap-4">
      <div className="space-y-2">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <NavLink key={label} href={href} currentPath={currentPath} onClick={onLinkClick}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="space-y-2">
        <div className="px-3 text-xs font-semibold uppercase text-muted-foreground pt-4">
          Domains
        </div>
        {domainLinks.map(({ href, label, icon: Icon }) => (
          <NavLink key={label} href={href} currentPath={currentPath} onClick={onLinkClick}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      {isServerSelected && (
        <div className="space-y-2">
          <div className="px-3 text-xs font-semibold uppercase text-muted-foreground pt-4">
            Server
          </div>
          {serverLinks.map(({ href, label, icon: Icon }) => (
            <NavLink key={label} href={href} currentPath={currentPath} onClick={onLinkClick}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="px-3 text-xs font-semibold uppercase text-muted-foreground pt-4">
          Account
        </div>
        {accountLinks.map(({ href, label, icon: Icon }) => (
          <NavLink key={label} href={href} currentPath={currentPath} onClick={onLinkClick}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
      <div className="space-y-2">
        <div className="px-3 text-xs font-semibold uppercase text-muted-foreground pt-4">
          Root
        </div>
        {rootLinks.map(({ href, label, icon: Icon }) => (
          <NavLink key={label} href={href} currentPath={currentPath} onClick={onLinkClick}>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Header({ isMobileMenuOpen, toggleMobileMenu }: { isMobileMenuOpen: boolean, toggleMobileMenu: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background px-4 shadow-sm sm:px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] items-center">
        <div className="flex items-center gap-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
        <div className="hidden md:flex">
          <Logo />
        </div>
        <div className="flex w-full items-center md:hidden">
          <div className="mx-auto">
            <Logo />
          </div>
        </div>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isServerSelected, setIsServerSelected] = useState(false);

  useEffect(() => {
    const cookies = new Cookies(null, { path: '/' });
    const checkCookie = () => {
      const serverCookie = cookies.get('selected_server');
      setIsServerSelected(!!serverCookie);
    };
    checkCookie();

    // It's a bit of a hack, but since we can't easily listen to cookie changes
    // across server actions, we'll just poll on navigation changes.
    // A more robust solution might involve a global state management library.
  }, [pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="description" content="The future of cloud infrastructure." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <div className="min-h-screen w-full bg-background text-foreground">
            <Header isMobileMenuOpen={isMobileMenuOpen} toggleMobileMenu={toggleMobileMenu} />

            {/* Mobile Menu */}
            <div className={cn(
              "fixed top-16 left-0 right-0 bottom-0 z-30 bg-background/95 backdrop-blur-sm transition-all duration-300 ease-in-out md:hidden",
              isMobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
            )}>
              <ScrollArea className="h-full">
                <div className="p-4 sm:p-6">
                  <MainNavContent currentPath={pathname} onLinkClick={closeMobileMenu} isServerSelected={isServerSelected} />
                </div>
              </ScrollArea>
            </div>

            <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[280px_1fr]">
              {/* Sidebar */}
              <aside className="hidden h-[calc(100vh-4rem)] flex-col border-r bg-card lg:sticky lg:top-16 lg:flex">
                <ScrollArea className="flex-1">
                  <div className="p-6 md:p-8">
                    <MainNavContent currentPath={pathname} isServerSelected={isServerSelected} />
                  </div>
                </ScrollArea>
              </aside>

              {/* Main Content */}
              <main className="min-h-[calc(100vh-4rem)] bg-white p-6 md:p-8">
                <div className="w-full">{children}</div>
              </main>
            </div>
          </div>
          <Toaster />
        </FirebaseClientProvider>
        <Suspense fallback={null}>
          <ProgressBar />
        </Suspense>
      </body>
    </html>
  );
}

