import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Download,
  Printer,
  Copy,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Save,
  CheckCircle2,
  Calendar,
  FileText,
  ListOrdered,
  Eye,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export interface SubAgendaItem {
  id: string;
  title: string;
  note: string;
}

export interface AgendaSection {
  id: string;
  title: string;
  subItems: SubAgendaItem[];
}

export interface SavedAgendaRecord {
  id: string;
  savedAt: string;
  date: string;
  title: string;
  sections: AgendaSection[];
}

// Convert numbers to Roman numerals (I, II, III, IV, V, VI, etc.)
function toRoman(num: number): string {
  const romanMap: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let result = '';
  for (const [val, roman] of romanMap) {
    while (num >= val) {
      result += roman;
      num -= val;
    }
  }
  return result || 'I';
}

const DEFAULT_OSCA_SECTIONS: AgendaSection[] = [
  {
    id: 'sec-1',
    title: 'Prayer',
    subItems: [],
  },
  {
    id: 'sec-2',
    title: 'Singing of National Anthem',
    subItems: [],
  },
  {
    id: 'sec-3',
    title: 'Palayan City Hymn',
    subItems: [],
  },
  {
    id: 'sec-4',
    title: 'Reporting',
    subItems: [
      {
        id: 'sub-4-1',
        title: "Secretary's report",
        note: '(Venaflor P. Diestro)',
      },
      {
        id: 'sub-4-2',
        title: "Treasurer's report",
        note: '(Rosennie S. Pronto)',
      },
    ],
  },
  {
    id: 'sec-5',
    title: 'Agenda',
    subItems: [
      {
        id: 'sub-5-1',
        title: 'National/LGU Pension',
        note: '',
      },
      {
        id: 'sub-5-2',
        title: 'Election of Federation Officers',
        note: '',
      },
    ],
  },
  {
    id: 'sec-6',
    title: 'Other Matters',
    subItems: [],
  },
];

const LOCAL_STORAGE_KEY = 'osca_saved_agendas_history_v1';
const LOCAL_CURRENT_KEY = 'osca_current_agenda_draft_v1';

