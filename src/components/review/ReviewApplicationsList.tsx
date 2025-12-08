"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search,
  FileText,
  Users,
  Eye,
  ClipboardCheck,
} from "lucide-react";

// Minimal shape for applications used here
interface Application {
  id: number;
  status: string;
  business: {
    name: string;
    city?: string | null;
    country?: string | null;
    applicant: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  eligibilityResults?: Array<{
    isEligible: boolean;
    totalScore?: number | null;
    evaluatedAt?: string | Date | null;
  }>;
}

export default function ReviewApplicationsList({ applications }: { applications: Application[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((app) => {
      const id = String(app.id);
      const biz = app.business?.name?.toLowerCase() || "";
      const first = app.business?.applicant?.firstName?.toLowerCase() || "";
      const last = app.business?.applicant?.lastName?.toLowerCase() || "";
      const email = app.business?.applicant?.email?.toLowerCase() || "";
      const city = app.business?.city?.toLowerCase() || "";
      const country = app.business?.country?.toLowerCase() || "";
      return (
        id.includes(q) ||
        biz.includes(q) ||
        first.includes(q) ||
        last.includes(q) ||
        email.includes(q) ||
        city.includes(q) ||
        country.includes(q)
      );
    });
  }, [applications, query]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div>
        <label className="text-sm font-medium mb-2 block text-gray-700">
          Search applications
        </label>
        <div className="flex gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-900" />
            <Input
              placeholder="Search by business, applicant, email, location, or ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 text-gray-900"
            />
          </div>
          {query && (
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {applications.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications for Review</h3>
          <p className="text-gray-500">
            There are no shortlisted or under review applications at the moment.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No matching results</h3>
          <p className="text-gray-500">
            Try a different search term.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="border rounded-lg p-6 hover:shadow-md transition-all duration-200 bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {app.business.name}
                    </h3>
                    <Badge 
                      className={`${
                        app.status === 'shortlisted' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      } border-0`}
                    >
                      {app.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {app.eligibilityResults?.[0] && (
                      <Badge 
                        className={`${
                          app.eligibilityResults[0].isEligible 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        } border-0`}
                      >
                        {app.eligibilityResults[0].isEligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Applicant:</strong> {app.business.applicant.firstName} {app.business.applicant.lastName}
                    </p>
                    <p>
                      <strong>Location:</strong> {app.business.city || '—'}, {app.business.country || '—'}
                    </p>
                    <p>
                      <strong>Email:</strong> {app.business.applicant.email}
                    </p>
                    {app.eligibilityResults?.[0] && (
                      <>
                        <p>
                          <strong>Score:</strong> {app.eligibilityResults[0].totalScore ?? 'N/A'}/100
                        </p>
                        <p>
                          <strong>Last Evaluated:</strong> {
                            app.eligibilityResults[0].evaluatedAt 
                              ? new Date(app.eligibilityResults[0].evaluatedAt).toLocaleDateString()
                              : 'N/A'
                          }
                        </p>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    asChild
                  >
                    <Link href={`/admin/applications/${app.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                  <Button 
                    className=" *:border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                    asChild
                  >
                    <Link href={`/admin/applications/${app.id}/evaluate`}>
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Re-evaluate
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

