import PizZip from 'pizzip';

export interface DocxPhoto {
  id: string;
  dataUrl: string;
  caption?: string;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Injects photos into an already rendered Docxtemplater PizZip instance in a 2x2 grid table.
 */
export function injectPhotosToDocx(
  zip: PizZip,
  photos: DocxPhoto[],
  options?: { sectionTitle?: string }
): void {
  if (!photos || photos.length === 0) return;

  const sectionTitle = options?.sectionTitle || 'ATTACHMENT: PHOTO DOCUMENTATION';

  // 1. Ensure content types exist for jpeg / png
  let contentTypes = zip.file('[Content_Types].xml')?.asText() || '';
  if (!contentTypes.includes('Extension="jpeg"')) {
    contentTypes = contentTypes.replace(
      '</Types>',
      '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>'
    );
  }
  if (!contentTypes.includes('Extension="jpg"')) {
    contentTypes = contentTypes.replace(
      '</Types>',
      '<Default Extension="jpg" ContentType="image/jpeg"/></Types>'
    );
  }
  if (!contentTypes.includes('Extension="png"')) {
    contentTypes = contentTypes.replace(
      '</Types>',
      '<Default Extension="png" ContentType="image/png"/></Types>'
    );
  }
  zip.file('[Content_Types].xml', contentTypes);

  // 2. Add each photo to word/media and word/_rels/document.xml.rels
  let rels = zip.file('word/_rels/document.xml.rels')?.asText() || '';
  const photoRels: Array<{ relId: string; photoId: number; caption?: string }> = [];

  photos.forEach((photo, idx) => {
    const photoNum = idx + 1;
    const isPng = photo.dataUrl.startsWith('data:image/png');
    const ext = isPng ? 'png' : 'jpeg';
    const relId = `rIdDocPhoto${photoNum}`;
    const filename = `doc_photo_${photoNum}.${ext}`;

    const parts = photo.dataUrl.split(',');
    const base64Data = parts.length > 1 ? parts[1] : parts[0];

    try {
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      zip.file(`word/media/${filename}`, bytes);

      const relTag = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${filename}"/>`;
      rels = rels.replace('</Relationships>', `${relTag}</Relationships>`);

      photoRels.push({
        relId,
        photoId: 6000 + photoNum,
        caption: photo.caption,
      });
    } catch (e) {
      console.warn('Failed to encode photo for docx export:', e);
    }
  });

  zip.file('word/_rels/document.xml.rels', rels);

  if (photoRels.length === 0) return;

  // 3. Build 2x2 grid table rows
  const rowsXml: string[] = [];
  for (let i = 0; i < photoRels.length; i += 2) {
    const left = photoRels[i];
    const right = photoRels[i + 1];

    const makeCell = (p?: { relId: string; photoId: number; caption?: string }) => {
      if (!p) {
        return '<w:tc><w:tcPr><w:tcW w:w="4800" w:type="dxa"/></w:tcPr><w:p/></w:tc>';
      }
      return `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4800" w:type="dxa"/>
            <w:tcMar>
              <w:top w:w="120"/>
              <w:bottom w:w="120"/>
              <w:left w:w="120"/>
              <w:right w:w="120"/>
            </w:tcMar>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r>
              <w:drawing>
                <wp:inline distT="0" distB="0" distL="0" distR="0">
                  <wp:extent cx="2900000" cy="2175000"/>
                  <wp:effectExtent l="0" t="0" r="0" b="0"/>
                  <wp:docPr id="${p.photoId}" name="Photo ${p.photoId}"/>
                  <wp:cNvGraphicFramePr>
                    <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                  </wp:cNvGraphicFramePr>
                  <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:nvPicPr>
                          <pic:cNvPr id="${p.photoId}" name="Photo ${p.photoId}"/>
                          <pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr>
                        </pic:nvPicPr>
                        <pic:blipFill>
                          <a:blip r:embed="${p.relId}" cstate="print"/>
                          <a:stretch><a:fillRect/></a:stretch>
                        </pic:blipFill>
                        <pic:spPr>
                          <a:xfrm>
                            <a:off x="0" y="0"/>
                            <a:ext cx="2900000" cy="2175000"/>
                          </a:xfrm>
                          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                        </pic:spPr>
                      </pic:pic>
                    </a:graphicData>
                  </a:graphic>
                </wp:inline>
              </w:drawing>
            </w:r>
          </w:p>
          ${
            p.caption
              ? `
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:spacing w:before="60" w:after="160"/>
              <w:rPr>
                <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
                <w:i/>
                <w:sz w:val="20"/>
              </w:rPr>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
                <w:i/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>${escapeXml(p.caption)}</w:t>
            </w:r>
          </w:p>`
              : ''
          }
        </w:tc>
      `;
    };

    rowsXml.push(`
      <w:tr>
        ${makeCell(left)}
        ${makeCell(right)}
      </w:tr>
    `);
  }

  const photosSectionXml = `
    <w:p>
      <w:pPr>
        <w:pageBreakBefore/>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="200"/>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="26"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>${escapeXml(sectionTitle)}</w:t>
      </w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="none"/>
          <w:bottom w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="4800"/>
        <w:gridCol w:w="4800"/>
      </w:tblGrid>
      ${rowsXml.join('\n')}
    </w:tbl>
  `;

  let docXml = zip.file('word/document.xml')?.asText() || '';
  if (docXml.includes('<w:sectPr>')) {
    docXml = docXml.replace('<w:sectPr>', `${photosSectionXml}<w:sectPr>`);
  } else {
    docXml = docXml.replace('</w:body>', `${photosSectionXml}</w:body>`);
  }
  zip.file('word/document.xml', docXml);
}

