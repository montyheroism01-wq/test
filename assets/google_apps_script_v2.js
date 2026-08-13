// ═══════════════════════════════════════════════════════
// NEET MCQ App — Google Apps Script v2 (Backend Server)
// ═══════════════════════════════════════════════════════
// Sheet tabs needed:
//   Sessions | Questions | Notes | Sync
//
// Deploy as Web App:
//   Execute as: Me
//   Who has access: Anyone
// ═══════════════════════════════════════════════════════

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

// ──── POST Handler ────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = data.type || 'unknown';
    const did  = data.did  || 'anon';
    const ts   = data.ts   || Date.now();
    const date = new Date(ts).toLocaleString('en-IN');

    if (type === 'summary') {
      // One row per test session
      const sh = getOrCreateSheet('Sessions', [
        'Date','DeviceID','Subject','SetIndex','SetName','Correct','Wrong','Skipped','Total','Accuracy%','NEETScore','TimeTaken(s)'
      ]);
      sh.appendRow([
        date, did,
        data.subject||'', data.setIndex||0, data.setName||'',
        data.correct||0, data.wrong||0, data.skipped||0, data.total||0,
        data.accuracy||0, data.neet||0, data.timeTaken||0
      ]);
    }
    else if (type === 'question') {
      // One row per question answered
      const sh = getOrCreateSheet('Questions', [
        'Date','DeviceID','Subject','SetIndex','SetName','QNum','Question','YourAnswer','CorrectAnswer','Status','TimeTaken(s)'
      ]);
      sh.appendRow([
        date, did,
        data.subject||'', data.setIndex||0, data.setName||'',
        data.qNum||0, data.qText||'', data.userAnswer||'', data.correctAnswer||'',
        data.status||'', data.duration||0
      ]);
    }
    else if (type === 'note') {
      // One row per note saved
      const sh = getOrCreateSheet('Notes', [
        'Date','DeviceID','Subject','Chapter','NoteText'
      ]);
      sh.appendRow([
        date, did,
        data.sub||'', data.chapter||'', data.text||''
      ]);
    }
    else if (type === 'updates' && data.updates) {
      // Legacy key-value updates
      const sh = getOrCreateSheet('Sync', ['Date','DeviceID','Key','Value']);
      data.updates.forEach(u => {
        sh.appendRow([date, did, u.key||'', u.value||'']);
      });
    }

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ──── GET Handler — App fetches all its data on startup ────
function doGet(e) {
  try {
    const action = e.parameter.action || '';
    const did    = e.parameter.did    || '';

    if (action === 'getData') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();

      // Fetch sessions for this device
      const sessions = [];
      const sessSheet = ss.getSheetByName('Sessions');
      if (sessSheet) {
        const rows = sessSheet.getDataRange().getValues();
        rows.slice(1).forEach(r => {
          if (String(r[1]) === did) {
            sessions.push({
              date:r[0], sub:r[2], setIndex:r[3], setName:r[4],
              correct:r[5], wrong:r[6], skipped:r[7], total:r[8],
              accuracy:r[9], neet:r[10], timeTaken:r[11]
            });
          }
        });
      }

      // Fetch notes for this device
      const notes = [];
      const noteSheet = ss.getSheetByName('Notes');
      if (noteSheet) {
        const rows = noteSheet.getDataRange().getValues();
        rows.slice(1).forEach((r,i) => {
          if (String(r[1]) === did) {
            notes.push({
              id: '_n_gs_' + i,
              date:r[0], sub:r[2], chap:r[3], text:r[4]
            });
          }
        });
      }

      // Fetch sync keys for this device
      const records = [];
      const syncSheet = ss.getSheetByName('Sync');
      if (syncSheet) {
        const rows = syncSheet.getDataRange().getValues();
        rows.slice(1).forEach(r => {
          if (String(r[1]) === did) {
            records.push({ key: r[2], value: r[3] });
          }
        });
      }

      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, sessions, notes, records })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, msg: 'NEET MCQ Backend v2 running' })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
