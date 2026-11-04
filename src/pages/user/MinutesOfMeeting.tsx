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
import { Textarea } from '@/components/ui/textarea';
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
  FileCheck2,
  Eye,
  Settings2,
  Users,
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
import { getStoredMinutes, saveStoredMinutes } from '@/lib/meetingStorage';
import { injectPhotosToDocx, type DocxPhoto } from '@/lib/docxPhotoHelper';
import { compressImageFile, sliceGridImage } from '@/lib/imageCompression';

export interface DiscussionItem {
  id: string;
  topicTitle: string;
  topicContent: string;
}

export interface MinutesRecord {
  id: string;
  savedAt: string;
  date: string;
  subject: string;
  meetingVenueTime: string;
  meetingLocation: string;
  meetingOpening: string;
  attendees: string[];
  proceedingsTitle: string;
  callToOrder: string;
  discussions: DiscussionItem[];
  preparedByName: string;
  preparedByRole: string;
  attestedByName: string;
  attestedByRole: string;
  photos?: DocxPhoto[];
}

const DEFAULT_ATTENDEES: string[] = [
  'OSCA Chairman Nelia V. Trinidad',
  'FSCPC Pres. Danilo DC. Valdez',
  'PCSC Focal Person Rowena Ritual, RSW',
  'Mrs. Elsie DL. Datu, Federation Adviser',
  'And Nineteen Presidents of Barangays.',
];

const DEFAULT_DISCUSSIONS: DiscussionItem[] = [
  {
    id: 'disc-1',
    topicTitle: 'Attendance',
    topicContent:
      'At the beginning of the meeting, Ms. Rowena D. Ritual conduct the attendance by calling up each barangay president to confirm his/her presence. She reminded everyone to properly sign the attendance sheet, emphasizing that the attendance record strictly required for TEV (Travel Expenses Voucher) purposes.',
  },
  {
    id: 'disc-2',
    topicTitle: 'Reading and Approval of the Previous Minutes',
    topicContent:
      'The secretary of the federation was requested to read the Minutes of the Meeting held on September 03, 2026. After the minutes were read was given opportunity to raise any correction or clarification. The minutes was approved by the federation adviser Elsie Datu and seconded by Ms. Paule, President of Bagong Buhay.',
  },
  {
    id: 'disc-3',
    topicTitle: 'Reading of the Financial Statement',
    topicContent:
      'The financial statement for the month of September 2026 was presented and read by Ms. Rosennie Pronto, President of Barangay Marcos and Federation Treasurer for the information and consideration of the federation member.',
  },
  {
    id: 'disc-4',
    topicTitle: 'Agenda No.1 – NCSC Octogenarian/ Nonagenarian Payout',
    topicContent:
      'The first agenda, concerned the schedule NCSC Octogenarian and Nonagenarian, cash benefits payout, which will be held on October 20, 2026 at 1:00 PM at Kalayaan Hall.\n\nThe list of Senior Citizen who are qualified to receive their cash benefits was distributed to the concerned Barangay President, the member were reminded being their original OSCA ID or National ID on the scheduled payout.\n\nMs. Rowena D. Ritual also requested the barangay President to identify and submit the names of Senior Citizen who have not yet received their cash benefits for the year 2024 and 2025. Copies of the list will be forwarded to the Over all President Danilo Dc. Valdez and OSCA Chairperson Nelia V. Trinidad for proper coordination and follow-up.',
  },
  {
    id: 'disc-5',
    topicTitle: 'Agenda No. 2 – LGU New List of Applicants',
    topicContent:
      'They discussed the new list of applicants under the LGU Senior Citizen assistance program.\n\nIt was reported that 104 senior citizen were removed from the National List and transferred to the LGU list, from the available 416 waitlisted applicants, the qualified beneficiaries will be selected by the respective Barangay Senior Citizen President.\n\nThe selected names will be undergo revalidation by the DSWDO will be subsequently be submitted for approval of the City Mayor\'s Office.',
  },
  {
    id: 'disc-6',
    topicTitle: 'Agenda No. 3 – DSWD Hybrid Payout',
    topicContent:
      'The next month discussed was the DSWD Hybrid Payout, which includes and additional 6500 benefits for qualified senior citizen. The payout is scheduled for October 13, 2026.\n\nThe number of qualified beneficiaries per Barangay was presented as follows:\n1. Maligaya-2\n2. Atate-5\n3. Bagong Buhay-2\n4. Caballero-4\n5. Marcos-2\n6. Popolon-none\n7. Langka-none\n8. Doña Josefa-4\n9. Aulo-none\n10. Militar-1\n11. Manacnac-2\n12. Imelda Valley-6\n13. Malate-none\n14. Ganaderia\n15. Santolan-4\n16. Mapait-none\n17. Sapang Buho-none\n18. Singalat- 1\n\nThe barangay president were reminded to properly coordinate with their respective beneficiaries regarding the payout schedule.',
  },
  {
    id: 'disc-7',
    topicTitle: 'Submission of Octogenarian/Nonagenarian Applicants Forms',
    topicContent:
      'They also reminded that all octogenarian and nonagenarian application forms to be submitted to the National Commission of Senior Citizen (NCSC) must first be endorsed by the City Mayors Office. The deadline for submission is October 12, 2026, all concerned officers were advised to ensure the required documents are compete and submitted on or before the deadline.',
  },
  {
    id: 'disc-8',
    topicTitle: 'LGU Payout- Barangay Pairing',
    topicContent:
      'The body was informed that the LGU payout maybe conducted the following weeks, subject to find schedule. For orderly processing the Barangays will be lined up and paired as follow:\n1. Maligaya/ Singalat\n2. Atate/ Mapait\n3. Bagong Buhay/ Langka\n4. Caballero/ Ganaderia\n5. Marcos Village / Santolan\n6. Manacnac /Doña Josefa\n7. Caimito / Malate\n8. Popolon/ Imelda Valley\n9. Militar / Aulo\n10. Sapang Buho\n\nThe Barangay President were advised to coordinate with the concerned offices and beneficiaries once the final payout scheduled announced.',
  },
  {
    id: 'disc-9',
    topicTitle: 'Other Matters',
    topicContent:
      'NCSC Elderly Filipino week Kick off celebration and other matters, OSCA Chairperson Nelia V. Trinidad reported on the NCSC Elderly Filipino Week Kick Off Celebration.',
  },
];

