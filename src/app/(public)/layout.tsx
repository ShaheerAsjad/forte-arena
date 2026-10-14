import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PageTransition } from "@/components/motion/PageTransition";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-ivory">
      <SiteHeader />
      <main className="flex-1 pt-6">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
    </div>
  );
}
