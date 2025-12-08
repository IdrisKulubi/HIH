import { redirect } from "next/navigation";

/**
 * Legacy Application Form Page
 * 
 * This route has been deprecated in favor of the new BIRE application flow.
 * Users are redirected to the eligibility screening page.
 */
export default function ApplicationFormPage() {
  // Redirect to new eligibility screening flow
  redirect("/apply/prepare");
}