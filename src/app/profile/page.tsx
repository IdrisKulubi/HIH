import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentUserProfile } from "@/lib/actions/user.actions";
import { getUserApplication } from "@/lib/actions";
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
  Globe,
  ChevronRight,
  Sparkles,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { UserSupportTickets } from "@/components/support/UserSupportTickets";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";
import { ShieldCheck } from "lucide-react";

// Helper function to get status color
function getStatusColor(status: string) {
  switch (status) {
    case 'submitted':
      return 'bg-blue-100 text-blue-700 ring-1 ring-blue-500/20';
    case 'under_review':
      return 'bg-amber-100 text-amber-700 ring-1 ring-amber-500/20';
    case 'shortlisted':
      return 'bg-purple-100 text-purple-700 ring-1 ring-purple-500/20';
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/20';
    case 'rejected':
      return 'bg-rose-100 text-rose-700 ring-1 ring-rose-500/20';
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-500/20';
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
      return 'Outstanding! You are now a finalist in the BIRE Program.';
    case 'approved':
      return 'Congratulations! Your application has been approved wait for further communication.';
    case 'rejected':
      return 'Unfortunately, your application was not selected this time. Keep innovating!';
    default:
      return 'Application status is being updated.';
  }
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const [userProfile, applicationResult] = await Promise.all([
    getCurrentUserProfile(),
    getUserApplication()
  ]);

  if (!userProfile) {
    redirect('/profile/setup');
  }

  const application = applicationResult?.success ? applicationResult.data : null;

  const isReviewer = ['reviewer_1', 'reviewer_2', 'technical_reviewer'].includes(userProfile.role || '');

  const profileFields = [
    userProfile.firstName,
    userProfile.lastName,
    userProfile.email,
    userProfile.phoneNumber,
    userProfile.country,
    userProfile.organization
  ];

  const completedFields = profileFields.filter(field => field && field.toString().trim().length > 0);
  const completionPercentage = Math.round((completedFields.length / profileFields.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Modern Gradient Header */}
      <div className="relative h-[280px] bg-brand-blue overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>

        {/* Decorative Circles */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 left-10 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        {/* Profile Card Header */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
            <Avatar className="h-32 w-32 sm:h-40 sm:w-40 border-[6px] border-white shadow-lg relative">
              <AvatarImage
                src={userProfile.profileImage || ""}
                alt={`${userProfile.firstName} ${userProfile.lastName}`}
                className="object-cover"
              />
              <AvatarFallback className="text-4xl font-bold bg-slate-100 text-slate-500">
                {userProfile.firstName?.[0]}{userProfile.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-2 right-2 bg-green-500 w-5 h-5 rounded-full border-[3px] border-white"></div>
          </div>

          <div className="flex-1 text-center md:text-left mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
              {userProfile.firstName} {userProfile.lastName}
            </h1>
            <p className="text-lg text-slate-500 font-medium mb-4 flex items-center justify-center md:justify-start gap-2">
              <Briefcase className="w-5 h-5 text-teal-500" />
              {userProfile.organization || 'BIRE Program Participant'}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <Badge variant="secondary" className="px-4 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 gap-1.5 text-sm font-normal">
                <MapPin className="w-3.5 h-3.5" />
                {userProfile.country || 'Kenya'}
              </Badge>
              <Badge variant="secondary" className="px-4 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 gap-1.5 text-sm font-normal">
                <User className="w-3.5 h-3.5" />
                {userProfile.role?.replace('_', ' ').toUpperCase() || 'APPLICANT'}
              </Badge>
              <Badge variant="secondary" className="px-4 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 gap-1.5 text-sm font-normal">
                <Calendar className="w-3.5 h-3.5" />
                Joined {format(new Date(userProfile.createdAt), "MMM yyyy")}
              </Badge>
            </div>
          </div>

         
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="overview" className="w-full space-y-8">
          <div className="flex justify-center md:justify-start overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
            <TabsList className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 inline-flex">
              <TabsTrigger
                value="overview"
                className="rounded-xl px-6 py-2.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              {!isReviewer && (
                <>
                  <TabsTrigger
                    value="application"
                    className="rounded-xl px-6 py-2.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Application
                  </TabsTrigger>
                  <TabsTrigger
                    value="progress"
                    className="rounded-xl px-6 py-2.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Journey
                  </TabsTrigger>
                </>
              )}
              {isReviewer && (
                <TabsTrigger
                  value="security"
                  className="rounded-xl px-6 py-2.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Security
                </TabsTrigger>
              )}
              <TabsTrigger
                value="support"
                className="rounded-xl px-6 py-2.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Support
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Personal Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <User className="w-5 h-5" />
                      </span>
                      Personal Information
                    </h3>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-400">Full Name</p>
                      <p className="text-base font-semibold text-slate-800">{userProfile.firstName} {userProfile.lastName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-400">Email Address</p>
                      <p className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        {userProfile.email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-400">Phone Number</p>
                      <p className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {userProfile.phoneNumber || 'Not provided'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-400">Location</p>
                      <p className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        {userProfile.country || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {userProfile.bio && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <p className="text-sm font-medium text-slate-400 mb-2">Bio</p>
                      <p className="text-slate-600 leading-relaxed">{userProfile.bio}</p>
                    </div>
                  )}
                </div>

                {/* Application Snapshot Card */}
                {application ? (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Your Business</h3>
                      </div>

                      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                        <div>
                          <h4 className="text-2xl font-bold text-slate-800 mb-1">{application.business?.name}</h4>
                          <p className="text-slate-500 flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4" />
                            {application.business?.city}, {application.business?.county}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(application.status)} px-4 py-2 rounded-xl text-sm font-semibold shadow-sm border-0`}>
                          {application.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-slate-600 text-sm line-clamp-2">
                          {application.business?.sector || "No sector provided."}
                        </p>
                      </div>


                    </div>
                  </div>
                ) : !isReviewer ? (
                  <div className="bg-brand-blue     rounded-3xl p-8 text-center text-white shadow-xl shadow-blue-200">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-200" />
                    <h3 className="text-2xl font-bold mb-2">Start Your Application</h3>
                    <p className="text-blue-100 mb-6 max-w-md mx-auto">
                      Join the BIRE Program and take your climate solution to the next level.
                    </p>
                    <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50 border-0 rounded-xl font-bold px-8 shadow-lg">
                      <Link href="/apply">Apply Now</Link>
                    </Button>
                  </div>
                ) : null}
              </div>

              {/* Right Column - Stats & Status */}
              <div className="space-y-6">
                {/* Current Status Card - Hide for reviewers */}
                {!isReviewer && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Current Status</h4>
                    <div className="text-center py-4">
                      {application ? (
                        <>
                          <div className={`inline-flex p-4 rounded-full mb-4 ${application.status === 'submitted' ? 'bg-blue-50 text-blue-600' :
                            application.status === 'approved' ? 'bg-green-50 text-green-600' :
                              'bg-slate-50 text-slate-600'
                            }`}>
                            {application.status === 'submitted' ? <CheckCircle2 className="w-8 h-8" /> :
                              application.status === 'approved' ? <Award className="w-8 h-8" /> :
                                <Clock className="w-8 h-8" />}
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2 capitalize">
                            {application.status.replace('_', ' ')}
                          </h3>
                          <p className="text-sm text-slate-500 leading-relaxed">
                            {getStatusDescription(application.status)}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="inline-flex p-4 rounded-full bg-slate-50 text-slate-400 mb-4">
                            <FileText className="w-8 h-8" />
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-1">Not Started</h3>
                          <p className="text-sm text-slate-500">You haven't submitted an application yet.</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Key Dates / Info */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Account Info</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg text-slate-500 shadow-sm">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Joined</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{format(new Date(userProfile.createdAt), "MMM yyyy")}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg text-slate-500 shadow-sm">
                          <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Updated</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{format(new Date(userProfile.updatedAt), "MMM dd")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Application Detail Tab */}
          <TabsContent value="application" className="focus-visible:outline-none">
            {application ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {/* Business Details */}
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <Building className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Business Profile</h3>
                        <p className="text-slate-500 text-sm">Key information about your enterprise</p>
                      </div>
                    </div>

                    <div className="space-y-6">


                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Business Name</h4>
                          <p className="text-slate-700 text-sm leading-relaxed">
                            {application.business?.name}
                          </p>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-teal-500 rounded-full"></div>
                      Quick Facts
                    </h3>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1 p-3 rounded-xl hover:bg-slate-50 transition">
                        <span className="text-xs font-bold text-slate-400 uppercase">Years Operational</span>
                        <span className="font-semibold text-slate-800">
                          {application.business?.yearsOperational || 0} Years
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 p-3 rounded-xl hover:bg-slate-50 transition">
                        <span className="text-xs font-bold text-slate-400 uppercase">Registration</span>
                        <div className="flex items-center gap-2">
                          {application.business?.isRegistered ? (
                            <Badge className="bg-green-100 text-green-700 border-0">Registered</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-0">Pending</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 p-3 rounded-xl hover:bg-slate-50 transition">
                        <span className="text-xs font-bold text-slate-400 uppercase">Sector</span>
                        <span className="font-semibold text-slate-800">{application.business?.sector || 'General'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100 max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">No Application Found</h3>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                  You haven&apos;t started your application yet. The BIRE Program is waiting for you!
                </p>
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 shadow-lg shadow-blue-200">
                  <Link href="/apply">Start Application</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Journey Path Tab */}
          <TabsContent value="progress" className="focus-visible:outline-none">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Application Journey</h3>
                  <p className="text-slate-500 text-sm">Track your progress through the program</p>
                </div>
              </div>

              {application ? (
                <div className="relative">
                  {/* Vertical Line */}
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100"></div>

                  <div className="space-y-8 relative">
                    {[
                      { status: 'submitted', label: 'Application Submitted', desc: 'Your application has been received.', completed: true },
                      { status: 'under_review', label: 'Under Review', desc: 'Our team is evaluating your submission.', completed: ['under_review', 'shortlisted', 'scoring_phase', 'dragons_den', 'finalist', 'approved'].includes(application.status) },
                      { status: 'shortlisted', label: 'Shortlisted', desc: 'You made it to the shortlist!', completed: ['shortlisted', 'scoring_phase', 'dragons_den', 'finalist', 'approved'].includes(application.status) },
                      { status: 'scoring_phase', label: 'Detailed Scoring', desc: 'Experts are reviewing your detailed plan.', completed: ['scoring_phase', 'dragons_den', 'finalist', 'approved'].includes(application.status) },
                      { status: 'finalist', label: 'Finalist', desc: 'You are a finalist!', completed: ['finalist', 'approved'].includes(application.status) },
                      { status: 'approved', label: 'Selected for Funding', desc: 'Congratulations! Funding approved. Please wait for further communication.', completed: application.status === 'approved' }
                    ].map((step, index) => (
                      <div key={step.status} className={`flex gap-6 relative group ${!step.completed && application.status !== step.status ? 'opacity-50' : ''
                        }`}>
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-[3px] transition-all duration-300 ${step.completed
                          ? 'bg-green-500 border-green-100 text-white shadow-lg shadow-green-200'
                          : application.status === step.status
                            ? 'bg-blue-600 border-blue-100 text-white shadow-lg shadow-blue-200 scale-110'
                            : 'bg-white border-slate-200 text-slate-300'
                          }`}>
                          {step.completed ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                        </div>

                        <div className={`flex-1 pt-1 ${application.status === step.status ? 'bg-slate-50 p-4 rounded-xl -mt-3 border border-slate-100' : ''}`}>
                          <h4 className={`text-base font-bold mb-1 ${step.completed ? 'text-slate-900' :
                            application.status === step.status ? 'text-blue-700' : 'text-slate-500'
                            }`}>
                            {step.label}
                          </h4>
                          <p className="text-sm text-slate-500">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-slate-500">Submit an application to start tracking your journey.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="focus-visible:outline-none">
            <UserSupportTickets />
          </TabsContent>

          {/* Security Tab - Reviewers Only */}
          {isReviewer && (
            <TabsContent value="security" className="focus-visible:outline-none">
              <div className="max-w-2xl mx-auto">
                <PasswordChangeForm />
              </div>
            </TabsContent>
          )}

        </Tabs>
      </div>
    </div>
  );
} 