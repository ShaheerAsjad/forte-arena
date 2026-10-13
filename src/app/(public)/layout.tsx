import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-ivory">
      <SiteHeader />
      <main className="flex-1 pt-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
