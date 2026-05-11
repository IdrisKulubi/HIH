export function getRoleHomePath(role?: string | null) {
  switch (role) {
    case "admin":
      return "/admin";
    case "oversight":
      return "/oversight";
    case "a2f_officer":
      return "/a2f";
    case "reviewer_1":
    case "reviewer_2":
    case "technical_reviewer":
      return "/reviewer";
    case "mentor":
      return "/mentor/cna";
    case "bds_edo":
      return "/bds/cna";
    case "investment_analyst":
      return "/investment/cna";
    case "mel":
      return "/mel/cna";
    case "applicant":
    default:
      return "/apply/closed";
  }
}
