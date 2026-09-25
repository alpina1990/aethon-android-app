export const HANDOVER_FOOTER = 'Care coordination summary. Not an official medical record.';

export type HandoverNote = { id: string; clientName: string; visitType: string | null; time: string; transcript: string };
export type HandoverEscalation = { clientName: string; reason: string; time: string };
export type HandoverData = {
  carerName: string;
  dateLabel: string;
  startLabel: string;
  endLabel: string;
  clients: { name: string; visitType: string | null; time: string }[];
  notes: HandoverNote[];
  escalations: HandoverEscalation[];
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

export function groupNotesByClient(notes: HandoverNote[]): { clientName: string; notes: HandoverNote[] }[] {
  const groups: { clientName: string; notes: HandoverNote[] }[] = [];
  for (const note of notes) {
    const group = groups.find(g => g.clientName === note.clientName);
    if (group) group.notes.push(note);
    else groups.push({ clientName: note.clientName, notes: [note] });
  }
  return groups;
}

export function buildHandoverText(data: HandoverData): string {
  const lines: string[] = [
    'Shift handover',
    `Carer: ${data.carerName}`,
    `Date: ${data.dateLabel}`,
    `Shift: ${data.startLabel} - ${data.endLabel}`,
    '',
    `Clients seen: ${data.clients.length} | Notes recorded: ${data.notes.length} | Escalations open: ${data.escalations.length}`,
    '',
    'CLIENTS SEEN',
    ...data.clients.map(c => `${c.name}${c.visitType ? ` - ${c.visitType}` : ''} - ${c.time}`),
    '',
    'NOTES',
  ];
  for (const group of groupNotesByClient(data.notes)) {
    lines.push(group.clientName);
    for (const note of group.notes) lines.push(`${note.time}  ${note.transcript}`);
    lines.push('');
  }
  if (data.escalations.length > 0) {
    lines.push('OPEN ESCALATIONS');
    for (const e of data.escalations) lines.push(`${e.clientName} - ${e.reason} - ${e.time}`);
    lines.push('');
  }
  lines.push(HANDOVER_FOOTER);
  return lines.join('\n');
}

export function buildHandoverHtml(data: HandoverData): string {
  const clientRows = data.clients
    .map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.visitType ?? '')}</td><td>${escapeHtml(c.time)}</td></tr>`)
    .join('');
  const noteBlocks = groupNotesByClient(data.notes)
    .map(
      g =>
        `<h3>${escapeHtml(g.clientName)}</h3>` +
        g.notes.map(n => `<div class="note"><strong>${escapeHtml(n.time)}</strong><br>${escapeHtml(n.transcript)}</div>`).join('')
    )
    .join('');
  const escalationBlocks = data.escalations
    .map(e => `<div class="escalation"><strong>${escapeHtml(e.clientName)}</strong> - ${escapeHtml(e.time)}<br>${escapeHtml(e.reason)}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body { font-family: Arial, sans-serif; padding: 32px; font-size: 14px; color: #1A1A1A; }
h1 { font-size: 26px; font-weight: bold; color: #085041; }
h2 { background: #1D9E75; color: #fff; padding: 8px 14px; border-radius: 6px; font-size: 16px; margin-top: 28px; }
h3 { font-size: 15px; margin: 16px 0 6px; }
table { width: 100%; border-collapse: collapse; }
th { background: #E1F5EE; color: #085041; padding: 8px; text-align: left; }
td { padding: 8px; border-bottom: 1px solid #EEE; }
.note { background: #F5F5F5; padding: 12px; border-radius: 6px; margin-bottom: 8px; }
.escalation { background: #FCEBEB; border-left: 4px solid #A32D2D; padding: 12px; margin-bottom: 8px; }
.footer { margin-top: 48px; font-size: 11px; color: #AAA; }
</style></head><body>
<h1>Shift handover</h1>
<p>${escapeHtml(data.carerName)}<br>${escapeHtml(data.dateLabel)}<br>Shift ${escapeHtml(data.startLabel)} - ${escapeHtml(data.endLabel)}</p>
<p><strong>${data.clients.length}</strong> clients seen &nbsp;|&nbsp; <strong>${data.notes.length}</strong> notes recorded &nbsp;|&nbsp; <strong>${data.escalations.length}</strong> escalations open</p>
<h2>Clients seen</h2>
<table><tr><th>Client</th><th>Visit type</th><th>Time</th></tr>${clientRows}</table>
<h2>Notes</h2>
${noteBlocks || '<p>No notes recorded</p>'}
${data.escalations.length > 0 ? `<h2>Open escalations</h2>${escalationBlocks}` : ''}
<p class="footer">${HANDOVER_FOOTER}</p>
</body></html>`;
}
