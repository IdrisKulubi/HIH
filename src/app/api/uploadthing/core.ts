import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// Improved auth function for development - replace with real auth in production
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const auth = async (req: Request) => {
  // In development, we'll create a simple user ID
  // In production, replace this with your actual authentication logic
  const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return { id: userId };
};

// Define a reusable document uploader configuration
const documentUploader = f({
  pdf: { maxFileSize: "8MB", maxFileCount: 1 },
  "application/msword": { maxFileSize: "8MB", maxFileCount: 1 }, // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "8MB", maxFileCount: 1 }, // .docx
  // Add other document types if needed e.g. excel, powerpoint
})
.middleware(async ({ req }) => {
  try {
    const user = await auth(req);
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
    .middleware(async ({ req }) => {
      try {
        const user = await auth(req);
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
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter; 