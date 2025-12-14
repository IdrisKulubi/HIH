import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedDocumentDownload } from "@/components/application/admin/EnhancedDocumentDownload";
import { FileText } from "lucide-react";

async function TestExportPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto py-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Enhanced Export Test
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Test the enhanced application review document generation
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Enhanced Document Export
            </CardTitle>
            <CardDescription>
              Test the enhanced application review document with all details included
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Test Application Export</h3>
              <p className="text-blue-700 text-sm mb-4">
                Click the button below to test the enhanced document export with a sample application.
                The document will include all application details, eligibility assessment, and reviewer information.
              </p>
              <EnhancedDocumentDownload
                applicationId={1} // Test with application ID 1
                applicantName="Test Applicant"
                variant="default"
                className="w-full"
              />
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">Features Included</h3>
              <ul className="text-amber-700 text-sm space-y-1">
                <li>• Complete application details with professional formatting</li>
                <li>• All form sections properly labeled and structured</li>
                <li>• Comprehensive eligibility assessment with scores</li>
                <li>• Reviewer information and review date</li>
                <li>• Enhanced document structure with icons and styling</li>
                <li>• Proper handling of missing data with fallback values</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TestExport() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TestExportPage />
    </Suspense>
  );
}