// src/lib/oscaSignatories.ts
// Shared helper for OSCA Signatories with tick-button toggles for Agenda and Minutes

export interface SignatoryItem {
  id: string;
  enabled: boolean; // Tick button: true = appear in signatory output, false = hidden
  label: string;    // e.g. "Prepared by:", "Attested / Noted by:", "Vice President:", "Treasurer:"
  name: string;     // Full Name (uppercase)
  role: string;     // Designation / Title
}

export const DEFAULT_SIGNATORIES: SignatoryItem[] = [
  {
    id: 'sig-secretary',
    enabled: true,
    label: 'Prepared by:',
    name: 'VENAFLOR P. DIESTRO',
    role: 'Secretary, Senior Citizens Association',
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
    label: 'Attested / Noted by:',
    name: 'NELIA V. TRINIDAD',
    role: 'OSCA Chairman / Officer-in-Charge',
  },
];

export const OSCA_SIGNATORIES_STORAGE_KEY = 'osca_meeting_signatories_v1';

export function getSavedSignatories(): SignatoryItem[] {
  try {
    const raw = localStorage.getItem(OSCA_SIGNATORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read saved signatories:', e);
  }
  return DEFAULT_SIGNATORIES;
}

export function saveSignatories(items: SignatoryItem[]): void {
  try {
    localStorage.setItem(OSCA_SIGNATORIES_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save signatories:', e);
  }
}

/**
 * Generates an OpenXML 2-column table for Word export (.docx)
 * containing only the signatories where enabled === true.
 */
export function generateDocxSignatoriesTableXml(signatories: SignatoryItem[]): string {
  const active = signatories.filter((s) => s.enabled && s.name && s.name.trim().length > 0);
  if (active.length === 0) return '';

  let rowsXml = '';
  // Pair active signatories into 2 columns per row
  for (let i = 0; i < active.length; i += 2) {
    const left = active[i];
    const right = active[i + 1];

    const leftCellXml = `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="5400" w:type="dxa"/>
          <w:vAlign w:val="top"/>
        </w:tcPr>
        <w:p>
          <w:pPr>
            <w:spacing w:before="120" w:after="280"/>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(left.label)}</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:pPr>
            <w:spacing w:before="0" w:after="40"/>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(left.name.toUpperCase())}</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:pPr>
            <w:spacing w:before="0" w:after="200"/>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(left.role)}</w:t>
          </w:r>
        </w:p>
      </w:tc>
    `;

    const rightCellXml = right
      ? `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="5400" w:type="dxa"/>
          <w:vAlign w:val="top"/>
        </w:tcPr>
        <w:p>
          <w:pPr>
            <w:spacing w:before="120" w:after="280"/>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(right.label)}</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:pPr>
            <w:spacing w:before="0" w:after="40"/>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:b/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(right.name.toUpperCase())}</w:t>
          </w:r>
        </w:p>
        <w:p>
          <w:pPr>
            <w:spacing w:before="0" w:after="200"/>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
              <w:sz w:val="24"/>
              <w:szCs w:val="24"/>
            </w:rPr>
            <w:t>${escapeXml(right.role)}</w:t>
          </w:r>
        </w:p>
      </w:tc>
    `
      : `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="5400" w:type="dxa"/>
        </w:tcPr>
        <w:p/>
      </w:tc>
    `;

    rowsXml += `
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        ${leftCellXml}
        ${rightCellXml}
      </w:tr>
    `;
  }

  return `
    <w:p>
      <w:pPr>
        <w:spacing w:before="360" w:after="120"/>
      </w:pPr>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="10800" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="0" w:type="dxa"/>
          <w:left w:w="100" w:type="dxa"/>
          <w:bottom w:w="0" w:type="dxa"/>
          <w:right w:w="100" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="5400"/>
        <w:gridCol w:w="5400"/>
      </w:tblGrid>
      ${rowsXml}
    </w:tbl>
  `;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Injects the signatories table into the docx zip.
 * If the docx contains the legacy preparedByName/attestedByName tags,
 * we can replace that section or append to the end before the last </w:body>.
 */
export function injectSignatoriesToDocx(zip: any, signatories: SignatoryItem[]): void {
  const tableXml = generateDocxSignatoriesTableXml(signatories);
  if (!tableXml) return;

  const docFile = zip.file('word/document.xml');
  if (!docFile) return;

  let xml = docFile.asText();

  // If the document has {preparedByName} or {attestedByName}, we can either replace the paragraphs
  // or if the template was already rendered, inject before </w:sectPr>
  const sectPrIdx = xml.lastIndexOf('<w:sectPr');
  if (sectPrIdx !== -1) {
    xml = xml.slice(0, sectPrIdx) + tableXml + xml.slice(sectPrIdx);
    zip.file('word/document.xml', xml);
  }
}

