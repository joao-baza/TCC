import { Menu } from "lucide-react";
import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[18rem_1fr]">
      <AppSidebar className="hidden md:block" />
      <div className="min-w-0">
        <header className="border-b bg-background px-4 py-3 md:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" aria-label="Abrir navegação" />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-[18rem] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navegação principal</SheetTitle>
              </SheetHeader>
              <AppSidebar />
            </SheetContent>
          </Sheet>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
