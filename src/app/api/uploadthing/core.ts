import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/auth";

const f = createUploadthing();

const authenticateUploadRequest = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UploadThingError("Unauthorized");
  }
  return { id: session.user.id };
};

// Define a reusable document uploader configuration
const documentUploader = f({
  pdf: { maxFileSize: "8MB", maxFileCount: 1 },
  "application/msword": { maxFileSize: "8MB", maxFileCount: 1 }, // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "8MB", maxFileCount: 1 }, // .docx
  // Add other document types if needed e.g. excel, powerpoint
})
.middleware(async () => {
  try {
    const user = await authenticateUploadRequest();
    if (!user?.id) {
      throw new UploadThingError("Failed to authenticate user");
    }
    return { userId: user.id };
  } catch (error) {
    console.error("Upload middleware error:", error);
    throw new UploadThingError("Unauthorized");
  }
})
.onUploadComplete(async ({ metadata, file }) => {

  return { uploadedBy: metadata.userId, fileName: file.name, fileUrl: file.url };
});

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB" } })
    .middleware(async () => {
      try {
        const user = await authenticateUploadRequest();
        if (!user?.id) {
          throw new UploadThingError("Failed to authenticate user");
        }
        return { userId: user.id };
      } catch (error) {
        console.error("Image upload middleware error:", error);
        throw new UploadThingError("Unauthorized");
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
     
      return { uploadedBy: metadata.userId, fileUrl: file.url };
    }),
  // Document uploaders for the business form
  businessOverviewUploader: documentUploader,
  cr12Uploader: documentUploader,
  auditedAccountsUploader: documentUploader,
  taxComplianceUploader: documentUploader,
  registrationCertificateUploader: documentUploader,
  kycDocumentUploader: documentUploader,
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter; 
