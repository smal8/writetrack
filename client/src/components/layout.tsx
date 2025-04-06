import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { LogOut, Home, Menu, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold hover:text-primary">
              <img src="/logo.svg" alt="WriteTrack Logo" className="h-10 w-10 object-contain" />
              <span className="text-xl md:text-2xl">WriteTrack</span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-4">
              <Button asChild variant="ghost" className={location === "/" ? "bg-accent" : ""}>
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Button asChild variant="ghost" className={location === "/calendar" ? "bg-accent" : ""}>
                <Link href="/calendar">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Calendar
                </Link>
              </Button>
            </nav>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutMutation.isPending ? "Signing out..." : "Sign out"}
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src="/logo.svg" alt="WriteTrack Logo" className="h-8 w-8 object-contain" />
                  WriteTrack
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-4">
                <Button asChild variant="ghost" className={location === "/" ? "bg-accent justify-start" : "justify-start"}>
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Home
                  </Link>
                </Button>
                <Button asChild variant="ghost" className={location === "/calendar" ? "bg-accent justify-start" : "justify-start"}>
                  <Link href="/calendar">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Calendar
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="justify-start"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {logoutMutation.isPending ? "Signing out..." : "Sign out"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}