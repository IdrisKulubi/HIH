"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReviewerKycSearchControlsProps {
  initialSearch: string;
  selectedStatus: string;
}

export function ReviewerKycSearchControls({
  initialSearch,
  selectedStatus,
}: ReviewerKycSearchControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(initialSearch);

  useEffect(() => {
    setSearchValue(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextValue = searchValue.trim();
      const params = new URLSearchParams(searchParams.toString());

      if (nextValue) {
        params.set("search", nextValue);
      } else {
        params.delete("search");
      }

      if (selectedStatus === "all") {
        params.delete("status");
      } else {
        params.set("status", selectedStatus);
      }

      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl, { scroll: false });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, router, searchParams, searchValue, selectedStatus]);

  const handleClear = () => {
    setSearchValue("");
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <Input
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        placeholder="Search application, business, applicant, county, or city"
        className="md:max-w-md"
      />
      {searchValue ? (
        <Button type="button" variant="outline" onClick={handleClear}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
