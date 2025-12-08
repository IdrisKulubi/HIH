"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { CalendarIcon, FileDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { exportData } from "@/lib/actions/export";

const formSchema = z.object({
  type: z.enum(["applications", "applicants", "eligibility"]),
  format: z.enum(["csv", "json", "xlsx"]),
  filters: z.object({
    status: z.array(z.string()).optional(),
    country: z.array(z.string()).optional(),
    isEligible: z.boolean().optional().nullable(),
    submittedAfter: z.date().optional().nullable(),
    submittedBefore: z.date().optional().nullable(),
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ExportPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "applications",
      format: "xlsx",
      filters: {
        status: [],
        country: [],
        isEligible: null,
        submittedAfter: null,
        submittedBefore: null,
      },
    },
  });
  
  // Get values for conditional rendering
  const exportType = form.watch("type");
  
  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    
    try {
      // Clean up null values
      const cleanedValues = {
        ...values,
        filters: Object.fromEntries(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          Object.entries(values.filters).filter(([_, v]) => v !== null && (Array.isArray(v) ? v.length > 0 : true))
        ),
      };
      
      const result = await exportData(cleanedValues);
      
      if (!result.success) {
        toast.error(result.error || "Failed to export data");
        return;
      }
      
      // Handle API URL response for large datasets
      if ('apiUrl' in result && result.apiUrl) {
        // Create a form to POST to the API endpoint
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = result.apiUrl as string; // Use the API URL from the response
        form.target = '_blank'; // Open in new tab
        
        // Add export parameters as hidden fields
        const dataInput = document.createElement('input');
        dataInput.type = 'hidden';
        dataInput.name = 'exportData';
        dataInput.value = JSON.stringify(cleanedValues);
        form.appendChild(dataInput);
        
        // Submit the form
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        
        toast.success("Processing large export. Your download will begin shortly.");
        setIsLoading(false);
        return;
      }
      
      // For regular-sized datasets, handle client-side download
      if (!result.data || !result.fileName) {
        toast.error("Failed to export data");
        return;
      }
      
      // Handle different data formats
      let blobData: string | Uint8Array;
      const contentType = result.contentType || 'text/csv';
      
      if (result.isBase64) {
        // Convert base64 back to binary data for Excel files
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blobData = bytes;
      } else {
        // Text data (CSV, JSON)
        blobData = result.data;
      }
      
      // Create a blob and download the file
      const blob = new Blob([blobData], { type: contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Export complete: ${result.fileName} (${result.recordCount || 0} records)`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Export Data</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Export Configuration</CardTitle>
          <CardDescription>
            Configure the data export options below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Export Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select export type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="applications">Applications</SelectItem>
                          <SelectItem value="applicants">Applicants</SelectItem>
                          <SelectItem value="eligibility">Eligibility Results</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File Format</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select file format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Tabs defaultValue="date-filters" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="date-filters">Date Filters</TabsTrigger>
                  <TabsTrigger value="status-filters">Status Filters</TabsTrigger>
                  <TabsTrigger value="location-filters">Location Filters</TabsTrigger>
                </TabsList>
                
                <TabsContent value="date-filters" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="filters.submittedAfter"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Submitted After</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="filters.submittedBefore"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Submitted Before</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="status-filters" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    {exportType === "applications" || exportType === "eligibility" ? (
                      <FormField
                        control={form.control}
                        name="filters.status"
                        render={() => (
                          <FormItem>
                            <div className="mb-4">
                              <FormLabel className="text-base">Application Status</FormLabel>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {["draft", "submitted", "under_review", "shortlisted", "scoring_phase", "dragons_den", "finalist", "approved", "rejected"].map((status) => (
                                <FormField
                                  key={status}
                                  control={form.control}
                                  name="filters.status"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={status}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(status)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), status])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== status
                                                    )
                                                  );
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal capitalize">
                                          {status.replace(/_/g, " ")}
                                        </FormLabel>
                                      </FormItem>
                                    );
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}
                    
                    {exportType === "eligibility" ? (
                      <FormField
                        control={form.control}
                        name="filters.isEligible"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Eligibility Status</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                switch (value) {
                                  case "eligible":
                                    field.onChange(true);
                                    break;
                                  case "ineligible":
                                    field.onChange(false);
                                    break;
                                  default:
                                    field.onChange(null);
                                }
                              }}
                              defaultValue={
                                field.value === true
                                  ? "eligible"
                                  : field.value === false
                                  ? "ineligible"
                                  : "all"
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select eligibility" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="eligible">Eligible</SelectItem>
                                <SelectItem value="ineligible">Ineligible</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}
                  </div>
                </TabsContent>
                
                <TabsContent value="location-filters" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="filters.country"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Country</FormLabel>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {["ghana", "kenya", "nigeria", "rwanda", "tanzania"].map((country) => (
                            <FormField
                              key={country}
                              control={form.control}
                              name="filters.country"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={country}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(country)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), country])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== country
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal capitalize">
                                      {country}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <CardFooter className="flex justify-end px-0">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Export Data
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 