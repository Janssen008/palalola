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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Copy,
  CheckCircle2,
  Filter,
  Download,
  RotateCcw,
  Plus,
  Trash2,
  FileCheck2,
  Printer,
} from "lucide-react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type SignatoryItem,
  DEFAULT_SIGNATORIES,
  getSavedSignatories,
  saveSignatories,
  generateDocxSignatoriesTableXml,
} from "@/lib/oscaSignatories";

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

  const [signatories, setSignatories] = useState<SignatoryItem[]>(getSavedSignatories);

  const handleToggleSignatory = (id: string, enabled: boolean) => {
    const updated = signatories.map((s) => (s.id === id ? { ...s, enabled } : s));
    setSignatories(updated);
    saveSignatories(updated);
  };

  const handleUpdateSignatory = (id: string, field: 'label' | 'name' | 'role', val: string) => {
    const updated = signatories.map((s) => (s.id === id ? { ...s, [field]: val } : s));
    setSignatories(updated);
    saveSignatories(updated);
  };

  const handleAddSignatory = () => {
    const newSig: SignatoryItem = {
      id: 'sig-' + Date.now(),
      enabled: true,
      label: 'Signatory / Official:',
      name: '',
      role: 'OSCA Officer',
    };
    const updated = [...signatories, newSig];
    setSignatories(updated);
    saveSignatories(updated);
  };

  const handleRemoveSignatory = (id: string) => {
    const updated = signatories.filter((s) => s.id !== id);
    setSignatories(updated);
    saveSignatories(updated);
  };

  const handleResetSignatories = () => {
    const currentUserName = user?.user_metadata?.full_name || profile?.full_name || "VENAFLOR P. DIESTRO";
    const currentUserRole = profile?.position_title || (currentUserName.toLowerCase().includes("diestro") ? "Secretary, Senior Citizens Association" : "Secretary");

    const standard: SignatoryItem[] = [
      {
        id: 'sig-secretary',
        enabled: true,
        label: 'Prepared by:',
        name: currentUserName.toUpperCase(),
        role: currentUserRole,
      },
      {
        id: 'sig-vp',
        enabled: true,
        label: 'Attested by / Vice President:',
        name: 'DANILO DC. VALDEZ',
        role: 'Vice President, Senior Citizens Association',
      },
      {
        id: 'sig-treasurer',
        enabled: true,
        label: 'Certified by / Treasurer:',
        name: 'ROSENNIE S. PRONTO',
        role: 'Treasurer, Senior Citizens Association',
      },
      {
        id: 'sig-oic',
        enabled: true,
        label: 'Approved by / OIC:',
        name: 'NELIA V. TRINIDAD',
        role: 'OSCA Chairperson / OIC',
      },
    ];
    setSignatories(standard);
    saveSignatories(standard);
    toast.info('Signatories reset to standard OSCA template');
  };

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

      // 5. Build name and role label for approver & signatories
      const activeSigs = signatories.filter((s) => s.enabled && s.name && s.name.trim().length > 0);
      const firstActive = activeSigs[0];
      const lastActive = activeSigs.length > 1 ? activeSigs[activeSigs.length - 1] : activeSigs[0];

      const userNameStr = firstActive?.name || user?.user_metadata?.full_name || profile?.full_name || "User";
      const userRoleStr = firstActive?.role || profile?.position_title || (userNameStr.toLowerCase().includes("diestro") ? "Secretary, Senior Citizens Association" : "Secretary");

      const defaultApproverName = isOSCA ? "NELIA V. TRINIDAD" : (deptHead?.full_name || "NELIA V. TRINIDAD");
      const defaultApproverTitle = isOSCA
        ? "OSCA Chairperson / OIC"
        : deptHead?.role === "oic"
          ? "Officer In Charge"
          : "Department Head";

      const finalApproverName = lastActive && lastActive !== firstActive ? lastActive.name : defaultApproverName;
      const finalApproverRole = lastActive && lastActive !== firstActive ? lastActive.role : defaultApproverTitle;

      const sigTableXml = generateDocxSignatoriesTableXml(signatories, 'Century Gothic', 'center');

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
        role: userRoleStr,
        name: userNameStr,
        user: userNameStr,
        dateRange: formattedRange,
        tasks: firstPage.tasks,
        headOic: finalApproverName,
        officer: finalApproverRole,
        signatoriesSection: sigTableXml,
        // Pages array for nested-structure templates (other-dept / ICT style)
        pages: pagesPayload.map((page, index) => ({
          name: userNameStr,
          user: userNameStr,
          role: userRoleStr,
          dateRange: page.dateRange,
          tasks: page.tasks,
          office: formattedOffice,
          officeAcronym: officeAcronym,
          headOic: finalApproverName,
          officer: finalApproverRole,
          signatoriesSection: sigTableXml,
          pageBreak:
            index < pagesPayload.length - 1
              ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
              : "",
        })),
      });

      // Enforce 8.5 x 13 in (12240 x 18720 dxa) Legal size
      const docXmlFile = doc.getZip().file('word/document.xml');
      if (docXmlFile) {
        let docXml = docXmlFile.asText();
        if (docXml.includes('<w:pgSz')) {
          docXml = docXml.replace(/<w:pgSz[^>]*\/>/g, '<w:pgSz w:w="12240" w:h="18720"/>');
          doc.getZip().file('word/document.xml', docXml);
        }
      }

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

      {/* ── Signatories & Approvals Card ────────────────────────── */}
      <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                Signatories &amp; Approvals
              </CardTitle>
              <CardDescription className="text-xs">
                Tick (check) which officers/members will appear in the accomplishment report signatory output.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetSignatories}
                className="rounded-xl text-xs h-8"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset Standard
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddSignatory}
                className="rounded-xl text-xs h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Signatory
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signatories.map((sig) => (
              <div
                key={sig.id}
                className={cn(
                  "p-3.5 rounded-xl border transition-all space-y-3",
                  sig.enabled
                    ? "bg-card border-primary/40 shadow-sm ring-1 ring-primary/20"
                    : "bg-muted/20 border-dashed border-muted text-muted-foreground opacity-60"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sig.enabled}
                      onChange={(e) => handleToggleSignatory(sig.id, e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                    <span className={cn("text-xs font-bold uppercase tracking-wider", sig.enabled ? "text-primary" : "text-muted-foreground")}>
                      {sig.enabled ? '✓ Included in Output' : '✕ Hidden from Output'}
                    </span>
                  </label>

                  {signatories.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSignatory(sig.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      title="Remove signatory"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground">Signatory Header / Label</Label>
                  <Input
                    value={sig.label}
                    onChange={(e) => handleUpdateSignatory(sig.id, 'label', e.target.value)}
                    placeholder="e.g. Prepared by: or Attested by:"
                    className="rounded-lg h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground">Officer Full Name</Label>
                  <Input
                    value={sig.name}
                    onChange={(e) => handleUpdateSignatory(sig.id, 'name', e.target.value)}
                    placeholder="e.g. VENAFLOR P. DIESTRO"
                    className="rounded-lg h-8 text-xs font-bold uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground">Position Title / Office</Label>
                  <Input
                    value={sig.role}
                    onChange={(e) => handleUpdateSignatory(sig.id, 'role', e.target.value)}
                    placeholder="e.g. Secretary, Senior Citizens Association"
                    className="rounded-lg h-8 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Accomplishment Report Preview Card ──────────────────── */}
      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Accomplishment Report Preview
            </CardTitle>
            <CardDescription>
              Formal preview of your daily accomplishment report with selected signatories.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="rounded-xl h-8 text-xs gap-1.5"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-xl h-8 text-xs gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <Button
              size="sm"
              onClick={() => handleDownloadWord("tabular")}
              disabled={!logs || logs.length === 0 || downloading}
              className="rounded-xl h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Export Tabular
            </Button>
            <Button
              size="sm"
              onClick={() => handleDownloadWord("column")}
              disabled={!logs || logs.length === 0 || downloading}
              className="rounded-xl h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Export Column
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
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
            <div className="flex justify-center py-4 bg-muted/20 rounded-xl">
              <div
                id="printable-area"
                className="bg-white text-zinc-950 font-serif w-full max-w-[780px] min-h-[900px] p-8 md:p-12 rounded-xl shadow-lg border border-zinc-200 print:shadow-none print:border-none print:p-0 print:w-full"
                style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
              >
                {/* Header with Official Seals */}
                <div className="grid grid-cols-[104px_1fr_104px] items-center gap-4 pb-1">
                  <div className="w-[104px] h-[104px] shrink-0 flex items-center justify-center">
                    <img src="/palayan_seal.png" alt="Seal" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 text-center px-2">
                    <h2 className="font-bold text-base md:text-lg tracking-wide text-zinc-950 leading-tight font-serif">
                      Energetic Association of Senior Citizens of Palayan City
                    </h2>
                    <p className="text-xs md:text-sm font-bold text-zinc-800 mt-1">Senior Citizens Center</p>
                    <p className="text-xs md:text-sm font-semibold text-zinc-700">Barangay Singalat, Palayan City</p>
                  </div>
                  <div className="w-[104px] h-[104px] shrink-0 flex items-center justify-center">
                    <img src="/osca_logo.jpg" alt="OSCA Logo" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="w-full h-[2px] mt-2 mb-6" style={{ backgroundColor: '#823b0b' }} />

                {/* Title */}
                <div className="text-center my-6">
                  <h1 className="text-lg font-bold text-zinc-950 tracking-wide uppercase underline underline-offset-4 font-serif">
                    Daily Accomplishment Report
                  </h1>
                  <p className="text-xs md:text-sm font-semibold text-zinc-700 mt-1">
                    Period: {formattedRange}
                  </p>
                </div>

                {/* Tasks content grouped by date */}
                <div className="space-y-5 text-sm leading-relaxed text-zinc-900">
                  {selectedMonths.map((month) => {
                    let startD = 1;
                    let endD = new Date(selectedYear, month + 1, 0).getDate();
                    if (selectedPeriod === "first_half") endD = 15;
                    if (selectedPeriod === "second_half") startD = 16;

                    const dateNodes = [];
                    for (let d = startD; d <= endD; d++) {
                      const dateObj = new Date(selectedYear, month, d);
                      const dateStr = format(dateObj, "MMMM d, yyyy");
                      const dayOfWeekStr = format(dateObj, "EEEE");
                      const dayLogs = groupedLogs[dateStr];

                      if (dayLogs && dayLogs.length > 0) {
                        dateNodes.push(
                          <div key={dateStr} className="space-y-1.5 border-b border-zinc-100 pb-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-zinc-950">{dateStr}</span>
                              <span className="text-xs text-zinc-500 font-sans">{dayOfWeekStr}</span>
                            </div>
                            <ul className="pl-4 space-y-1 list-disc text-zinc-800">
                              {dayLogs.map((log) => {
                                const userTag = (selectedTargetUser === 'all' && (profile?.role === 'admin' || profile?.role === 'department_head' || profile?.role === 'oic'))
                                  ? ` [${profileMap.get(log.user_id)?.full_name ?? 'Staff'}]`
                                  : '';
                                return (
                                  <li key={log.id} className="text-sm">
                                    <span className="font-medium text-zinc-950">{log.custom_title}</span>
                                    {userTag && <span className="text-xs text-primary font-sans font-semibold ml-1">{userTag}</span>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      } else if (!isOSCA && (dayOfWeekStr === "Saturday" || dayOfWeekStr === "Sunday")) {
                        dateNodes.push(
                          <div key={dateStr} className="flex items-center justify-between text-xs text-zinc-500 border-b border-zinc-100 py-1">
                            <span className="font-semibold">{dateStr}</span>
                            <span>{dayOfWeekStr}</span>
                          </div>
                        );
                      }
                    }

                    return (
                      <div key={month} className="space-y-3">
                        {selectedMonths.length > 1 && (
                          <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-wider border-b-2 border-zinc-300 pb-1">
                            {format(new Date(selectedYear, month, 1), "MMMM yyyy")}
                          </h3>
                        )}
                        {dateNodes}
                      </div>
                    );
                  })}
                </div>

                {/* Signatories Section - Displays only ticked signatories */}
                <div className="mt-14 pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm md:text-base border-t border-zinc-300 print:border-t-zinc-400">
                  {signatories
                    .filter((s) => s.enabled && s.name && s.name.trim().length > 0)
                    .map((sig) => (
                      <div key={sig.id} className="space-y-1">
                        <p className="text-zinc-700 mb-8 font-medium">{sig.label}</p>
                        <p className="font-bold text-zinc-950 uppercase tracking-wide underline underline-offset-2">
                          {sig.name}
                        </p>
                        <p className="text-xs md:text-sm text-zinc-700">{sig.role}</p>
                      </div>
                    ))}
                </div>
              </div>
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
