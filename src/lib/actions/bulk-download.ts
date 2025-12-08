"use server";

import { auth } from "@/auth";
import { downloadEnhancedApplicationDOCX } from "./enhanced-export";
import JSZip from "jszip";

export async function bulkDownloadApplications(applicationIds: number[]) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    if (applicationIds.length === 0) {
      return { success: false, error: "No applications selected" };
    }

    // For single application, return the document directly
    if (applicationIds.length === 1) {
      return await downloadEnhancedApplicationDOCX(applicationIds[0]);
    }

    // For multiple applications, create a ZIP file
    const zip = new JSZip();
    const downloadPromises = applicationIds.map(async (appId) => {
      try {
        const result = await downloadEnhancedApplicationDOCX(appId);
        if (result.success && result.data) {
          // Convert blob to array buffer for JSZip
          const arrayBuffer = await result.data.blob.arrayBuffer();
          zip.file(result.data.filename, arrayBuffer);
          return { success: true, filename: result.data.filename };
        }
        return { success: false, error: `Failed to generate document for application ${appId}` };
      } catch (error) {
        console.error(`Error generating document for application ${appId}:`, error);
        return { success: false, error: `Error generating document for application ${appId}` };
      }
    });

    const results = await Promise.all(downloadPromises);
    const successCount = results.filter(r => r.success).length;
    
    if (successCount === 0) {
      return { success: false, error: "Failed to generate any documents" };
    }

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `InCountryYouthADAPT_Applications_${timestamp}.zip`;

    return {
      success: true,
      data: {
        blob: zipBlob,
        filename,
        contentType: "application/zip",
      },
      message: successCount < applicationIds.length 
        ? `Generated ${successCount} of ${applicationIds.length} documents` 
        : `Generated ${successCount} documents successfully`
    };

  } catch (error) {
    console.error("Error in bulk download:", error);
    return { success: false, error: "Failed to generate bulk download" };
  }
}
