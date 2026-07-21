import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/auth";

const f = createUploadthing();

import { A2F_STAFF_ROLES } from "@/lib/a2f-access";

const A2F_UPLOAD_ROLES = A2F_STAFF_ROLES;

const authenticateUploadRequest = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UploadThingError("Unauthorized");
  }
  return { id: session.user.id, role: session.user.role };
};

const authenticateA2fUploadRequest = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UploadThingError("Unauthorized");
  }
  if (!A2F_UPLOAD_ROLES.includes(session.user.role as (typeof A2F_UPLOAD_ROLES)[number])) {
    throw new UploadThingError("Unauthorized");
  }
  return { userId: session.user.id };
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

const cdpEvidenceUploader = f({
  pdf: { maxFileSize: "16MB", maxFileCount: 6 },
  image: { maxFileSize: "8MB", maxFileCount: 10 },
  "application/msword": { maxFileSize: "16MB", maxFileCount: 6 },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    maxFileSize: "16MB",
    maxFileCount: 6,
  },
  "application/vnd.ms-excel": { maxFileSize: "16MB", maxFileCount: 6 },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    maxFileSize: "16MB",
    maxFileCount: 6,
  },
  "text/csv": { maxFileSize: "8MB", maxFileCount: 6 },
})
  .middleware(async () => {
    try {
      const user = await authenticateUploadRequest();
      if (!user?.id) {
        throw new UploadThingError("Failed to authenticate user");
      }
      return { userId: user.id };
    } catch (error) {
      console.error("CDP evidence upload middleware error:", error);
      throw new UploadThingError("Unauthorized");
    }
  })
  .onUploadComplete(async ({ metadata, file }) => {
    return {
      uploadedBy: metadata.userId,
      fileKey: file.key,
      fileName: file.name,
      fileUrl: file.url,
      fileType: file.type ?? "application/octet-stream",
    };
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
  cdpEvidenceUploader,
  signedContractUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      try {
        const user = await authenticateA2fUploadRequest();
        return { userId: user.userId };
      } catch (error) {
        console.error("Signed contract upload middleware error:", error);
        throw new UploadThingError("Unauthorized");
      }
    })
    .onUploadComplete(async ({ metadata, file }) => ({
      uploadedBy: metadata.userId,
      fileName: file.name,
      fileUrl: file.url,
    })),
  applicantSignedContractUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) {
        throw new UploadThingError("Unauthorized");
      }
      if (session.user.role !== "applicant" && session.user.role !== "admin") {
        throw new UploadThingError("Unauthorized");
      }
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => ({
      uploadedBy: metadata.userId,
      fileName: file.name,
      fileUrl: file.url,
    })),
  offerLetterUploader: f({
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      try {
        const user = await authenticateA2fUploadRequest();
        return { userId: user.userId };
      } catch (error) {
        console.error("Offer letter upload middleware error:", error);
        throw new UploadThingError("Unauthorized");
      }
    })
    .onUploadComplete(async ({ metadata, file }) => ({
      uploadedBy: metadata.userId,
      fileName: file.name,
      fileUrl: file.url,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter; 