const LOCAL_STORAGE_KEY = 'osca_saved_minutes_history_v1';
const LOCAL_CURRENT_KEY = 'osca_current_minutes_draft_v1';

export default function MinutesOfMeeting() {
  const [meetingDate, setMeetingDate] = useState('October 5, 2026');
  const [subject, setSubject] = useState('SUBJECT: Minutes of the Meeting');
  const [meetingVenueTime, setMeetingVenueTime] = useState(
    '10:00 AM, October 05, 2026 at Senior Citizens Center'
  );
  const [meetingLocation, setMeetingLocation] = useState(
    'Brgy. Singalat, Palayan City'
  );
  const [meetingOpening, setMeetingOpening] = useState(
    'With prayer, Singing of National Anthem.'
  );

  const [attendees, setAttendees] = useState<string[]>(DEFAULT_ATTENDEES);
  const [proceedingsTitle, setProceedingsTitle] = useState(
    'The meeting of Federation of Senior Citizen of Palayan City'
  );
  const [callToOrder, setCallToOrder] = useState(
    'The meeting was called to order by the PCSC Focal Person Ma. Rowena D. Ritual, RSW who welcomed the federation officer and Barangay Senior Citizen President present.'
  );
  const [discussions, setDiscussions] =
    useState<DiscussionItem[]>(DEFAULT_DISCUSSIONS);

  const [preparedByName, setPreparedByName] = useState('VENAFLOR P. DIESTRO');
  const [preparedByRole, setPreparedByRole] = useState(
    'Secretary, Senior Citizens Association'
  );
  const [attestedByName, setAttestedByName] = useState('NELIA V. TRINIDAD');
  const [attestedByRole, setAttestedByRole] = useState(
    'OSCA Chairman / Officer-in-Charge'
  );

  const [downloading, setDownloading] = useState(false);
  const [photos, setPhotos] = useState<DocxPhoto[]>([]);
  const [showPhotosInReport, setShowPhotosInReport] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'photos'>('preview');
  const [savedHistory, setSavedHistory] = useState<MinutesRecord[]>([]);

  // Load draft & history from localStorage on mount
  useEffect(() => {
    try {
      getStoredMinutes().then((list) => {
        if (list && list.length > 0) setSavedHistory(list);
      });

      const draftStr = localStorage.getItem(LOCAL_CURRENT_KEY);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.meetingDate) setMeetingDate(draft.meetingDate);
        if (draft.subject) setSubject(draft.subject);
        if (draft.meetingVenueTime) setMeetingVenueTime(draft.meetingVenueTime);
        if (draft.meetingLocation) setMeetingLocation(draft.meetingLocation);
        if (draft.meetingOpening) setMeetingOpening(draft.meetingOpening);
        if (draft.attendees && Array.isArray(draft.attendees)) {
          const cleanAttendees = draft.attendees.filter((a: any) => a && typeof a === 'string' && a.trim() !== '' && a !== 'undefined');
          if (cleanAttendees.length > 0) setAttendees(cleanAttendees);
        }
        if (draft.proceedingsTitle) setProceedingsTitle(draft.proceedingsTitle);
        if (draft.callToOrder) setCallToOrder(draft.callToOrder);
        if (draft.discussions && Array.isArray(draft.discussions)) {
          const cleanDisc = draft.discussions.filter((d: any) => d && (d.topicTitle || d.topicContent) && d.topicTitle !== 'undefined' && d.topicContent !== 'undefined');
          if (cleanDisc.length > 0) setDiscussions(cleanDisc);
        }
        if (draft.preparedByName) setPreparedByName(draft.preparedByName);
        if (draft.preparedByRole) setPreparedByRole(draft.preparedByRole);
        if (draft.attestedByName) setAttestedByName(draft.attestedByName);
        if (draft.attestedByRole) setAttestedByRole(draft.attestedByRole);
        if (draft.photos && Array.isArray(draft.photos)) setPhotos(draft.photos);
        if (typeof draft.showPhotosInReport === 'boolean') setShowPhotosInReport(draft.showPhotosInReport);
      }
    } catch (e) {
      console.warn('Failed to load saved minutes data:', e);
    }
  }, []);

  // Auto-save draft on changes
  useEffect(() => {
    try {
      const draft = {
        meetingDate,
        subject,
        meetingVenueTime,
        meetingLocation,
        meetingOpening,
        attendees,
        proceedingsTitle,
        callToOrder,
        discussions,
        preparedByName,
        preparedByRole,
        attestedByName,
        attestedByRole,
        photos,
        showPhotosInReport,
      };
      localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(draft));
    } catch (e) {
      // Ignore quota errors
    }
  }, [
    meetingDate,
    subject,
    meetingVenueTime,
    meetingLocation,
    meetingOpening,
    attendees,
    proceedingsTitle,
    callToOrder,
    discussions,
    preparedByName,
    preparedByRole,
    attestedByName,
    attestedByRole,
  ]);

  // Attendee helpers
  const handleAddAttendee = () => {
    setAttendees([...attendees, 'New Attendee / Position']);
  };

  const handleUpdateAttendee = (idx: number, val: string) => {
    const updated = [...attendees];
    updated[idx] = val;
    setAttendees(updated);
  };

  const handleDeleteAttendee = (idx: number) => {
    setAttendees(attendees.filter((_, i) => i !== idx));
  };

  // Discussion helpers
  const handleAddDiscussion = () => {
    const newItem: DiscussionItem = {
      id: `disc-${Date.now()}`,
      topicTitle: 'New Agenda / Topic',
      topicContent: 'Description or details discussed during the meeting...',
    };
    setDiscussions([...discussions, newItem]);
  };

  const handleUpdateDiscussion = (
    id: string,
    field: 'topicTitle' | 'topicContent',
    value: string
  ) => {
    setDiscussions(
      discussions.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleDeleteDiscussion = (id: string) => {
    setDiscussions(discussions.filter((d) => d.id !== id));
  };

  const handleMoveDiscussion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= discussions.length) return;
    const newArr = [...discussions];
    const temp = newArr[index];
    newArr[index] = newArr[targetIndex];
    newArr[targetIndex] = temp;
    setDiscussions(newArr);
  };

  // Reset to default OSCA template
  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Reset minutes of meeting to the default OSCA template from October 5, 2026?'
      )
    ) {
      setMeetingDate('October 5, 2026');
      setSubject('SUBJECT: Minutes of the Meeting');
      setMeetingVenueTime('10:00 AM, October 05, 2026 at Senior Citizens Center');
      setMeetingLocation('Brgy. Singalat, Palayan City');
      setMeetingOpening('With prayer, Singing of National Anthem.');
      setAttendees(DEFAULT_ATTENDEES);
      setProceedingsTitle('The meeting of Federation of Senior Citizen of Palayan City');
      setCallToOrder(
        'The meeting was called to order by the PCSC Focal Person Ma. Rowena D. Ritual, RSW who welcomed the federation officer and Barangay Senior Citizen President present.'
      );
      setDiscussions(DEFAULT_DISCUSSIONS);
      setPreparedByName('VENAFLOR P. DIESTRO');
      setPreparedByRole('Secretary, Senior Citizens Association');
      setAttestedByName('NELIA V. TRINIDAD');
      setAttestedByRole('OSCA Chairman / Officer-in-Charge');
      toast.info('Template reset to default OSCA Minutes of Meeting');
    }
  };

  // Save to history
  const handleSaveToHistory = async () => {
    const record: MinutesRecord = {
      id: `minutes-${Date.now()}`,
      savedAt: new Date().toISOString(),
      date: meetingDate,
      subject,
      meetingVenueTime,
      meetingLocation,
      meetingOpening,
      attendees,
      proceedingsTitle,
      callToOrder,
      discussions,
      preparedByName,
      preparedByRole,
      attestedByName,
      attestedByRole,
      photos: showPhotosInReport ? photos : [],
    };
    try {
      const updated = await saveStoredMinutes(record);
      setSavedHistory(updated);
      toast.success('Minutes saved to database & history!');
    } catch (e) {
      toast.error('Failed to save minutes');
    }
  };

  // Load record
  const handleLoadRecord = (record: MinutesRecord) => {
    setMeetingDate(record.date);
    setSubject(record.subject);
    setMeetingVenueTime(record.meetingVenueTime);
    setMeetingLocation(record.meetingLocation);
    setMeetingOpening(record.meetingOpening);
    setAttendees(record.attendees);
    setProceedingsTitle(record.proceedingsTitle);
    setCallToOrder(record.callToOrder);
    setDiscussions(record.discussions);
    setPreparedByName(record.preparedByName);
    setPreparedByRole(record.preparedByRole);
    setAttestedByName(record.attestedByName);
    setAttestedByRole(record.attestedByRole);
    if (record.photos && Array.isArray(record.photos)) {
      setPhotos(record.photos);
      setShowPhotosInReport(record.photos.length > 0);
    }
    toast.success(`Loaded minutes from ${format(new Date(record.savedAt), 'MMM d, yyyy h:mm a')}`);
  };

  // Generate plain text
  const plainText = useMemo(() => {
    let t = `Energetic Association of Senior Citizens of Palayan City\nSenior Citizens Center\nBarangay Singalat, Palayan City\n\n`;
    t += `${meetingDate}\n\n`;
    t += `${subject}\n\n`;
    t += `1. Start of the meeting:\n   ${meetingVenueTime}\n   ${meetingLocation}\n   ${meetingOpening}\n\n`;
    t += `2. Presents in the meeting:\n`;
    attendees.forEach((a) => {
      t += `   ${a}\n`;
    });
    t += `\n3. ${proceedingsTitle}\n${callToOrder}\n\n`;
    discussions.forEach((d) => {
      t += `${d.topicTitle}\n${d.topicContent}\n\n`;
    });
    t += `Prepared by:\n${preparedByName}\n${preparedByRole}\n\n`;
    t += `Attested by:\n${attestedByName}\n${attestedByRole}\n`;
    return t;
  }, [
    meetingDate,
    subject,
    meetingVenueTime,
    meetingLocation,
    meetingOpening,
    attendees,
    proceedingsTitle,
    callToOrder,
    discussions,
    preparedByName,
    preparedByRole,
    attestedByName,
    attestedByRole,
  ]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      toast.success('Minutes text copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error('Failed to copy text');
    }
  };


  // Photo management handlers
  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoadingPhotos(true);
    try {
      const newPhotos: DocxPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImg = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|jfif|heic)$/i.test(file.name);
        if (!isImg) continue;

        let result: { dataUrl: string; width: number; height: number };
        try {
          result = await compressImageFile(file, 2000, 2000, 0.92);
        } catch (compressionErr) {
          console.warn('Canvas compression failed, falling back to raw dataUrl:', compressionErr);
          const rawUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
          const img = new Image();
          img.src = rawUrl;
          await new Promise((res) => { img.onload = res; img.onerror = res; });
          result = {
            dataUrl: rawUrl,
            width: img.naturalWidth || 1200,
            height: img.naturalHeight || 900,
          };
        }

        if (result.dataUrl) {
          newPhotos.push({
            id: `min-photo-${Date.now()}-${i}`,
            dataUrl: result.dataUrl,
            caption: '',
            width: result.width,
            height: result.height,
          });
        }
      }

      if (newPhotos.length > 0) {
        const mergedPhotos = [...photos, ...newPhotos];
        setPhotos(mergedPhotos);
        setShowPhotosInReport(true);
        setActiveTab('preview');
        toast.success(`Added ${newPhotos.length} photo(s)! Showing in preview below.`);

        // Automatically update the record in storage and admin view
        const currentRecord: MinutesRecord = {
          id: `minutes-${Date.now()}`,
          savedAt: new Date().toISOString(),
          date: meetingDate,
          subject,
          meetingVenueTime,
          meetingLocation,
          meetingOpening,
          attendees,
          proceedingsTitle,
          callToOrder,
          discussions,
          preparedByName,
          preparedByRole,
          attestedByName,
          attestedByRole,
          photos: mergedPhotos,
        };
        saveStoredMinutes(currentRecord).then((updated) => {
          setSavedHistory(updated);
        }).catch(() => {});

        setTimeout(() => {
          const el = document.getElementById('photo-documentation-preview');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      } else {
        toast.error('No valid image files found');
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      toast.error('Failed to process photos: ' + (err.message || ''));
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
      const samplePhotos: DocxPhoto[] = slices.map((item, idx) => ({
        id: `sample-min-photo-${Date.now()}-${idx}`,
        dataUrl: item.dataUrl,
        caption: sampleCaptions[idx] || `Photo ${idx + 1}`,
        width: item.width,
        height: item.height,
      }));
      setPhotos(samplePhotos);
      setShowPhotosInReport(true);
      setActiveTab('preview');
      toast.success('Loaded 4 sample meeting photos (2x2 grid)!');

      // Automatically sync to saved history and admin monitor
      const sampleRecord: MinutesRecord = {
        id: `minutes-${Date.now()}`,
        savedAt: new Date().toISOString(),
        date: meetingDate,
        subject,
        meetingVenueTime,
        meetingLocation,
        meetingOpening,
        attendees,
        proceedingsTitle,
        callToOrder,
        discussions,
        preparedByName,
        preparedByRole,
        attestedByName,
        attestedByRole,
        photos: samplePhotos,
      };
      saveStoredMinutes(sampleRecord).then((updated) => {
        setSavedHistory(updated);
      }).catch(() => {});

      setTimeout(() => {
        const el = document.getElementById('photo-documentation-preview');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
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

  // Export Word (.docx)
  const handleDownloadWord = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/osca-minutes-template.docx');
      if (!response.ok) throw new Error('Could not fetch minutes template');
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      const payloadAttendees = attendees.map((a) => ({ name: a }));
      const payloadDiscussions = discussions.map((d) => ({
        topicTitle: d.topicTitle,
        topicContent: d.topicContent,
        listItems: [],
      }));

      doc.render({
        date: meetingDate,
        subject,
        meetingVenueTime,
        meetingLocation,
        meetingOpening,
        attendees: payloadAttendees,
        proceedingsTitle,
        callToOrder,
        discussions: payloadDiscussions,
        preparedByName,
        preparedByRole,
        attestedByName,
        attestedByRole,
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
      saveAs(out, `OSCA_Minutes_of_Meeting_${safeDate}.docx`);
      toast.success('Word document downloaded successfully!');
    } catch (err: any) {
      console.error('Error generating docx:', err);
      toast.error('Failed to generate Word document: ' + (err.message || ''));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    setActiveTab('preview');
    setShowPhotosInReport(true);
    toast.info('Opening print preview...');
    setTimeout(() => {
      window.print();
    }, 250);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Top Header Bar (Hidden during print) ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-2.5">
            <FileCheck2 className="h-7 w-7 text-primary" />
            Minutes of the Meeting
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create, edit, review, print, and export official OSCA Minutes of the Meeting.
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
            title="Save minutes to local history"
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
            Edit Minutes ({discussions.length} Discussions)
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {savedHistory.length > 0 && (
            <select
              aria-label="Load past minutes"
              className="text-xs bg-muted/60 border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => {
                const found = savedHistory.find((r) => r.id === e.target.value);
                if (found) handleLoadRecord(found);
                e.target.value = '';
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Load Past Minutes ({savedHistory.length})
              </option>
              {savedHistory.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.date} — {rec.subject.slice(0, 25)}...
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
        <div className="space-y-6 print:hidden">
          {/* Top Details */}
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Meeting Header & Opening Details
              </CardTitle>
              <CardDescription className="text-xs">
                Configure the date, subject, start time, venue, and opening ceremony.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Meeting Date</Label>
                <Input
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  placeholder="e.g. October 5, 2026"
                  className="rounded-xl h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="SUBJECT: Minutes of the Meeting"
                  className="rounded-xl h-9 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium">1. Start of Meeting (Time, Date, Center)</Label>
                <Input
                  value={meetingVenueTime}
                  onChange={(e) => setMeetingVenueTime(e.target.value)}
                  placeholder="10:00 AM, October 05, 2026 at Senior Citizens Center"
                  className="rounded-xl h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Barangay & City</Label>
                <Input
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  placeholder="Brgy. Singalat, Palayan City"
                  className="rounded-xl h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Opening Ceremony</Label>
                <Input
                  value={meetingOpening}
                  onChange={(e) => setMeetingOpening(e.target.value)}
                  placeholder="With prayer, Singing of National Anthem."
                  className="rounded-xl h-9 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Attendees Card */}
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  2. Presents in the Meeting (Attendees)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  List officers, advisers, guests, and barangay presidents present.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddAttendee}
                className="rounded-xl h-8 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Attendee
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {attendees.map((attendee, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-6 text-right">
                    {idx + 1}.
                  </span>
                  <Input
                    value={attendee}
                    onChange={(e) => handleUpdateAttendee(idx, e.target.value)}
                    className="rounded-xl h-9 text-sm font-medium flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAttendee(idx)}
                    className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-lg"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Proceedings & Call to Order */}
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                3. Meeting Proceedings Heading & Call to Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Proceedings Title</Label>
                <Input
                  value={proceedingsTitle}
                  onChange={(e) => setProceedingsTitle(e.target.value)}
                  className="rounded-xl h-9 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Call to Order Statement</Label>
                <Textarea
                  value={callToOrder}
                  onChange={(e) => setCallToOrder(e.target.value)}
                  rows={2}
                  className="rounded-xl text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Discussions List */}
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  Meeting Discussions & Agenda Topics ({discussions.length})
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Record detailed discussions, reports, statements, and resolutions.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddDiscussion}
                className="rounded-xl h-8 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Topic
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {discussions.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-primary w-6">
                      #{idx + 1}
                    </span>
                    <Input
                      value={item.topicTitle}
                      onChange={(e) =>
                        handleUpdateDiscussion(item.id, 'topicTitle', e.target.value)
                      }
                      placeholder="Topic Title (e.g. Attendance, Agenda No.1...)"
                      className="rounded-xl h-9 text-sm font-bold flex-1"
                    />

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => handleMoveDiscussion(idx, 'up')}
                        className="h-8 w-8 rounded-lg"
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={idx === discussions.length - 1}
                        onClick={() => handleMoveDiscussion(idx, 'down')}
                        className="h-8 w-8 rounded-lg"
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDiscussion(item.id)}
                        className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        title="Delete topic"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    value={item.topicContent}
                    onChange={(e) =>
                      handleUpdateDiscussion(item.id, 'topicContent', e.target.value)
                    }
                    placeholder="Enter discussion details, statements, or numbered lists..."
                    rows={4}
                    className="rounded-xl text-sm leading-relaxed"
                  />
                </div>
              ))}

              <Button
                variant="outline"
                onClick={handleAddDiscussion}
                className="w-full rounded-xl border-dashed h-11 text-xs gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Another Discussion Topic
              </Button>
            </CardContent>
          </Card>

          {/* Signatures */}
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Signatures & Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 p-3 rounded-xl border bg-muted/10">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Prepared by
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Name</Label>
                  <Input
                    value={preparedByName}
                    onChange={(e) => setPreparedByName(e.target.value)}
                    className="rounded-xl h-9 text-sm font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Designation / Role</Label>
                  <Input
                    value={preparedByRole}
                    onChange={(e) => setPreparedByRole(e.target.value)}
                    className="rounded-xl h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3 p-3 rounded-xl border bg-muted/10">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Attested / Noted by
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Name</Label>
                  <Input
                    value={attestedByName}
                    onChange={(e) => setAttestedByName(e.target.value)}
                    className="rounded-xl h-9 text-sm font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Designation / Role</Label>
                  <Input
                    value={attestedByRole}
                    onChange={(e) => setAttestedByRole(e.target.value)}
                    className="rounded-xl h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>


          {/* ── Photo Documentation Card ────────────────────────── */}
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
          id="printable-minutes-document"
          className="printable-minutes-document bg-white text-zinc-950 font-serif w-full max-w-[850px] min-h-[1100px] p-8 md:p-14 rounded-2xl shadow-xl border border-zinc-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none"
          style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
        >
          {/* Header with Seals & Central Text */}
          <div className="grid grid-cols-[104px_1fr_104px] items-center gap-4 pb-1">
            <div className="w-[104px] h-[104px] flex items-center justify-center">
              <img
                src="/palayan_seal.png"
                alt="Palayan City Seal"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="text-center px-2">
              <h2 className="font-bold text-base md:text-lg tracking-wide text-zinc-950 leading-tight">
                Energetic Association of Senior Citizens of Palayan City
              </h2>
              <p className="text-xs md:text-sm font-bold text-zinc-800 mt-1">
                Senior Citizens Center
              </p>
              <p className="text-xs md:text-sm font-semibold text-zinc-700">
                Barangay Singalat, Palayan City
              </p>
            </div>

            <div className="w-[104px] h-[104px] flex items-center justify-center">
              <img
                src="/osca_logo.jpg"
                alt="OSCA Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Brown / Gold Divider Line */}
          <div
            className="w-full h-[2.5px] mt-1 mb-4"
            style={{ backgroundColor: '#823b0b' }}
          />

          {/* Right Aligned Date */}
          <div className="text-right mt-6 mb-6 text-sm md:text-base font-bold text-zinc-950">
            {meetingDate}
          </div>

          {/* Subject */}
          <div className="font-bold text-base md:text-lg text-zinc-950 mb-6">
            {subject}
          </div>

          {/* 1. Start of Meeting */}
          <div className="mb-6 space-y-1">
            <div className="flex items-start gap-4">
              <span className="font-bold shrink-0">1. Start of the meeting:</span>
              <div className="font-bold">
                <p>{meetingVenueTime}</p>
                <p>{meetingLocation}</p>
                <p className="font-normal mt-0.5">{meetingOpening}</p>
              </div>
            </div>
          </div>

          {/* 2. Presents in the Meeting */}
          <div className="mb-8 space-y-1">
            <div className="flex items-start gap-4">
              <span className="font-bold shrink-0">2. Presents in the meeting:</span>
              <div className="font-bold space-y-0.5">
                {(attendees || [])
                  .filter((a) => a && typeof a === 'string' && a.trim() !== '' && a !== 'undefined')
                  .map((attendee, i) => (
                    <p key={i}>{attendee}</p>
                  ))}
              </div>
            </div>
          </div>

          {/* 3. Proceedings & Discussions */}
          <div className="space-y-5">
            <div>
              <p className="font-bold text-base md:text-lg">
                3. {proceedingsTitle}
              </p>
              <p className="text-sm md:text-base text-zinc-900 mt-1 leading-relaxed text-justify">
                {callToOrder}
              </p>
            </div>

            {(discussions || [])
              .filter((disc) => disc && (disc.topicTitle || disc.topicContent))
              .map((disc) => (
                <div key={disc.id} className="space-y-1.5 pt-2">
                  {disc.topicTitle && disc.topicTitle !== 'undefined' && (
                    <h3 className="font-bold text-sm md:text-base text-zinc-950 underline decoration-zinc-400 underline-offset-2">
                      {disc.topicTitle}
                    </h3>
                  )}
                  {disc.topicContent && disc.topicContent !== 'undefined' && (
                    <div className="text-sm md:text-base text-zinc-900 leading-relaxed text-justify whitespace-pre-line pl-1">
                      {disc.topicContent}
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Signatures */}
          <div className="mt-12 pt-8 grid grid-cols-2 gap-8 text-sm md:text-base">
            <div>
              <p className="text-zinc-700 mb-10">Prepared by:</p>
              <p className="font-bold text-zinc-950 uppercase">{preparedByName}</p>
              <p className="text-xs md:text-sm text-zinc-700">{preparedByRole}</p>
            </div>

            <div>
              <p className="text-zinc-700 mb-10">Attested / Noted by:</p>
              <p className="font-bold text-zinc-950 uppercase">{attestedByName}</p>
              <p className="text-xs md:text-sm text-zinc-700">{attestedByRole}</p>
            </div>
          </div>

          {/* ── Photo Documentation Attachment Section ───────────── */}
          <div id="photo-documentation-preview" className="photo-documentation-section">
            {photos.length === 0 ? (
              <div className="mt-12 p-6 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/90 text-center print:hidden hover:border-purple-400 transition-all shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center mb-2.5">
                  <Camera className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-sm text-zinc-900 font-sans">
                  Attachment: Photo Documentation (2x2 Grid)
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto font-sans">
                  Attach meeting photos to appear in this minutes report. They will be formatted as a 2x2 photo documentation grid in print and Word export.
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
            ) : !showPhotosInReport ? (
              <div className="mt-8 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs flex items-center justify-between gap-3 print:hidden font-sans">
                <span>{photos.length} photos are attached but currently hidden from the print report.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPhotosInReport(true)}
                  className="rounded-lg h-7 text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
                >
                  Show Photos in Report
                </Button>
              </div>
            ) : (
              <div className="mt-14 pt-8 border-t-2 border-zinc-300 print:mt-6 print:pt-4">
                {/* Header & Quick Action Toolbar (hidden during print) */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 print:hidden font-sans">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" />
                      {photos.length} Documentation Photo{photos.length === 1 ? '' : 's'} Attached (2x2 Grid)
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
                    Documentation of meeting attendees, proceedings, and discussions
                  </p>
                </div>

                {/* 2x2 Grid matching the user's template */}
                <div className="photo-grid-container grid grid-cols-2 gap-4 md:gap-6">
                  {photos.map((photo, pIdx) => (
                    <div key={photo.id} className="photo-item-card flex flex-col items-center">
                      <div
                        className="photo-img-wrapper w-full bg-zinc-50 rounded-lg overflow-hidden border border-zinc-200 shadow-sm flex items-center justify-center p-1"
                        style={{ height: '240px', width: '100%' }}
                      >
                        <img
                          src={photo.dataUrl}
                          alt={photo.caption || `Meeting documentation photo ${pIdx + 1}`}
                          className="max-w-full max-h-full object-contain rounded"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            display: 'block',
                            margin: 'auto',
                          }}
                        />
                      </div>
                      {photo.caption && (
                        <p className="photo-caption text-[11px] md:text-xs text-zinc-700 mt-2 text-center font-serif italic leading-tight px-1">
                          {photo.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Print Specific Stylesheet */}
      <style>{`
        @page {
          size: 8.5in 13in;
          margin: 0.75in 0.75in 0.75in 0.75in;
        }
        @media print {
          html, body, #root, #root > div, .h-screen, .min-h-screen, main, .overflow-hidden, .overflow-auto {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, header, aside, button, .print\\:hidden, [role="navigation"] {
            display: none !important;
          }
          .printable-minutes-document {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            display: block !important;
          }
          .photo-documentation-section {
            display: block !important;
            page-break-before: always !important;
            break-before: page !important;
          }
          .photo-grid-container {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 16px !important;
            width: 100% !important;
          }
          .photo-item-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }
          .photo-img-wrapper {
            width: 100% !important;
            height: 230px !important;
            min-height: 230px !important;
            max-height: 250px !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #f4f4f5 !important;
            border: 1px solid #d4d4d8 !important;
          }
          .photo-img-wrapper img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}

