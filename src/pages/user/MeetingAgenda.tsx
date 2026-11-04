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
  Image as ImageIcon,
  Upload,
  Sparkles,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { getStoredAgendas, saveStoredAgenda } from '@/lib/meetingStorage';
import { injectPhotosToDocx, type DocxPhoto } from '@/lib/docxPhotoHelper';
import { compressImageFile, sliceGridImage } from '@/lib/imageCompression';

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

export interface AgendaPhoto {
  id: string;
  dataUrl: string;
  caption?: string;
}

export interface SavedAgendaRecord {
  id: string;
  savedAt: string;
  date: string;
  title: string;
  sections: AgendaSection[];
  photos?: AgendaPhoto[];
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
  const [photos, setPhotos] = useState<AgendaPhoto[]>([]);
  const [showPhotosInReport, setShowPhotosInReport] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'photos'>('preview');
  const [savedHistory, setSavedHistory] = useState<SavedAgendaRecord[]>([]);

  // Load draft & history from localStorage on mount
  useEffect(() => {
    try {
      getStoredAgendas().then((list) => {
        if (list && list.length > 0) setSavedHistory(list);
      });

      const draftStr = localStorage.getItem(LOCAL_CURRENT_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.meetingDate) setMeetingDate(draft.meetingDate);
        if (draft.meetingTitle) setMeetingTitle(draft.meetingTitle);
        if (draft.associationName) setAssociationName(draft.associationName);
        if (draft.centerName) setCenterName(draft.centerName);
        if (draft.locationName) setLocationName(draft.locationName);
        if (draft.sections && Array.isArray(draft.sections)) setSections(draft.sections);
        if (draft.photos && Array.isArray(draft.photos)) setPhotos(draft.photos);
        if (typeof draft.showPhotosInReport === 'boolean') setShowPhotosInReport(draft.showPhotosInReport);
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
        photos,
        showPhotosInReport,
      };
      localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(draft));
    } catch (e) {
      // Ignore quota errors
    }
  }, [meetingDate, meetingTitle, associationName, centerName, locationName, sections, photos, showPhotosInReport]);

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
  const handleSaveToHistory = async () => {
    const newRecord: SavedAgendaRecord = {
      id: `agenda-${Date.now()}`,
      savedAt: new Date().toISOString(),
      date: meetingDate,
      title: meetingTitle,
      sections,
      photos: showPhotosInReport ? photos : [],
    };
    try {
      const updated = await saveStoredAgenda(newRecord);
      setSavedHistory(updated);
      toast.success('Agenda saved to database & history!');
    } catch (e) {
      toast.error('Failed to save agenda');
    }
  };

  // Load from history
  const handleLoadRecord = (record: SavedAgendaRecord) => {
    setMeetingDate(record.date);
    setMeetingTitle(record.title);
    setSections(record.sections);
    if (record.photos && Array.isArray(record.photos)) {
      setPhotos(record.photos);
      setShowPhotosInReport(record.photos.length > 0);
    }
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


  // Photo management handlers
  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoadingPhotos(true);
    try {
      const newPhotos: AgendaPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressedUrl = await compressImageFile(file, 1000, 1000, 0.82);
        newPhotos.push({
          id: `photo-${Date.now()}-${i}`,
          dataUrl: compressedUrl,
          caption: '',
        });
      }
      setPhotos((prev) => [...prev, ...newPhotos]);
      setShowPhotosInReport(true);
      toast.success(`Added ${newPhotos.length} photo(s)`);
    } catch (err: any) {
      console.error('Photo upload error:', err);
      toast.error('Failed to process photos');
    } finally {
      setLoadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleLoadSamplePhotos = async () => {
    setLoadingPhotos(true);
    try {
      const slices = await sliceGridImage('/sample_meeting_grid.jpg');
      const sampleCaptions = [
        'Presiding Officers & Meeting Call to Order',
        'Federation Officers & Attendees Session',
        'Senior Citizen Presidents Discussion',
        'Attendance Review & Agenda Proceeding',
      ];
      const samplePhotos: AgendaPhoto[] = slices.map((url, idx) => ({
        id: `sample-photo-${Date.now()}-${idx}`,
        dataUrl: url,
        caption: sampleCaptions[idx] || `Photo ${idx + 1}`,
      }));
      setPhotos(samplePhotos);
      setShowPhotosInReport(true);
      toast.success('Loaded 4 sample meeting photos (2x2 grid)!');
    } catch (err: any) {
      console.error('Failed to load sample photos:', err);
      toast.error('Could not load sample photos');
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const handleUpdatePhotoCaption = (id: string, caption: string) => {
    setPhotos(photos.map((p) => (p.id === id ? { ...p, caption } : p)));
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= photos.length) return;
    const arr = [...photos];
    const temp = arr[index];
    arr[index] = arr[target];
    arr[target] = temp;
    setPhotos(arr);
  };

  const handleClearPhotos = () => {
    setPhotos([]);
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

      if (photos.length > 0 && showPhotosInReport) {
        injectPhotosToDocx(doc.getZip(), photos);
      }

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

          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-colors" title="Attach meeting photos (2x2 grid)">
            <Camera className="h-4 w-4" />
            <span>Attach Photos{photos.length > 0 ? ` (${photos.length})` : ''}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUploadPhotos}
            />
          </label>

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
            variant={activeTab === 'photos' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('photos')}
            className="rounded-xl gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700"
          >
            <Camera className="h-4 w-4" />
            <span>Attach Photos</span>
            {photos.length > 0 && (
              <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {photos.length}
              </span>
            )}
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


          {/* ── Photo Documentation Attachment Card ─────────────────── */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
              <div>
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-bold">
                    Attachment: Photo Documentation (2x2 Grid)
                  </CardTitle>
                </div>
                <CardDescription className="text-xs mt-1">
                  Attach documentation photos of attendees and meeting discussions. Displayed as a formal 2x2 grid in preview, print, and Word export.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingPhotos}
                  onClick={handleLoadSamplePhotos}
                  className="rounded-xl h-8 text-xs gap-1.5 border-dashed hover:border-primary"
                  title="Load the 4 meeting photos from the official template"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Load Sample Photos</span>
                </Button>

                <label className="cursor-pointer inline-flex items-center justify-center rounded-xl h-8 px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Photo(s)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUploadPhotos}
                  />
                </label>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {photos.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed bg-muted/20">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm font-semibold text-foreground">No photos attached yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    Upload your meeting photos or click &quot;Load Sample Photos&quot; to test with the 4 meeting photos shown in the official OSCA report.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Photo status & toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-muted/30 border text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {photos.length} photo{photos.length === 1 ? '' : 's'} attached
                      </span>
                      <span className="text-muted-foreground">• Arranged in 2x2 grid</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                        <input
                          type="checkbox"
                          checked={showPhotosInReport}
                          onChange={(e) => setShowPhotosInReport(e.target.checked)}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>Include in Report Preview & Export</span>
                      </label>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearPhotos}
                        className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                      >
                        Remove All
                      </Button>
                    </div>
                  </div>

                  {/* Photos Grid in Editor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {photos.map((photo, pIdx) => (
                      <div
                        key={photo.id}
                        className="p-3 rounded-xl border bg-card/60 backdrop-blur space-y-2.5 relative group"
                      >
                        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-black/5 border">
                          <img
                            src={photo.dataUrl}
                            alt={photo.caption || `Photo ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            #{pIdx + 1}
                          </span>

                          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur rounded-lg p-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={pIdx === 0}
                              onClick={() => handleMovePhoto(pIdx, 'up')}
                              className="h-6 w-6 text-white hover:bg-white/20 rounded"
                              title="Move earlier"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={pIdx === photos.length - 1}
                              onClick={() => handleMovePhoto(pIdx, 'down')}
                              className="h-6 w-6 text-white hover:bg-white/20 rounded"
                              title="Move later"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePhoto(photo.id)}
                              className="h-6 w-6 text-rose-400 hover:bg-rose-500/20 rounded"
                              title="Delete photo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <Input
                          value={photo.caption || ''}
                          onChange={(e) => handleUpdatePhotoCaption(photo.id, e.target.value)}
                          placeholder="Photo caption (e.g. Call to order / Discussion)..."
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      
      {/* ── Photos Tab Content ────────────────────────────────────── */}
      {activeTab === 'photos' && (
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
            <div>
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-base font-bold">
                  Attachment: Photo Documentation (2x2 Grid)
                </CardTitle>
              </div>
              <CardDescription className="text-xs mt-1">
                Attach photos of the meeting, attendees, and discussions. Displayed as a formal 2x2 grid in preview, print, and Word export.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingPhotos}
                onClick={handleLoadSamplePhotos}
                className="rounded-xl h-8 text-xs gap-1.5 border-dashed hover:border-purple-500"
                title="Load the 4 meeting photos from the official template"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Load Sample Photos</span>
              </Button>

              <label className="cursor-pointer inline-flex items-center justify-center rounded-xl h-8 px-3 text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Photo(s)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleUploadPhotos}
                />
              </label>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {photos.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed bg-muted/20">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">No photos attached yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Click &quot;Load Sample Photos&quot; to test with the 4 photos from the official OSCA meeting, or upload your own meeting photos.
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLoadSamplePhotos}
                    disabled={loadingPhotos}
                    className="rounded-xl h-8 text-xs gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Load Sample Photos
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {photos.length} photo{photos.length === 1 ? '' : 's'} attached
                    </span>
                    <span className="text-muted-foreground">• Arranged in 2x2 grid</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                      <input
                        type="checkbox"
                        checked={showPhotosInReport}
                        onChange={(e) => setShowPhotosInReport(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-600 h-4 w-4"
                      />
                      <span>Include in Report & Word Export</span>
                    </label>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearPhotos}
                      className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                    >
                      Remove All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {photos.map((photo, pIdx) => (
                    <div
                      key={photo.id}
                      className="p-3 rounded-xl border bg-card/60 backdrop-blur space-y-2.5 relative group"
                    >
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-black/5 border">
                        <img
                          src={photo.dataUrl}
                          alt={photo.caption || `Photo ${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          #{pIdx + 1}
                        </span>

                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur rounded-lg p-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={pIdx === 0}
                            onClick={() => handleMovePhoto(pIdx, 'up')}
                            className="h-6 w-6 text-white hover:bg-white/20 rounded"
                            title="Move earlier"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={pIdx === photos.length - 1}
                            onClick={() => handleMovePhoto(pIdx, 'down')}
                            className="h-6 w-6 text-white hover:bg-white/20 rounded"
                            title="Move later"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePhoto(photo.id)}
                            className="h-6 w-6 text-rose-400 hover:bg-rose-500/20 rounded"
                            title="Delete photo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <Input
                        value={photo.caption || ''}
                        onChange={(e) => handleUpdatePhotoCaption(photo.id, e.target.value)}
                        placeholder="Photo caption (e.g. Call to order / Discussion)..."
                        className="h-8 text-xs rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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

          
          {/* ── Photo Documentation Attachment Section ───────────── */}
          {photos.length === 0 ? (
            <div className="mt-10 p-6 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/90 text-center print:hidden hover:border-purple-400 transition-all shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center mb-2.5">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-zinc-900 font-sans">
                Attachment: Photo Documentation (2x2 Grid)
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto font-sans">
                Attach meeting photos to appear in this agenda report. They will be formatted as a 2x2 photo documentation grid in print and Word export.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow transition-all font-sans">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Meeting Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUploadPhotos}
                  />
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLoadSamplePhotos}
                  disabled={loadingPhotos}
                  className="rounded-xl h-8 text-xs gap-1.5 font-sans bg-white hover:bg-zinc-100 border-zinc-300"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Load Sample Photos (Template Guide)</span>
                </Button>
              </div>
            </div>
          ) : (
            showPhotosInReport && (
              <div className="mt-12 pt-8 border-t-2 border-zinc-300 print:break-before-page">
                {/* Header & Quick Action Toolbar (hidden during print) */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 print:hidden font-sans">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" />
                      {photos.length} Documentation Photos (2x2 Grid)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('photos')}
                      className="h-7 px-2.5 text-xs rounded-lg gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <Settings2 className="h-3 w-3" />
                      Manage / Edit Captions
                    </Button>
                    <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors">
                      <Upload className="h-3 w-3" />
                      Add More
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleUploadPhotos}
                      />
                    </label>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h3 className="font-bold text-base md:text-lg tracking-wider text-zinc-950 uppercase font-serif">
                    ATTACHMENT: PHOTO DOCUMENTATION
                  </h3>
                  <p className="text-xs text-zinc-600 font-serif italic mt-0.5">
                    Documentation of meeting attendees, agenda discussions, and proceedings
                  </p>
                </div>

                {/* 2x2 Grid matching the user's guide template */}
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  {photos.map((photo, pIdx) => (
                    <div key={photo.id} className="flex flex-col items-center">
                      <div className="w-full aspect-[4/3] bg-zinc-100 rounded-lg overflow-hidden border border-zinc-300 shadow-sm flex items-center justify-center">
                        <img
                          src={photo.dataUrl}
                          alt={photo.caption || `Meeting documentation photo ${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {photo.caption && (
                        <p className="text-[11px] md:text-xs text-zinc-700 mt-2 text-center font-serif italic leading-tight px-1">
                          {photo.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

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

