import { Outlet } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";

export function App() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
