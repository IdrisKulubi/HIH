import { auth } from "@/auth";
import { FoundationApplicationForm } from "@/components/application/foundation-application-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignIn as SignInIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";
import { areApplicationsOpen } from "@/lib/config";

export const metadata = {
    title: "Foundation Track Application | BIRE Portal",
    description: "Apply for the BIRE Foundation Track program for MSEs in Kenya",
};

export default async function FoundationApplicationPage() {
    // Check if applications are still open
    if (!areApplicationsOpen()) {
        redirect('/apply/closed');
    }

    const session = await auth();

    if (!session?.user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-brand-blue/5 via-white to-brand-green/5 flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-brand-blue to-brand-green rounded-full flex items-center justify-center">
                            <span className="text-3xl">🌱</span>
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold text-slate-900">Login Required</CardTitle>
                            <CardDescription className="text-slate-600 mt-2">
                                You must be logged in to access the Foundation Track application
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <Link href="/login?callbackUrl=/apply/foundation" className="w-full block">
                                <Button className="w-full bg-gradient-to-r from-brand-blue to-brand-green hover:opacity-90 text-white shadow-lg">
                                    <SignInIcon className="w-4 h-4 mr-2" weight="bold" />
                                    Login to Continue
                                </Button>
                            </Link>

                            <p className="text-center text-sm text-slate-500">
                                Don&apos;t have an account? Sign up with Google on the login page.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <FoundationApplicationForm />;
}
