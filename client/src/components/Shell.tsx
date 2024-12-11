import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PenSquare, Share2, BarChart3, Home } from "lucide-react";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Content', href: '/content', icon: PenSquare },
    { name: 'Distribution', href: '/distribution', icon: Share2 },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  return (
    <div className="flex min-h-screen">
      <div className="fixed inset-y-0 z-50 flex w-72 flex-col">
        <div className="flex flex-1 flex-col bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-6 gap-4 border-r">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary/90 to-blue-500 bg-clip-text text-transparent">
              BlogAI
            </h1>
          </div>
          
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link href={item.href}>
                      <Button
                        variant={location === item.href ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {item.name}
                      </Button>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      <main className="pl-72 w-full">
        <div className="px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
