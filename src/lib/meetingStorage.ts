import type { SavedAgendaRecord } from '@/pages/user/MeetingAgenda';
import type { MinutesRecord } from '@/pages/user/MinutesOfMeeting';

const AGENDA_LOCAL_KEY = 'osca_saved_agendas_history_v1';
const MINUTES_LOCAL_KEY = 'osca_saved_minutes_history_v1';

// Seed default sample data so admin and users have immediate records matching the templates
export const INITIAL_SAMPLE_AGENDA: SavedAgendaRecord = {
  id: 'agenda-sample-1',
  savedAt: '2026-05-05T08:00:00.000Z',
  date: 'May 5, 2026',
  title: 'Monthly Meeting of Senior Citizen Association of Palayan City',
  sections: [
    { id: 'sec-1', title: 'Prayer', subItems: [] },
    { id: 'sec-2', title: 'Singing of National Anthem', subItems: [] },
    { id: 'sec-3', title: 'Palayan City Hymn', subItems: [] },
    {
      id: 'sec-4',
      title: 'Reporting',
      subItems: [
        { id: 'sub-4-1', title: "Secretary's report", note: '(Venaflor P. Diestro)' },
        { id: 'sub-4-2', title: "Treasurer's report", note: '(Rosennie S. Pronto)' },
      ],
    },
    {
      id: 'sec-5',
      title: 'Agenda',
      subItems: [
        { id: 'sub-5-1', title: 'National/LGU Pension', note: '' },
        { id: 'sub-5-2', title: 'Election of Federation Officers', note: '' },
      ],
    },
    { id: 'sec-6', title: 'Other Matters', subItems: [] },
  ],
};

export const INITIAL_SAMPLE_MINUTES: MinutesRecord = {
  id: 'minutes-sample-1',
  savedAt: '2026-10-05T10:00:00.000Z',
  date: 'October 5, 2026',
  subject: 'SUBJECT: Minutes of the Meeting',
  meetingVenueTime: '10:00 AM, October 05, 2026 at Senior Citizens Center',
  meetingLocation: 'Brgy. Singalat, Palayan City',
  meetingOpening: 'With prayer, Singing of National Anthem.',
  attendees: [
    'OSCA Chairman Nelia V. Trinidad',
    'FSCPC Pres. Danilo DC. Valdez',
    'PCSC Focal Person Rowena Ritual, RSW',
    'Mrs. Elsie DL. Datu, Federation Adviser',
    'And Nineteen Presidents of Barangays.',
  ],
  proceedingsTitle: 'The meeting of Federation of Senior Citizen of Palayan City',
  callToOrder:
    'The meeting was called to order by the PCSC Focal Person Ma. Rowena D. Ritual, RSW who welcomed the federation officer and Barangay Senior Citizen President present.',
  discussions: [
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
  ],
  preparedByName: 'VENAFLOR P. DIESTRO',
  preparedByRole: 'Secretary, Senior Citizens Association',
  attestedByName: 'NELIA V. TRINIDAD',
  attestedByRole: 'OSCA Chairman / Officer-in-Charge',
};

// Fetch Agendas (from API with localStorage fallback)
export async function getStoredAgendas(): Promise<SavedAgendaRecord[]> {
  try {
    const res = await fetch('/api/meetings?type=agenda');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem(AGENDA_LOCAL_KEY, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (err) {
    // API not reachable, proceed to local storage
  }

  const local = localStorage.getItem(AGENDA_LOCAL_KEY);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      // ignore
    }
  }

  // If completely empty, seed initial sample
  const seeded = [INITIAL_SAMPLE_AGENDA];
  localStorage.setItem(AGENDA_LOCAL_KEY, JSON.stringify(seeded));
  // Try pushing to API in background
  saveStoredAgenda(INITIAL_SAMPLE_AGENDA).catch(() => {});
  return seeded;
}

// Save Agenda
export async function saveStoredAgenda(record: SavedAgendaRecord): Promise<SavedAgendaRecord[]> {
  const local = localStorage.getItem(AGENDA_LOCAL_KEY);
  let list: SavedAgendaRecord[] = local ? JSON.parse(local) : [];
  const idx = list.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.unshift(record);
  }
  localStorage.setItem(AGENDA_LOCAL_KEY, JSON.stringify(list));

  try {
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'agenda', record }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        list = json.data;
        localStorage.setItem(AGENDA_LOCAL_KEY, JSON.stringify(list));
      }
    }
  } catch (err) {
    // ignore
  }

  return list;
}

// Delete Agenda
export async function deleteStoredAgenda(id: string): Promise<SavedAgendaRecord[]> {
  const local = localStorage.getItem(AGENDA_LOCAL_KEY);
  let list: SavedAgendaRecord[] = local ? JSON.parse(local) : [];
  list = list.filter((r) => r.id !== id);
  localStorage.setItem(AGENDA_LOCAL_KEY, JSON.stringify(list));

  try {
    const res = await fetch(`/api/meetings?type=agenda&id=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        list = json.data;
        localStorage.setItem(AGENDA_LOCAL_KEY, JSON.stringify(list));
      }
    }
  } catch (err) {
    // ignore
  }

  return list;
}

// Fetch Minutes
export async function getStoredMinutes(): Promise<MinutesRecord[]> {
  try {
    const res = await fetch('/api/meetings?type=minutes');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem(MINUTES_LOCAL_KEY, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (err) {
    // API not reachable, proceed to local storage
  }

  const local = localStorage.getItem(MINUTES_LOCAL_KEY);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      // ignore
    }
  }

  // If completely empty, seed initial sample
  const seeded = [INITIAL_SAMPLE_MINUTES];
  localStorage.setItem(MINUTES_LOCAL_KEY, JSON.stringify(seeded));
  saveStoredMinutes(INITIAL_SAMPLE_MINUTES).catch(() => {});
  return seeded;
}

// Save Minutes
export async function saveStoredMinutes(record: MinutesRecord): Promise<MinutesRecord[]> {
  const local = localStorage.getItem(MINUTES_LOCAL_KEY);
  let list: MinutesRecord[] = local ? JSON.parse(local) : [];
  const idx = list.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.unshift(record);
  }
  localStorage.setItem(MINUTES_LOCAL_KEY, JSON.stringify(list));

  try {
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'minutes', record }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        list = json.data;
        localStorage.setItem(MINUTES_LOCAL_KEY, JSON.stringify(list));
      }
    }
  } catch (err) {
    // ignore
  }

  return list;
}

// Delete Minutes
export async function deleteStoredMinutes(id: string): Promise<MinutesRecord[]> {
  const local = localStorage.getItem(MINUTES_LOCAL_KEY);
  let list: MinutesRecord[] = local ? JSON.parse(local) : [];
  list = list.filter((r) => r.id !== id);
  localStorage.setItem(MINUTES_LOCAL_KEY, JSON.stringify(list));

  try {
    const res = await fetch(`/api/meetings?type=minutes&id=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        list = json.data;
        localStorage.setItem(MINUTES_LOCAL_KEY, JSON.stringify(list));
      }
    }
  } catch (err) {
    // ignore
  }

  return list;
}

