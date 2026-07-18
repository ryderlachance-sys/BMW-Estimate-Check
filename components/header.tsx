import Link from "next/link";
import { ShieldCheck, ShoppingCart, User, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/upload", label: "Check an Estimate" },
  { href: "/catalog", label: "Parts Catalog" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            BMW <span className="text-primary">Estimate Check</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link href="/admin" aria-label="Admin">
            <Button variant="ghost" size="icon">
              <ShieldCheck className="size-5" />
            </Button>
          </Link>
          <Link href="/cart" aria-label="Cart">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="size-5" />
            </Button>
          </Link>
          <Link href="/dashboard" aria-label="Your account">
            <Button variant="ghost" size="icon">
              <User className="size-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
