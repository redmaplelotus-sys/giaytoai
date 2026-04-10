import { AppHeader } from "@/app/components/AppHeader";

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
