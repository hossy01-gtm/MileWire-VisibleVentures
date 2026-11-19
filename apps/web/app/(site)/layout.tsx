import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";

/** Public marketing pages. The console lives in the (console) group and has its own shell. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
