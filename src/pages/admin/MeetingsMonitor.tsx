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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Camera,
  FileCheck2,
  FileText,
  Search,
  RefreshCw,
  Download,
  Printer,
  Trash2,
  Eye,
  Users,
  Building2,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getStoredAgendas,
  getStoredMinutes,
  deleteStoredAgenda,
  deleteStoredMinutes,
} from '@/lib/meetingStorage';
import type { SavedAgendaRecord } from '@/pages/user/MeetingAgenda';
import type { MinutesRecord } from '@/pages/user/MinutesOfMeeting';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { injectPhotosToDocx } from '@/lib/docxPhotoHelper';

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

export default function MeetingsMonitor() {
  const [agendas, setAgendas] = useState<SavedAgendaRecord[]>([]);
  const [minutes, setMinutes] = useState<MinutesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'agendas' | 'minutes'>('agendas');

  // Preview modal state
  const [previewAgenda, setPreviewAgenda] = useState<SavedAgendaRecord | null>(null);
  const [previewMinutes, setPreviewMinutes] = useState<MinutesRecord | null>(null);

  // Load records
  const loadRecords = async () => {
    setLoading(true);
    try {
      const [agendasList, minutesList] = await Promise.all([
        getStoredAgendas(),
        getStoredMinutes(),
      ]);
      setAgendas(agendasList);
      setMinutes(minutesList);
    } catch (e) {
      toast.error('Failed to load meeting records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Filter agendas
  const filteredAgendas = useMemo(() => {
    if (!search.trim()) return agendas;
    const q = search.toLowerCase();
    return agendas.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.date.toLowerCase().includes(q) ||
        a.sections.some(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.subItems.some((sub) => sub.title.toLowerCase().includes(q))
        )
    );
  }, [agendas, search]);

  // Filter minutes
  const filteredMinutes = useMemo(() => {
    if (!search.trim()) return minutes;
    const q = search.toLowerCase();
    return minutes.filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.date.toLowerCase().includes(q) ||
        m.preparedByName.toLowerCase().includes(q) ||
        m.attestedByName.toLowerCase().includes(q) ||
        m.attendees.some((a) => a.toLowerCase().includes(q)) ||
        m.discussions.some((d) => d.topicTitle.toLowerCase().includes(q))
    );
  }, [minutes, search]);

  // Export Agenda docx
  const handleDownloadAgenda = async (agenda: SavedAgendaRecord) => {
    try {
      const response = await fetch('/osca-agenda-template.docx');
      if (!response.ok) throw new Error('Could not fetch agenda template');
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      const payloadItems = agenda.sections.map((sec, idx) => ({
        roman: toRoman(idx + 1),
        name: sec.title,
        subItems: sec.subItems.map((sub, sIdx) => ({
          num: String(sIdx + 1),
          subTitle: sub.title,
          note: sub.note ? ` ${sub.note}` : '',
        })),
      }));

      doc.render({
        date: agenda.date,
        title: agenda.title,
        items: payloadItems,
      });

      if (agenda.photos && agenda.photos.length > 0) {
        injectPhotosToDocx(doc.getZip(), agenda.photos);
      }

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const safeDate = agenda.date.replace(/[^a-zA-Z0-9]/g, '_');
      saveAs(out, `OSCA_Meeting_Agenda_${safeDate}.docx`);
      toast.success('Agenda Word document downloaded!');
    } catch (err: any) {
      toast.error('Failed to export agenda: ' + (err.message || ''));
    }
  };

  // Export Minutes docx
  const handleDownloadMinutes = async (min: MinutesRecord) => {
    try {
      const response = await fetch('/osca-minutes-template.docx');
      if (!response.ok) throw new Error('Could not fetch minutes template');
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      const payloadAttendees = min.attendees.map((a) => ({ name: a }));
      const payloadDiscussions = min.discussions.map((d) => ({
        topicTitle: d.topicTitle,
        topicContent: d.topicContent,
        listItems: [],
      }));


      doc.render({
        date: min.date,
        subject: min.subject,
        meetingVenueTime: min.meetingVenueTime,
        meetingLocation: min.meetingLocation,
        meetingOpening: min.meetingOpening,
        attendees: payloadAttendees,
        proceedingsTitle: min.proceedingsTitle,
        callToOrder: min.callToOrder,
        discussions: payloadDiscussions,
        preparedByName: min.preparedByName,
        preparedByRole: min.preparedByRole,
        attestedByName: min.attestedByName,
        attestedByRole: min.attestedByRole,
      });

      if (min.photos && min.photos.length > 0) {
        injectPhotosToDocx(doc.getZip(), min.photos);
      }

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const safeDate = min.date.replace(/[^a-zA-Z0-9]/g, '_');
      saveAs(out, `OSCA_Minutes_of_Meeting_${safeDate}.docx`);
      toast.success('Minutes Word document downloaded!');
    } catch (err: any) {
      toast.error('Failed to export minutes: ' + (err.message || ''));
    }
  };

  // Delete Agenda
  const handleDeleteAgenda = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this meeting agenda record?')) {
      const updated = await deleteStoredAgenda(id);
      setAgendas(updated);
      toast.success('Agenda record deleted');
    }
  };

  // Delete Minutes
  const handleDeleteMinutes = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this minutes record?')) {
      const updated = await deleteStoredMinutes(id);
      setMinutes(updated);
      toast.success('Minutes record deleted');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-primary" />
            Meeting Records Monitor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Supervise, review, export, and manage official Meeting Agendas and Minutes of the Meeting submitted across offices.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadRecords}
          disabled={loading}
          className="rounded-xl h-9 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* ── Stats Overview ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Meeting Agendas
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {agendas.length}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Saved & monitored
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Minutes of Meeting
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {minutes.length}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Full proceedings recorded
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Topics / Sections
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {agendas.reduce((acc, a) => acc + a.sections.length, 0) +
                  minutes.reduce((acc, m) => acc + m.discussions.length, 0)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Items across all records
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Controls ────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={activeTab === 'agendas' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('agendas')}
            className="rounded-xl gap-2 flex-1 sm:flex-initial"
          >
            <Calendar className="h-4 w-4" />
            Meeting Agendas
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {filteredAgendas.length}
            </Badge>
          </Button>

          <Button
            variant={activeTab === 'minutes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('minutes')}
            className="rounded-xl gap-2 flex-1 sm:flex-initial"
          >
            <FileCheck2 className="h-4 w-4" />
            Minutes of Meeting
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {filteredMinutes.length}
            </Badge>
          </Button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records by title, date..."
            className="pl-9 rounded-xl h-9 text-sm"
          />
        </div>
      </div>

      {/* ── Agendas Tab ─────────────────────────────────────── */}
      {activeTab === 'agendas' && (
        <div className="space-y-4">
          {filteredAgendas.length === 0 ? (
            <Card className="rounded-2xl border text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">No meeting agendas found</p>
              <p className="text-xs text-muted-foreground mt-1">
                When users save meeting agendas, they will appear here automatically.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAgendas.map((agenda) => (
                <Card
                  key={agenda.id}
                  className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-blue-500 border-blue-500/30 bg-blue-500/10 mb-2"
                        >
                          Meeting Agenda
                        </Badge>
                        <CardTitle className="text-base font-bold text-foreground line-clamp-1">
                          {agenda.title}
                        </CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{agenda.date}</span>
                          <span>•</span>
                          <span>{agenda.sections.length} Sections</span>
                          {agenda.photos && agenda.photos.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 font-semibold flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                {agenda.photos.length} Photo{agenda.photos.length === 1 ? '' : 's'}
                              </span>
                            </>
                          )}
                        </CardDescription>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAgenda(agenda.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-lg shrink-0"
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {/* Items preview snippet */}
                    <div className="bg-muted/30 p-3 rounded-xl space-y-1.5 text-xs text-muted-foreground">
                      {agenda.sections.slice(0, 3).map((sec, i) => (
                        <div key={sec.id} className="flex items-center gap-2">
                          <span className="font-serif font-bold text-foreground">
                            {toRoman(i + 1)}.
                          </span>
                          <span className="truncate">{sec.title}</span>
                          {sec.subItems.length > 0 && (
                            <span className="text-[10px] text-muted-foreground/70">
                              ({sec.subItems.length} sub-topics)
                            </span>
                          )}
                        </div>
                      ))}
                      {agenda.sections.length > 3 && (
                        <p className="text-[10px] italic text-muted-foreground/70 pl-5">
                          + {agenda.sections.length - 3} more sections...
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewAgenda(agenda)}
                        className="rounded-xl h-8 text-xs gap-1.5 flex-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview Document
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownloadAgenda(agenda)}
                        className="rounded-xl h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export Word
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Minutes Tab ─────────────────────────────────────── */}
      {activeTab === 'minutes' && (
        <div className="space-y-4">
          {filteredMinutes.length === 0 ? (
            <Card className="rounded-2xl border text-center py-12">
              <FileCheck2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">No meeting minutes found</p>
              <p className="text-xs text-muted-foreground mt-1">
                When users save minutes of meetings, they will appear here automatically.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMinutes.map((min) => (
                <Card
                  key={min.id}
                  className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10 mb-2"
                        >
                          Minutes of Meeting
                        </Badge>
                        <CardTitle className="text-base font-bold text-foreground line-clamp-1">
                          {min.subject}
                        </CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{min.date}</span>
                          <span>•</span>
                          <span>{min.discussions.length} Discussions</span>
                          {min.photos && min.photos.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 font-semibold flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                {min.photos.length} Photo{min.photos.length === 1 ? '' : 's'}
                              </span>
                            </>
                          )}
                        </CardDescription>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMinutes(min.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-lg shrink-0"
                        title="Delete record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {/* Snippet details */}
                    <div className="bg-muted/30 p-3 rounded-xl space-y-1 text-xs text-muted-foreground">
                      <p className="line-clamp-1">
                        <strong className="text-foreground">Venue:</strong> {min.meetingVenueTime}
                      </p>
                      <p className="line-clamp-1">
                        <strong className="text-foreground">Attendees:</strong>{' '}
                        {min.attendees.slice(0, 2).join(', ')}... ({min.attendees.length} total)
                      </p>
                      <p className="line-clamp-1">
                        <strong className="text-foreground">Prepared by:</strong> {min.preparedByName} ({min.preparedByRole})
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewMinutes(min)}
                        className="rounded-xl h-8 text-xs gap-1.5 flex-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview Document
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleDownloadMinutes(min)}
                        className="rounded-xl h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export Word
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Agenda Document Preview Dialog ──────────────────── */}
      <Dialog open={!!previewAgenda} onOpenChange={(open) => !open && setPreviewAgenda(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Meeting Agenda Document Preview
            </DialogTitle>
            {previewAgenda && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="rounded-xl h-8 text-xs gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleDownloadAgenda(previewAgenda)}
                  className="rounded-xl h-8 text-xs gap-1 bg-primary hover:bg-primary/90"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export Word
                </Button>
              </div>
            )}
          </DialogHeader>

          {previewAgenda && (
            <div className="flex justify-center py-4 bg-muted/20 rounded-xl">
              <div
                className="bg-white text-zinc-950 font-serif w-full max-w-[750px] min-h-[850px] p-8 md:p-12 rounded-xl shadow-lg border border-zinc-200"
                style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
              >
                {/* Header with Seals */}
                <div className="flex items-center justify-between gap-4 pb-2">
                  <div className="w-16 h-16 shrink-0">
                    <img src="/palayan_seal.png" alt="Seal" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 text-center">
                    <h2 className="font-bold text-sm md:text-base text-zinc-950 leading-tight">
                      Energetic Association of Senior Citizens of Palayan City
                    </h2>
                    <p className="text-xs font-bold text-zinc-800 mt-0.5">Senior Citizens Center</p>
                    <p className="text-xs font-semibold text-zinc-700">Barangay Singalat, Palayan City</p>
                  </div>
                  <div className="w-16 h-16 shrink-0">
                    <img src="/osca_logo.jpg" alt="OSCA Logo" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="w-full h-[2px] my-3" style={{ backgroundColor: '#823b0b' }} />

                <div className="text-right mt-4 mb-6 text-sm font-bold text-zinc-950">
                  {previewAgenda.date}
                </div>

                <div className="text-center my-5">
                  <h1 className="text-base font-bold text-zinc-950">{previewAgenda.title}</h1>
                </div>

                <div className="mt-6 space-y-3 text-sm text-zinc-950 pl-4">
                  {previewAgenda.sections.map((sec, idx) => (
                    <div key={sec.id} className="space-y-1">
                      <div className="font-bold flex items-baseline gap-2">
                        <span className="w-7 shrink-0">{toRoman(idx + 1)}.</span>
                        <span>{sec.title}</span>
                      </div>
                      {sec.subItems.length > 0 && (
                        <div className="pl-7 space-y-1">
                          {sec.subItems.map((sub, sIdx) => (
                            <div key={sub.id} className="flex items-baseline gap-2">
                              <span className="w-5 shrink-0">{sIdx + 1}.</span>
                              <span className="font-semibold">{sub.title}</span>
                              {sub.note && <span className="font-normal">{sub.note}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                  {/* Photo Documentation Section (2x2 Grid) */}
                  {previewAgenda.photos && previewAgenda.photos.length > 0 ? (
                    <div className="mt-10 pt-6 border-t-2 border-zinc-300 print:break-before-page">
                      <div className="text-center mb-5">
                        <h3 className="font-bold text-sm md:text-base tracking-wider text-zinc-950 uppercase font-serif">
                          ATTACHMENT: PHOTO DOCUMENTATION
                        </h3>
                        <p className="text-xs text-zinc-600 font-serif italic mt-0.5">
                          Documentation of meeting attendees and agenda proceedings
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {previewAgenda.photos.map((photo, pIdx) => (
                          <div key={photo.id || pIdx} className="flex flex-col items-center">
                            <div className="w-full aspect-[4/3] bg-zinc-100 rounded-lg overflow-hidden border border-zinc-300 shadow-sm flex items-center justify-center">
                              <img
                                src={photo.dataUrl}
                                alt={photo.caption || `Photo ${pIdx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            {photo.caption && (
                              <p className="text-[10px] md:text-xs text-zinc-700 mt-1.5 text-center font-serif italic leading-tight px-1">
                                {photo.caption}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 p-4 rounded-xl border border-dashed border-zinc-300 text-center text-zinc-400 text-xs">
                      No photo documentation attached for this record.
                    </div>
                  )}

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Minutes Document Preview Dialog ─────────────────── */}
      <Dialog open={!!previewMinutes} onOpenChange={(open) => !open && setPreviewMinutes(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-500" />
              Minutes of the Meeting Document Preview
            </DialogTitle>
            {previewMinutes && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="rounded-xl h-8 text-xs gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleDownloadMinutes(previewMinutes)}
                  className="rounded-xl h-8 text-xs gap-1 bg-primary hover:bg-primary/90"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export Word
                </Button>
              </div>
            )}
          </DialogHeader>

          {previewMinutes && (
            <div className="flex justify-center py-4 bg-muted/20 rounded-xl">
              <div
                className="bg-white text-zinc-950 font-serif w-full max-w-[780px] min-h-[950px] p-8 md:p-12 rounded-xl shadow-lg border border-zinc-200"
                style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
              >
                {/* Header with Seals */}
                <div className="flex items-center justify-between gap-4 pb-2">
                  <div className="w-16 h-16 shrink-0">
                    <img src="/palayan_seal.png" alt="Seal" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 text-center">
                    <h2 className="font-bold text-sm md:text-base text-zinc-950 leading-tight">
                      Energetic Association of Senior Citizens of Palayan City
                    </h2>
                    <p className="text-xs font-bold text-zinc-800 mt-0.5">Senior Citizens Center</p>
                    <p className="text-xs font-semibold text-zinc-700">Barangay Singalat, Palayan City</p>
                  </div>
                  <div className="w-16 h-16 shrink-0">
                    <img src="/osca_logo.jpg" alt="OSCA Logo" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="w-full h-[2px] my-3" style={{ backgroundColor: '#823b0b' }} />

                <div className="text-right mt-4 mb-4 text-sm font-bold text-zinc-950">
                  {previewMinutes.date}
                </div>

                <div className="font-bold text-base text-zinc-950 mb-5">
                  {previewMinutes.subject}
                </div>

                {/* 1. Start of Meeting */}
                <div className="mb-5 flex items-start gap-3 text-sm">
                  <span className="font-bold shrink-0">1. Start of the meeting:</span>
                  <div className="font-bold">
                    <p>{previewMinutes.meetingVenueTime}</p>
                    <p>{previewMinutes.meetingLocation}</p>
                    <p className="font-normal">{previewMinutes.meetingOpening}</p>
                  </div>
                </div>

                {/* 2. Presents */}
                <div className="mb-6 flex items-start gap-3 text-sm">
                  <span className="font-bold shrink-0">2. Presents in the meeting:</span>
                  <div className="font-bold space-y-0.5">
                    {previewMinutes.attendees.map((a, i) => (
                      <p key={i}>{a}</p>
                    ))}
                  </div>
                </div>

                {/* 3. Proceedings */}
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-bold text-base">3. {previewMinutes.proceedingsTitle}</p>
                    <p className="text-zinc-900 mt-1 leading-relaxed text-justify">
                      {previewMinutes.callToOrder}
                    </p>
                  </div>

                  {previewMinutes.discussions.map((d) => (
                    <div key={d.id} className="space-y-1 pt-1">
                      <h3 className="font-bold text-zinc-950 underline decoration-zinc-400 underline-offset-2">
                        {d.topicTitle}
                      </h3>
                      <div className="text-zinc-900 leading-relaxed text-justify whitespace-pre-line">
                        {d.topicContent}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Photo Documentation Section */}
                {previewMinutes.photos && previewMinutes.photos.length > 0 ? (
                  <div className="mt-10 pt-6 border-t-2 border-zinc-300 print:break-before-page">
                    <div className="text-center mb-5">
                      <h3 className="font-bold text-sm md:text-base tracking-wider text-zinc-950 uppercase font-serif">
                        ATTACHMENT: PHOTO DOCUMENTATION
                      </h3>
                      <p className="text-xs text-zinc-600 font-serif italic mt-0.5">
                        Documentation of meeting attendees and proceedings
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {previewMinutes.photos.map((photo, pIdx) => (
                        <div key={(photo as any).id || pIdx} className="flex flex-col items-center">
                          <div className="w-full aspect-[4/3] bg-zinc-100 rounded-lg overflow-hidden border border-zinc-300 shadow-sm flex items-center justify-center">
                            <img
                              src={photo.dataUrl}
                              alt={(photo as any).caption || `Photo ${pIdx + 1}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          {(photo as any).caption && (
                            <p className="text-[10px] md:text-xs text-zinc-700 mt-1.5 text-center font-serif italic leading-tight px-1">
                              {(photo as any).caption}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 p-4 rounded-xl border border-dashed border-zinc-300 text-center text-zinc-400 text-xs">
                    No photo documentation attached for this record.
                  </div>
                )}

                {/* Signatures */}
                <div className="mt-10 pt-6 grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-zinc-700 mb-8">Prepared by:</p>
                    <p className="font-bold text-zinc-950 uppercase">{previewMinutes.preparedByName}</p>
                    <p className="text-xs text-zinc-700">{previewMinutes.preparedByRole}</p>
                  </div>
                  <div>
                    <p className="text-zinc-700 mb-8">Attested / Noted by:</p>
                    <p className="font-bold text-zinc-950 uppercase">{previewMinutes.attestedByName}</p>
                    <p className="text-xs text-zinc-700">{previewMinutes.attestedByRole}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