export default function MeetingAgenda() {
  const [meetingDate, setMeetingDate] = useState('May 5, 2026');
  const [meetingTitle, setMeetingTitle] = useState(
    'Monthly Meeting of Senior Citizen Association of Palayan City'
  );
  const [associationName, setAssociationName] = useState(
    'Energetic Association of Senior Citizens of Palayan City'
  );
  const [centerName, setCenterName] = useState('Senior Citizens Center');
  const [locationName, setLocationName] = useState(
    'Barangay Singalat, Palayan City'
  );

  const [sections, setSections] = useState<AgendaSection[]>(DEFAULT_OSCA_SECTIONS);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');
  const [savedHistory, setSavedHistory] = useState<SavedAgendaRecord[]>([]);

  // Load draft & history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistoryStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedHistoryStr) {
        setSavedHistory(JSON.parse(savedHistoryStr));
      }

      const draftStr = localStorage.getItem(LOCAL_CURRENT_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.meetingDate) setMeetingDate(draft.meetingDate);
        if (draft.meetingTitle) setMeetingTitle(draft.meetingTitle);
        if (draft.associationName) setAssociationName(draft.associationName);
        if (draft.centerName) setCenterName(draft.centerName);
        if (draft.locationName) setLocationName(draft.locationName);
        if (draft.sections && Array.isArray(draft.sections)) setSections(draft.sections);
      }
    } catch (e) {
      console.warn('Failed to load saved agenda data:', e);
    }
  }, []);

  // Auto-save draft on changes
  useEffect(() => {
    try {
      const draft = {
        meetingDate,
        meetingTitle,
        associationName,
        centerName,
        locationName,
        sections,
      };
      localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(draft));
    } catch (e) {
      // Ignore quota errors
    }
  }, [meetingDate, meetingTitle, associationName, centerName, locationName, sections]);

  // Section manipulation helpers
  const handleAddSection = () => {
    const newSection: AgendaSection = {
      id: `sec-${Date.now()}`,
      title: 'New Agenda Item',
      subItems: [],
    };
    setSections([...sections, newSection]);
  };

  const handleUpdateSectionTitle = (secId: string, title: string) => {
    setSections(sections.map((s) => (s.id === secId ? { ...s, title } : s)));
  };

  const handleDeleteSection = (secId: string) => {
    setSections(sections.filter((s) => s.id !== secId));
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const newArr = [...sections];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    setSections(newArr);
  };

  // Sub-item manipulation helpers
  const handleAddSubItem = (secId: string) => {
    const newSubItem: SubAgendaItem = {
      id: `sub-${Date.now()}`,
      title: 'New Sub-topic',
      note: '',
    };
    setSections(
      sections.map((s) =>
        s.id === secId ? { ...s, subItems: [...s.subItems, newSubItem] } : s
      )
    );
  };

  const handleUpdateSubItem = (
    secId: string,
    subId: string,
    field: 'title' | 'note',
    value: string
  ) => {
    setSections(
      sections.map((s) => {
        if (s.id !== secId) return s;
        return {
          ...s,
          subItems: s.subItems.map((sub) =>
            sub.id === subId ? { ...sub, [field]: value } : sub
          ),
        };
      })
    );
  };

  const handleDeleteSubItem = (secId: string, subId: string) => {
    setSections(
      sections.map((s) =>
        s.id === secId
          ? { ...s, subItems: s.subItems.filter((sub) => sub.id !== subId) }
          : s
      )
    );
  };

  // Reset to default OSCA template
  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Reset agenda to the default OSCA Monthly Meeting template?'
      )
    ) {
      setMeetingDate('May 5, 2026');
      setMeetingTitle('Monthly Meeting of Senior Citizen Association of Palayan City');
      setAssociationName('Energetic Association of Senior Citizens of Palayan City');
      setCenterName('Senior Citizens Center');
      setLocationName('Barangay Singalat, Palayan City');
      setSections(DEFAULT_OSCA_SECTIONS);
      toast.info('Template reset to default OSCA meeting layout');
    }
  };

  // Save current agenda to history
  const handleSaveToHistory = () => {
    const newRecord: SavedAgendaRecord = {
      id: `record-${Date.now()}`,
      savedAt: new Date().toISOString(),
      date: meetingDate,
      title: meetingTitle,
      sections,
    };
    const updated = [newRecord, ...savedHistory.slice(0, 19)]; // Keep up to 20
    setSavedHistory(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      toast.success('Agenda saved to history!');
    } catch (e) {
      toast.error('Failed to save to local history');
    }
  };

  // Load from history
  const handleLoadRecord = (record: SavedAgendaRecord) => {
    setMeetingDate(record.date);
    setMeetingTitle(record.title);
    setSections(record.sections);
    toast.success(`Loaded agenda from ${format(new Date(record.savedAt), 'MMM d, yyyy h:mm a')}`);
  };

  // Generate plain text for copying
  const plainTextSummary = useMemo(() => {
    let text = `${associationName}\n${centerName}\n${locationName}\n\n`;
    text += `${meetingDate}\n\n`;
    text += `${meetingTitle}\n\n`;

    sections.forEach((sec, idx) => {
      text += `${toRoman(idx + 1)}. ${sec.title}\n`;
      sec.subItems.forEach((sub, subIdx) => {
        text += `    ${subIdx + 1}. ${sub.title}${sub.note ? ` ${sub.note}` : ''}\n`;
      });
      text += '\n';
    });

    return text.trim();
  }, [associationName, centerName, locationName, meetingDate, meetingTitle, sections]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(plainTextSummary);
      setCopied(true);
      toast.success('Agenda text copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Download Word docx
  const handleDownloadWord = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/osca-agenda-template.docx');
      if (!response.ok) throw new Error('Could not fetch agenda template');
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Format payload for docxtemplater
      const payloadItems = sections.map((sec, idx) => ({
        roman: toRoman(idx + 1),
        name: sec.title,
        subItems: sec.subItems.map((sub, sIdx) => ({
          num: String(sIdx + 1),
          subTitle: sub.title,
          note: sub.note ? ` ${sub.note}` : '',
        })),
      }));

      doc.render({
        date: meetingDate,
        title: meetingTitle,
        items: payloadItems,
      });

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const safeDate = meetingDate.replace(/[^a-zA-Z0-9]/g, '_');
      saveAs(out, `OSCA_Meeting_Agenda_${safeDate}.docx`);
      toast.success('Word document downloaded successfully!');
    } catch (err: any) {
      console.error('Error generating docx:', err);
      toast.error('Failed to generate Word document: ' + (err.message || ''));
    } finally {
      setDownloading(false);
    }
  };

  // Direct print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Top Header Bar (Hidden during print) ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-2.5">
            <Calendar className="h-7 w-7 text-primary" />
            Meeting Agenda
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create, customize, print, and export official OSCA meeting agendas.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyText}
            className="rounded-xl h-9 gap-1.5"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveToHistory}
            className="rounded-xl h-9 gap-1.5"
            title="Save agenda to local history"
          >
            <Save className="h-4 w-4 text-blue-500" />
            <span>Save</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="rounded-xl h-9 gap-1.5"
            title="Print or Save as PDF"
          >
            <Printer className="h-4 w-4 text-amber-500" />
            <span>Print / PDF</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={downloading}
            onClick={handleDownloadWord}
            className="rounded-xl h-9 gap-1.5 bg-primary hover:bg-primary/90 shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>{downloading ? 'Exporting...' : 'Export Word (.docx)'}</span>
          </Button>
        </div>
      </div>

      {/* ── Tabs / View Switcher (Hidden during print) ─────────────── */}
      <div className="flex items-center justify-between border-b pb-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'preview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('preview')}
            className="rounded-xl gap-2"
          >
            <Eye className="h-4 w-4" />
            Document Preview
          </Button>
          <Button
            variant={activeTab === 'editor' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('editor')}
            className="rounded-xl gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Edit Agenda Items ({sections.length})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {savedHistory.length > 0 && (
            <select
              aria-label="Load past agenda"
              className="text-xs bg-muted/60 border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => {
                const found = savedHistory.find((r) => r.id === e.target.value);
                if (found) handleLoadRecord(found);
                e.target.value = '';
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Load Past Agenda ({savedHistory.length})
              </option>
              {savedHistory.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.date} — {rec.title.slice(0, 30)}...
                </option>
              ))}
            </select>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetToDefault}
            className="text-xs text-muted-foreground hover:text-foreground rounded-lg h-8 gap-1"
            title="Reset all fields to OSCA template defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Default</span>
          </Button>
        </div>
      </div>

      {/* ── Editor Card (shown when tab === 'editor') ──────────────── */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 gap-6 print:hidden">
          {/* Meeting Metadata Card */}
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Meeting Header Details
              </CardTitle>
              <CardDescription className="text-xs">
                Configure the meeting date and titles shown at the top of the agenda document.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Meeting Date</Label>
                <Input
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  placeholder="e.g. May 5, 2026"
                  className="rounded-xl h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Meeting Title</Label>
                <Input
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Monthly Meeting of Senior Citizen Association of Palayan City"
                  className="rounded-xl h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Organization / Association</Label>
                <Input
                  value={associationName}
                  onChange={(e) => setAssociationName(e.target.value)}
                  className="rounded-xl h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Center & Barangay / City</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={centerName}
                    onChange={(e) => setCenterName(e.target.value)}
                    placeholder="Center Name"
                    className="rounded-xl h-9 text-sm"
                  />
                  <Input
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Location"
                    className="rounded-xl h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agenda Items List */}
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-primary" />
                  Agenda Sections ({sections.length})
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Top-level sections use Roman numerals (I, II, III...). Sub-items are numbered (1, 2...).
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddSection}
                className="rounded-xl h-8 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Section
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {sections.map((section, sIdx) => {
                const roman = toRoman(sIdx + 1);
                return (
                  <div
                    key={section.id}
                    className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors space-y-3"
                  >
                    {/* Section Top Header */}
                    <div className="flex items-center gap-3">
                      <span className="font-bold font-serif text-sm w-8 shrink-0 text-primary">
                        {roman}.
                      </span>
                      <Input
                        value={section.title}
                        onChange={(e) =>
                          handleUpdateSectionTitle(section.id, e.target.value)
                        }
                        placeholder="Section title (e.g. Prayer, Reporting, Agenda...)"
                        className="rounded-xl h-9 text-sm font-semibold flex-1"
                      />

                      {/* Reorder and Delete Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={sIdx === 0}
                          onClick={() => handleMoveSection(sIdx, 'up')}
                          className="h-8 w-8 rounded-lg"
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={sIdx === sections.length - 1}
                          onClick={() => handleMoveSection(sIdx, 'down')}
                          className="h-8 w-8 rounded-lg"
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSection(section.id)}
                          className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          title="Delete section"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Sub-items */}
                    <div className="pl-8 space-y-2">
                      {section.subItems.map((sub, subIdx) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 bg-background/50 p-2 rounded-lg border border-border/40"
                        >
                          <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                            {subIdx + 1}.
                          </span>
                          <Input
                            value={sub.title}
                            onChange={(e) =>
                              handleUpdateSubItem(
                                section.id,
                                sub.id,
                                'title',
                                e.target.value
                              )
                            }
                            placeholder="Topic title (e.g. Secretary's report)"
                            className="rounded-lg h-8 text-xs flex-1 font-medium"
                          />
                          <Input
                            value={sub.note}
                            onChange={(e) =>
                              handleUpdateSubItem(
                                section.id,
                                sub.id,
                                'note',
                                e.target.value
                              )
                            }
                            placeholder="Assignee / Note (e.g. (Venaflor P. Diestro))"
                            className="rounded-lg h-8 text-xs w-48 text-muted-foreground"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSubItem(section.id, sub.id)}
                            className="h-7 w-7 rounded-md text-muted-foreground hover:text-rose-500"
                            title="Remove sub-item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddSubItem(section.id)}
                        className="text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg h-7 gap-1 mt-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Sub-topic
                      </Button>
                    </div>
                  </div>
                );
              })}

              <Button
                variant="outline"
                onClick={handleAddSection}
                className="w-full rounded-xl border-dashed h-11 text-xs gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add New Agenda Section
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Live Document Preview (WYSIWYG & Print target) ────────── */}
      <div className="flex justify-center w-full">
        <div
          id="printable-agenda-document"
          className="printable-agenda-document bg-white text-zinc-950 font-serif w-full max-w-[800px] min-h-[960px] p-8 md:p-14 rounded-2xl shadow-xl border border-zinc-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none"
          style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
        >
          {/* Header with Seals & Central Text */}
          <div className="flex items-center justify-between gap-4 pb-3">
            {/* Left Seal */}
            <div className="w-20 h-20 shrink-0 flex items-center justify-center">
              <img
                src="/palayan_seal.png"
                alt="Palayan City Seal"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Central Headings */}
            <div className="flex-1 text-center px-2">
              <h2 className="font-bold text-base md:text-lg tracking-wide text-zinc-950 leading-tight">
                {associationName}
              </h2>
              <p className="text-xs md:text-sm font-bold text-zinc-800 mt-1">
                {centerName}
              </p>
              <p className="text-xs md:text-sm font-semibold text-zinc-700">
                {locationName}
              </p>
            </div>

            {/* Right Seal */}
            <div className="w-20 h-20 shrink-0 flex items-center justify-center">
              <img
                src="/osca_logo.jpg"
                alt="OSCA Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Brown / Gold Divider Line */}
          <div
            className="w-full h-[2.5px] my-3"
            style={{ backgroundColor: '#823b0b' }}
          />

          {/* Right Aligned Date */}
          <div className="text-right mt-6 mb-8 text-sm md:text-base font-bold text-zinc-950">
            {meetingDate}
          </div>

          {/* Centered Meeting Title */}
          <div className="text-center my-6">
            <h1 className="text-base md:text-lg font-bold text-zinc-950 tracking-wide">
              {meetingTitle}
            </h1>
          </div>

          {/* Numbered Agenda Items */}
          <div className="mt-8 space-y-4 text-sm md:text-base text-zinc-950 leading-relaxed pl-2 md:pl-6">
            {sections.map((section, idx) => {
              const roman = toRoman(idx + 1);
              return (
                <div key={section.id} className="space-y-1.5">
                  {/* Top Level Item */}
                  <div className="font-bold flex items-baseline gap-2">
                    <span className="w-8 shrink-0">{roman}.</span>
                    <span>{section.title}</span>
                  </div>

                  {/* Sub-items */}
                  {section.subItems.length > 0 && (
                    <div className="pl-8 space-y-1 mt-1">
                      {section.subItems.map((sub, sIdx) => (
                        <div
                          key={sub.id}
                          className="flex items-baseline gap-2 text-zinc-900"
                        >
                          <span className="w-6 shrink-0">{sIdx + 1}.</span>
                          <span className="font-semibold">{sub.title}</span>
                          {sub.note && (
                            <span className="font-normal text-zinc-800">
                              {sub.note}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Print Specific Stylesheet */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          nav, header, aside, button, .print\\:hidden {
            display: none !important;
          }
          .printable-agenda-document {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
