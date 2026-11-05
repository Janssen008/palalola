import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Office, TaskLog } from "@/types/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Copy, CheckCircle2, Filter, Download } from "lucide-react";
import { format, subWeeks, subMonths, startOfDay } from "date-fns";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function TaskSummary() {
  const { user, profile } = useAuth();

  const currentDate = new Date();
  const [selectedMonths, setSelectedMonths] = useState<number[]>([
    currentDate.getMonth(),
  ]);
  const [selectedYear, setSelectedYear] = useState<number>(
    currentDate.getFullYear(),
  );
  const [selectedPeriod, setSelectedPeriod] = useState<
    "first_half" | "second_half" | "full"
  >("first_half");
  const [selectedTargetUser, setSelectedTargetUser] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  const { data: allProfiles } = useQuery({
    queryKey: ["allProfiles-taskSummary"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, role, office_id").order("full_name");
      return (data as any[]) ?? [];
    },
    enabled: !!profile && (profile.role === 'admin' || profile.role === 'department_head' || profile.role === 'oic'),
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, any>();
    allProfiles?.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [allProfiles]);

  const formattedRange = useMemo(() => {
    if (selectedMonths.length === 0) return "No months selected";
    if (selectedMonths.length === 1) {
      const month = selectedMonths[0];
      let startDay = 1;
      let endDay = new Date(selectedYear, month + 1, 0).getDate();
      if (selectedPeriod === "first_half") endDay = 15;
      else if (selectedPeriod === "second_half") startDay = 16;
      return `${format(new Date(selectedYear, month, startDay), "MMMM dd")}-${format(new Date(selectedYear, month, endDay), "dd, yyyy")}`;
    }
    
    const monthsStr = selectedMonths.map(m => format(new Date(2000, m, 1), "MMM")).join(", ");
    return `${monthsStr} ${selectedYear}`;
  }, [selectedMonths, selectedYear, selectedPeriod]);


  const { data: offices } = useQuery({
    queryKey: ["offices"],
    queryFn: async () => {
      const { data } = await supabase.from("offices").select("*");
      return (data as Office[]) ?? [];
    },
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: [
      "user",
      "taskSummary",
      user?.id,
      selectedMonths,
      selectedYear,
      selectedPeriod,
      selectedTargetUser,
    ],
    queryFn: async () => {
      if (selectedMonths.length === 0) return [];

      const minMonth = Math.min(...selectedMonths);
      const maxMonth = Math.max(...selectedMonths);

      const start = new Date(selectedYear, minMonth, 1);
      const end = new Date(selectedYear, maxMonth + 1, 0, 23, 59, 59, 999);

      let query = supabase
        .from("task_logs")
        .select("*")
        .gte("logged_at", start.toISOString())
        .lte("logged_at", end.toISOString())
        .order("logged_at", { ascending: true });

      if (profile?.role === 'admin' || profile?.role === 'department_head' || profile?.role === 'oic') {
        if (selectedTargetUser !== 'all') {
          query = query.eq("user_id", selectedTargetUser);
        }
      } else {
        query = query.eq("user_id", user!.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data as TaskLog[]).filter(log => {
        const d = new Date(log.logged_at);
        if (!selectedMonths.includes(d.getMonth())) return false;
        
        if (selectedPeriod === "first_half" && d.getDate() > 15) return false;
        if (selectedPeriod === "second_half" && d.getDate() < 16) return false;
        
        return true;
      });
    },
    enabled: !!user && selectedMonths.length > 0,
    placeholderData: (previousData) => previousData,
  });

  const offMap = useMemo(() => {
    const m = new Map<string, string>();
    offices?.forEach((o) => m.set(o.id, o.name));
    return m;
  }, [offices]);

  // Determine if the user's office is ICT, MTC, or Family Court
  const userOfficeName = profile?.office_id
    ? offMap.get(profile.office_id)
    : null;
  const isICT =
    userOfficeName?.toLowerCase().includes("ict") ||
    userOfficeName?.toLowerCase().includes("information and communications");
  const isMTC = userOfficeName?.toLowerCase().includes("mtc");
  const isFamilyCourt =
    userOfficeName?.toLowerCase().includes("family court") ||
    userOfficeName?.toLowerCase().includes("branch 7");
  const isOSCA =
    userOfficeName?.toLowerCase().includes("senior") ||
    userOfficeName?.toLowerCase().includes("osca") ||
    userOfficeName?.toLowerCase().includes("energetic");

  const [selectedTemplate, setSelectedTemplate] = useState<string>("auto");

  const activeTemplate =
    selectedTemplate === "auto"
      ? isOSCA
        ? "osca"
        : isICT
          ? "ict"
          : isMTC
            ? "mtc"
            : isFamilyCourt
              ? "family_court"
              : "general"
      : selectedTemplate;

  // Fetch the department head / OIC for the user's office (for non-ICT signatures)
  // We use an RPC function here to bypass RLS restrictions which prevent users from reading other profiles
  const { data: deptHead } = useQuery({
    queryKey: ["deptHead", profile?.office_id],
    queryFn: async () => {
      const { data } = await supabase
        .rpc("get_office_dept_head", {
          p_office_id: profile!.office_id!,
        } as any)
        .single();
      return data as { full_name: string; role: string } | null;
    },
    enabled: !!profile?.office_id && !isICT && !isMTC && !isFamilyCourt,
  });

  // Group logs by date
  const groupedLogs = useMemo(() => {
    if (!logs) return {};
    const groups: Record<string, TaskLog[]> = {};
    logs.forEach((log) => {
      const dateStr = format(new Date(log.logged_at), "MMMM d, yyyy");
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(log);
    });
    return groups;
  }, [logs]);

  // Generate the raw text for copying
  const summaryText = useMemo(() => {
    let text = `Task Summary (${formattedRange})\n\n`;

    if (selectedMonths.length === 0) return text;

    selectedMonths.forEach(month => {
      let startD = 1;
      let endD = new Date(selectedYear, month + 1, 0).getDate();
      if (selectedPeriod === "first_half") endD = 15;
      if (selectedPeriod === "second_half") startD = 16;

      if (selectedMonths.length > 1) {
        text += `\n--- ${format(new Date(selectedYear, month, 1), "MMMM yyyy")} ---\n\n`;
      }

      for (let d = startD; d <= endD; d++) {
        const dateObj = new Date(selectedYear, month, d);
        const dateStr = format(dateObj, "MMMM d, yyyy");
        const dayOfWeekStr = format(dateObj, "EEEE");
        const dayLogs = groupedLogs[dateStr];

        if (dayLogs && dayLogs.length > 0) {
          text += `${dateStr}:\n`;
          dayLogs.forEach((log) => {
            const userTag = (selectedTargetUser === 'all' && (profile?.role === 'admin' || profile?.role === 'department_head' || profile?.role === 'oic'))
              ? ` [${profileMap.get(log.user_id)?.full_name ?? 'User'}]`
              : '';
            text += `  • ${log.custom_title}${userTag}\n`;
          });
          text += "\n";
        } else if (!isOSCA && (dayOfWeekStr === "Saturday" || dayOfWeekStr === "Sunday")) {
          text += `${dateStr}:\n  • ${dayOfWeekStr}\n\n`;
        }
      }
    });

    return text.trim();
  }, [
    groupedLogs,
    formattedRange,
    offMap,
    selectedYear,
    selectedMonths,
    selectedPeriod,
  ]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownloadWord = async (formatOverride: "tabular" | "column") => {
    if (!logs || logs.length === 0) return;
    setDownloading(true);
    try {
      let templateName: string;
      if (activeTemplate === "osca") {
        templateName =
          formatOverride === "column"
            ? "/osca-template-column.docx"
            : "/osca-template.docx";
      } else if (activeTemplate === "ict") {
        templateName =
          formatOverride === "column"
            ? "/task-template-column.docx"
            : "/task-template.docx";
      } else if (activeTemplate === "mtc") {
        const mtcName =
          formatOverride === "column"
            ? "/MTC-Template-column.docx"
            : "/MTC-Template.docx";
        const mtcCheck = await fetch(mtcName, { method: "HEAD" });
        templateName = mtcCheck.ok
          ? mtcName
          : formatOverride === "column"
            ? "/other-department-template-column.docx"
            : "/other-department-template.docx";
      } else if (activeTemplate === "family_court") {
        const fcName =
          formatOverride === "column"
            ? "/Family Court Branch 7-Template-column.docx"
            : "/Family Court Branch 7-Template.docx";
        const fcCheck = await fetch(fcName, { method: "HEAD" });
        templateName = fcCheck.ok
          ? fcName
          : formatOverride === "column"
            ? "/other-department-template-column.docx"
            : "/other-department-template.docx";
      } else {
        templateName =
          formatOverride === "column"
            ? "/other-department-template-column.docx"
            : "/other-department-template.docx";
      }
      const response = await fetch(templateName);
      if (!response.ok) throw new Error("Could not fetch template");
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // 2. Unzip the file
      const zip = new PizZip(arrayBuffer);

      // 3. Initialize docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // 4. Prepare data payload
      let pagesPayload: any[] = [];

      selectedMonths.forEach(month => {
        const monthTasks: any[] = [];
        let startD = 1;
        let endD = new Date(selectedYear, month + 1, 0).getDate();
        if (selectedPeriod === "first_half") endD = 15;
        if (selectedPeriod === "second_half") startD = 16;

        for (let d = startD; d <= endD; d++) {
          const dateObj = new Date(selectedYear, month, d);
          const currentDateStr = format(dateObj, "MMMM d, yyyy");
          const dayOfWeekStr = format(dateObj, "EEEE");
          const dayLogs = groupedLogs[currentDateStr] || [];

          // For OSCA: only include dates that have actual tasks
          if (activeTemplate === "osca") {
            if (dayLogs.length > 0) {
              if (formatOverride === "column") {
                dayLogs.forEach((log) => {
                  monthTasks.push({
                    date: currentDateStr,
                    description: `• ${log.custom_title}`,
                    dayNumber: d,
                  });
                });
              } else {
                const description = dayLogs
                  .map((log) => `- ${log.custom_title}`)
                  .join("\n");
                monthTasks.push({
                  date: currentDateStr,
                  description: description,
                  dayNumber: d,
                });
              }
            }
            // Skip dates with no tasks entirely for OSCA
          } else {
            if (formatOverride === "column") {
              dayLogs.forEach((log) => {
                monthTasks.push({
                  date: "",
                  description: `• ${log.custom_title}`,
                  dayNumber: d,
                });
              });
            } else {
              let description = "";
              if (dayLogs.length > 0) {
                description = dayLogs
                  .map((log) => `- ${log.custom_title}`)
                  .join("\n");
              } else if (dayOfWeekStr === "Saturday" || dayOfWeekStr === "Sunday") {
                description = dayOfWeekStr;
              }

              monthTasks.push({
                date: currentDateStr,
                description: description,
                dayNumber: d,
              });
            }
          }
        }

        if (selectedPeriod === "full") {
          // Split into two pages
          const firstHalf = monthTasks.filter((t) => t.dayNumber <= 15);
          const secondHalf = monthTasks.filter((t) => t.dayNumber > 15);

          const startMonthStr = format(new Date(selectedYear, month, 1), "MMMM");

          if (activeTemplate === "osca") {
            // OSCA: show "Month of [Month] [Year]"
            pagesPayload.push({
              dateRange: `Month of ${startMonthStr} ${selectedYear}`,
              tasks: monthTasks,
            });
          } else {
            if (firstHalf.length > 0) {
              pagesPayload.push({
                dateRange: `${startMonthStr} 01-15, ${selectedYear}`,
                tasks: firstHalf,
              });
            }
            if (secondHalf.length > 0) {
              const lastDay = new Date(selectedYear, month + 1, 0).getDate();
              pagesPayload.push({
                dateRange: `${startMonthStr} 16-${lastDay}, ${selectedYear}`,
                tasks: secondHalf,
              });
            }
            if (pagesPayload.length === 0 || (firstHalf.length === 0 && secondHalf.length === 0)) {
               pagesPayload.push({ 
                 dateRange: `${startMonthStr} 01-${new Date(selectedYear, month + 1, 0).getDate()}, ${selectedYear}`, 
                 tasks: [] 
               });
            }
          }
        } else {
          const startMonthStr = format(new Date(selectedYear, month, 1), "MMMM");

          if (activeTemplate === "osca") {
            // OSCA: show "Month of [Month] [Year]"
            pagesPayload.push({
              dateRange: `Month of ${startMonthStr} ${selectedYear}`,
              tasks: monthTasks,
            });
          } else {
            let rangeText = "";
            if (selectedPeriod === "first_half") rangeText = `${startMonthStr} 01-15, ${selectedYear}`;
            else rangeText = `${startMonthStr} 16-${new Date(selectedYear, month + 1, 0).getDate()}, ${selectedYear}`;

            pagesPayload.push({
              dateRange: rangeText,
              tasks: monthTasks,
            });
          }
        }
      });

      // 5. Build role label for approver
      const approverTitle =
        deptHead?.role === "oic"
          ? "Officer In Charge"
          : deptHead?.role === "department_head"
            ? "Department Head"
            : "Department Head";

      // Helper function to Title Case (often referred to as camel case by non-programmers)
      const toTitleCase = (str: string) => {
        return str.replace(/\w\S*/g, function (txt) {
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
      };

      const generateAcronym = (name: string) => {
        if (!name) return "";
        // Known exceptions can go here if there are standard acronymsghfhgf
        return name
          .split(/\s+/)
          .filter(
            (word) =>
              !["and", "of", "the", "for", "in", "on", "at"].includes(
                word.toLowerCase(),
              ),
          )
          .map((word) => word.charAt(0).toUpperCase())
          .join("");
      };

      const formattedOffice = userOfficeName ? toTitleCase(userOfficeName) : "";
      const officeAcronym = userOfficeName
        ? generateAcronym(userOfficeName)
        : "";

      // 6. Renders
      // Pass variables at BOTH root level and inside pages so templates using
      // flat {#tasks} loops (MTC-style) and nested {#pages}{#tasks} loops both work.
      const firstPage = pagesPayload[0] ?? { tasks: [], dateRange: formattedRange };
      doc.render({
        // Root level variables (for flat-structure templates like MTC)
        office: formattedOffice,
        officeAcronym: officeAcronym,
        role: profile?.position_title || "",
        name: user?.user_metadata?.full_name || profile?.full_name || "User",
        user: user?.user_metadata?.full_name || profile?.full_name || "User",
        dateRange: formattedRange,
        tasks: firstPage.tasks,
        headOic: deptHead?.full_name || "",
        officer: approverTitle,
        // Pages array for nested-structure templates (other-dept / ICT style)
        pages: pagesPayload.map((page, index) => ({
          name: user?.user_metadata?.full_name || profile?.full_name || "User",
          user: user?.user_metadata?.full_name || profile?.full_name || "User",
          role: profile?.position_title || "",
          dateRange: page.dateRange,
          tasks: page.tasks,
          office: formattedOffice,
          officeAcronym: officeAcronym,
          headOic: deptHead?.full_name || "",
          officer: approverTitle,
          pageBreak:
            index < pagesPayload.length - 1
              ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
              : "",
        })),
      });

      // 6. Output and save
      const out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      saveAs(
        out,
        `Daily_Accomplishment_Report_${format(new Date(), "MMM_yyyy")}.docx`,
      );
    } catch (error) {
      console.error("Error generating document:", error);
      alert(
        "Failed to generate Word document. Please ensure the template exists and is valid.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" />
          Task Summary
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate a copyable summary of your tasks
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mr-1">
                <Filter className="h-4 w-4" />
                Period:
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal h-9 px-3 border-input bg-background hover:bg-accent hover:text-accent-foreground">
                    <span className="truncate">
                      {selectedMonths.length === 0
                        ? "Select months..."
                        : selectedMonths.length === 1
                          ? format(new Date(2000, selectedMonths[0], 1), "MMMM")
                          : `${selectedMonths.length} months selected`}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-2" align="start">
                  <div className="flex flex-col space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <Checkbox
                          id={`month-${i}`}
                          checked={selectedMonths.includes(i)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMonths([...selectedMonths, i].sort((a, b) => a - b));
                            } else {
                              setSelectedMonths(selectedMonths.filter((m) => m !== i));
                            }
                          }}
                        />
                        <Label htmlFor={`month-${i}`} className="cursor-pointer font-normal">
                          {format(new Date(2000, i, 1), "MMMM")}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedPeriod}
                onValueChange={(v: any) => setSelectedPeriod(v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_half">1st Half (1-15)</SelectItem>
                  <SelectItem value="second_half">2nd Half (16-End)</SelectItem>
                  <SelectItem value="full">Full Month</SelectItem>
                </SelectContent>
              </Select>

              {(profile?.role === 'admin' || profile?.role === 'department_head' || profile?.role === 'oic') && (
                <Select
                  value={selectedTargetUser}
                  onValueChange={setSelectedTargetUser}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users (All Encoded Tasks)</SelectItem>
                    {allProfiles?.map((p: any) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select
                value={selectedTemplate}
                onValueChange={(v) => setSelectedTemplate(v)}
              >
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Header Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    Header: Auto ({isOSCA ? "OSCA" : isICT ? "ICT" : isMTC ? "MTC" : isFamilyCourt ? "FC" : "General"})
                  </SelectItem>
                  <SelectItem value="osca">Senior Citizens (OSCA)</SelectItem>
                  <SelectItem value="ict">ICT Division</SelectItem>
                  <SelectItem value="mtc">MTC</SelectItem>
                  <SelectItem value="family_court">Family Court Branch 7</SelectItem>
                  <SelectItem value="general">Standard Department</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
              <Button
                onClick={() => handleDownloadWord("tabular")}
                disabled={!logs || logs.length === 0}
                className="bg-blue-600 hover:bg-blue-700 gap-2 flex-1 sm:flex-none whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                Export Tabular
              </Button>
              <Button
                onClick={() => handleDownloadWord("column")}
                disabled={!logs || logs.length === 0}
                className="bg-blue-600 hover:bg-blue-700 gap-2 flex-1 sm:flex-none whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                Export Column
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generated Report</CardTitle>
          <CardDescription>Preview of your task summary.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <div className="space-y-2 pl-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-1/3 mt-6" />
              <div className="space-y-2 pl-4">
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="bg-muted/50 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap border shadow-inner max-h-[600px] overflow-y-auto">
              {activeTemplate === "osca" && (
                <div className="bg-white text-zinc-900 p-6 rounded-lg mb-6 shadow-sm border font-serif text-center select-none">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <img src="/palayan_seal.png" alt="Palayan Seal" className="w-16 h-16 object-contain" />
                    <div className="flex-1">
                      <p className="font-bold text-base tracking-wide text-zinc-950">
                        Energetic Association of Senior Citizens of Palayan City
                      </p>
                      <p className="text-xs font-bold text-zinc-800">Senior Citizens Center</p>
                      <p className="text-xs font-semibold text-zinc-600">Barangay Singalat, Palayan City</p>
                    </div>
                    <img src="/osca_logo.jpg" alt="OSCA Logo" className="w-16 h-16 object-contain" />
                  </div>
                  <div className="h-0.5 bg-[#823b0b] w-full my-3" />
                  <h2 className="font-bold text-base text-zinc-950 uppercase tracking-wider font-serif">
                    ACCOMPLISHMENT REPORT
                  </h2>
                </div>
              )}
              {summaryText}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                No tasks found for this time range.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
