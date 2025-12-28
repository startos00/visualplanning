import { SignInForm } from "@/app/components/auth/SignInForm";
import { DeepSeaBackground } from "@/app/components/auth/DeepSeaBackground";
import { DumboOctopusCornerLogo } from "@/app/components/DumboOctopusCornerLogo";

export default async function LoginPage(props: {
  params: Promise<any>;
  searchParams: Promise<any>;
}) {
  await props.params;
  await props.searchParams;

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 bg-black overflow-hidden">
      <DumboOctopusCornerLogo corner="top-left" href="/" size={48} inset={16} />

      {/* Cinematic Deep Sea Backdrop */}
      <DeepSeaBackground />

      {/* Content Layer */}
      <div className="relative z-10 w-full flex items-center justify-center">
        <SignInForm />
      </div>

      {/* Background Ambient Text / UI Elements */}
      <div className="fixed bottom-8 left-8 z-0 pointer-events-none hidden md:block">
        <div className="text-[10px] font-mono text-cyan-900/40 tracking-[0.3em] rotate-[-90deg] origin-left uppercase">
          Atmospheric Pressure: 10.1 MPa
        </div>
      </div>
      <div className="fixed bottom-8 right-8 z-0 pointer-events-none hidden md:block">
        <div className="text-[10px] font-mono text-cyan-900/40 tracking-[0.3em] uppercase">
          Depth: 10,935m (Challenger Deep)
        </div>
      </div>
    </main>
  );
}
