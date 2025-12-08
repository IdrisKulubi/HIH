import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserProfile } from "@/lib/actions/user.actions";
import { getUserApplication } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Award,
  Settings,
  ExternalLink,
  TrendingUp,
  MessageSquare,
  Briefcase,
  GraduationCap,
  Heart,
  Edit,
  Globe
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { UserSupportTickets } from "@/components/support/UserSupportTickets";

// Helper function to get status color
function getStatusColor(status: string) {
  switch (status) {
    case 'submitted':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'under_review':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'shortlisted':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

// Helper function to get status description
function getStatusDescription(status: string) {
  switch (status) {
    case 'submitted':
      return 'Your application has been successfully submitted and is awaiting initial review.';
    case 'under_review':
      return 'Your application is currently being reviewed by our evaluation team.';
    case 'shortlisted':
      return 'Congratulations! Your application has been shortlisted for the next phase.';
    case 'scoring_phase':
      return 'Your application is in the detailed scoring phase with expert evaluators.';
    case 'dragons_den':
      return 'Amazing! You\'ve been selected for the Dragon\'s Den pitch event.';
    case 'finalist':
      return 'Outstanding! You are now a finalist in the In-Country YouthADAPT Challenge.';
    case 'approved':
      return 'Congratulations! Your application has been approved for funding.';
    case 'rejected':
      return 'Unfortunately, your application was not selected this time. Keep innovating!';
    default:
      return 'Application status is being updated.';
  }
}

export default async function ProfilePage() {
  // Check if user is authenticated
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Get user profile and application
  const [userProfile, applicationResult] = await Promise.all([
    getCurrentUserProfile(),
    getUserApplication()
  ]);

  if (!userProfile) {
    redirect('/profile/setup');
  }

  const application = applicationResult?.success ? applicationResult.data : null;

  // Calculate profile completion percentage
  const profileFields = [
    userProfile.firstName,
    userProfile.lastName,
    userProfile.email,
    userProfile.phoneNumber,
    userProfile.country,
  ];

  const completedFields = profileFields.filter(field => field && field.toString().trim().length > 0);
  const completionPercentage = Math.round((completedFields.length / profileFields.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Profile Avatar and Basic Info */}
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <Avatar className="h-24 w-24 lg:h-32 lg:w-32 border-4 border-white/20 shadow-xl">
                <AvatarImage
                  src={userProfile.profileImage || ""}
                  alt={`${userProfile.firstName} ${userProfile.lastName}`}
                />
                <AvatarFallback className="text-2xl lg:text-3xl font-bold bg-white/10 text-white">
                  {userProfile.firstName?.[0]}{userProfile.lastName?.[0]}
                </AvatarFallback>
              </Avatar>

              <div className="text-center lg:text-left">
                <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                  {userProfile.firstName} {userProfile.lastName}
                </h1>
                <p className="text-blue-100 text-lg mb-2">
                  {userProfile.organization || 'In-Country YouthADAPT Participant'}
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 text-sm">
                  <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {userProfile.country || 'Location not set'}
                  </span>
                  <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {userProfile.role?.replace('_', ' ').toUpperCase() || 'APPLICANT'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="lg:ml-auto">
              <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Profile Completion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Progress value={completionPercentage} className="h-2" />
                    <p className="text-sm text-blue-100">
                      {completionPercentage}% Complete ({completedFields.length}/{profileFields.length} fields)
                    </p>
                    {completionPercentage < 100 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
                        asChild
                      >
                        <Link href="/profile/edit">
                          <Edit className="h-4 w-4 mr-2" />
                          Complete Profile
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-gray-900/90 backdrop-blur-sm rounded-full p-1.5 mb-8">
            <TabsTrigger
              value="overview"
              className="flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white data-[state=active]:bg-[#0B5FBA] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <User className="h-5 w-5" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="application"
              className="flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white data-[state=active]:bg-[#0B5FBA] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <FileText className="h-5 w-5" />
              Application
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white data-[state=active]:bg-[#0B5FBA] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <TrendingUp className="h-5 w-5" />
              Progress
            </TabsTrigger>
            <TabsTrigger
              value="support"
              className="flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-gray-300 hover:text-white data-[state=active]:bg-[#0B5FBA] data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              <MessageSquare className="h-5 w-5" />
              Support
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Personal Information */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">First Name</label>
                      <p>{userProfile.firstName}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Name</label>
                      <p>{userProfile.lastName}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        {userProfile.email}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        {userProfile.phoneNumber || 'Not provided'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Country</label>
                      <p className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        {userProfile.country || 'Not specified'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Organization</label>
                      <p className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        {userProfile.organization || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {userProfile.bio && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Bio</label>
                        <p>{userProfile.bio}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="space-y-6">
                {/* Application Status */}
                {application && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                        Application Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <Badge className={`${getStatusColor(application.status)} text-sm px-3 py-1 mb-2`}>
                          {application.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {getStatusDescription(application.status)}
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Application ID:</span>
                          <span className="font-medium">#{application.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Submitted:</span>
                          <span className="font-medium">
                            {application.submittedAt
                              ? format(new Date(application.submittedAt), "MMM dd, yyyy")
                              : 'Not submitted'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Business:</span>
                          <span className="font-medium">{application.business?.name}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Account Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      Account Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Member since:</span>
                      <span className="font-medium">
                        {format(new Date(userProfile.createdAt), "MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Last updated:</span>
                      <span className="font-medium">
                        {format(new Date(userProfile.updatedAt), "MMM dd, yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Role:</span>
                      <span className="font-medium capitalize">
                        {userProfile.role?.replace('_', ' ') || 'Applicant'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Application Tab */}
          <TabsContent value="application" className="space-y-6">
            {application ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Business Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Business Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Business Name</label>
                        <p className="font-medium">{application.business?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</label>
                        <p>
                          {application.business?.city}, {application.business?.country?.toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</label>
                        <p>
                          {application.business?.startDate
                            ? format(new Date(application.business.startDate), "MMMM yyyy")
                            : 'Not specified'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Registration Status</label>
                        <p>
                          {application.business?.isRegistered ? (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              Registered
                            </span>
                          ) : (
                            <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Not Registered
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Personal Details from Application */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-green-600 dark:text-green-400" />
                      Personal Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</label>
                        <p className="capitalize">{application.applicant?.gender}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</label>
                        <p>
                          {application.applicant?.dateOfBirth
                            ? format(new Date(application.applicant.dateOfBirth), "MMMM dd, yyyy")
                            : 'Not provided'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Citizenship</label>
                        <p className="capitalize">{application.applicant?.citizenship}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Education</label>
                        <p className="capitalize">
                          {application.applicant?.highestEducation?.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Business Description */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
                      Business Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">What does your business do?</label>
                      <p className="mt-1">{application.business?.description}</p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">What problem does it solve?</label>
                      <p className="mt-1">{application.business?.problemSolved}</p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Climate Adaptation Contribution</label>
                      <p className="mt-1">{application.business?.climateAdaptationContribution}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Application Found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    You haven&apos;t submitted an application yet. Start your In-Country YouthADAPT journey today!
                  </p>
                  <Button asChild className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
                    <Link href="/apply">
                      Start Application
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    Application Journey
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {application ? (
                    <div className="space-y-4">
                      {/* Progress Timeline */}
                      <div className="space-y-3">
                        {[
                          { status: 'submitted', label: 'Application Submitted', completed: true },
                          { status: 'under_review', label: 'Under Review', completed: ['under_review', 'shortlisted', 'scoring_phase', 'dragons_den', 'finalist', 'approved'].includes(application.status) },
                          { status: 'shortlisted', label: 'Shortlisted', completed: ['shortlisted', 'scoring_phase', 'dragons_den', 'finalist', 'approved'].includes(application.status) },
                          { status: 'scoring_phase', label: 'Scoring Phase', completed: ['scoring_phase', 'dragons_den', 'finalist', 'approved'].includes(application.status) },
                          { status: 'dragons_den', label: 'Dragon\'s Den', completed: ['dragons_den', 'finalist', 'approved'].includes(application.status) },
                          { status: 'finalist', label: 'Finalist', completed: ['finalist', 'approved'].includes(application.status) },
                          { status: 'approved', label: 'Selected', completed: application.status === 'approved' }
                        ].map((step, index) => (
                          <div key={step.status} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.completed
                                ? 'bg-green-500 text-white'
                                : application.status === step.status
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-200 text-gray-400'
                              }`}>
                              {step.completed ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <span className="text-xs font-medium">{index + 1}</span>
                              )}
                            </div>
                            <span className={`${step.completed
                                ? 'text-green-700 dark:text-green-400 font-medium'
                                : application.status === step.status
                                  ? 'text-blue-700 dark:text-blue-400 font-medium'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No application to track yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Next Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {application ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-500/50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Current Status</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          {getStatusDescription(application.status)}
                        </p>
                      </div>

                      {application.status === 'submitted' && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-500/50 rounded-lg p-4">
                          <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">What&apos;s Next?</h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            Our team will review your application within 2-3 weeks. You&apos;ll receive email updates on your progress.
                          </p>
                        </div>
                      )}

                      {application.status === 'shortlisted' && (
                        <div className="bg-purple-50 dark:bg-purple-900/50 border border-purple-200 dark:border-purple-500/50 rounded-lg p-4">
                          <h4 className="font-medium text-purple-900 dark:text-purple-200 mb-2">Congratulations!</h4>
                          <p className="text-sm text-purple-800 dark:text-purple-300">
                            You&apos;ve been shortlisted! Prepare for the detailed evaluation phase. Check your email for next steps.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400 mb-4">Ready to start your journey?</p>
                      <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-green-600">
                        <Link href="/apply">Start Application</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <UserSupportTickets />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
} 